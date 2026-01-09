
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { AnalysisResult, AnalysisStage } from "../../types";
import { RateLimiter } from "./rateLimiter";

type WebSource = { title: string; url: string; snippet?: string; published_date?: string };

const rawModelKey = import.meta.env.VITE_API_KEY as string | undefined;
const googleApiKey = typeof rawModelKey === "string" ? rawModelKey.trim() : undefined;

const rawTavilyKey = import.meta.env.VITE_TAVILY_API_KEY as string | undefined;
const tavilyKey = typeof rawTavilyKey === "string" ? rawTavilyKey.trim() : undefined;

const hasSearchKey = Boolean(tavilyKey);

const MODEL_POOL = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
];
let modelCursor = 0;

const nextModel = () => MODEL_POOL[(modelCursor++) % MODEL_POOL.length];

const makeModel = (modelName: string) =>
  new ChatGoogleGenerativeAI({
    apiKey: googleApiKey as string,
    model: modelName,
    temperature: 0.4,
  });

const limiter = new RateLimiter(15); // Rate limit: 15 Requests Per Minute

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
const cache = new Map<string, { data: AnalysisResult; ts: number }>();

const searchWithTavily = async (query: string, options?: { domains?: string[], days?: number }): Promise<WebSource[]> => {
  if (!tavilyKey) return [];
  try {
    const body: any = {
      api_key: tavilyKey,
      query,
      search_depth: "advanced",
      max_results: 6,
      include_images: false,
      include_answer: false,
    };

    if (options?.domains) body.include_domains = options.domains;
    if (options?.days) body.days = options.days;

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []).map((r: any) => ({
      title: String(r.title || "Source").trim(),
      url: String(r.url || "#").trim(),
      snippet: String(r.content || r.snippet || "").trim(),
      published_date: r.published_date ? String(r.published_date).trim() : undefined,
    }));
  } catch (e) {
    console.warn("Tavily search error", e);
    return [];
  }
};

const webSearch = async (query: string, options?: { domains?: string[], days?: number }): Promise<WebSource[]> => {
  if (!hasSearchKey) return [];
  return await searchWithTavily(query, options);
};

const formatSourcesForPrompt = (hits: WebSource[]) =>
  hits.map((hit, idx) => `(${idx + 1}) ${hit.title}\nDate: ${hit.published_date || "Unknown"}\n${hit.url}\n${hit.snippet || ""}`).join("\n\n");

const stripJson = (value: string) => value.trim().replace(/^```json/i, "").replace(/```$/i, "");
const safeJson = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(stripJson(value)) as T;
  } catch (err) {
    console.warn("JSON parse failed", err);
    return fallback;
  }
};

const executeChain = async (name: string, template: string, input: any, runLog: (msg: string, extra?: any) => void) => {
  let lastError;
  for (let i = 0; i < MODEL_POOL.length; i++) {
    const modelName = nextModel();
    try {
      runLog("queue-task", { step: name, model: modelName });
      // Use RateLimiter to schedule the call
      return await limiter.add(async () => {
        runLog("start-exec", { step: name, model: modelName });
        const chain = RunnableSequence.from([
          ChatPromptTemplate.fromTemplate(template),
          makeModel(modelName),
          new StringOutputParser(),
        ]);
        const res = await chain.invoke(input);
        runLog("finish-exec", { step: name });
        return res;
      });
    } catch (err: any) {
      runLog("task-retry", { step: name, error: err.message });
      lastError = err;
      if (typeof err?.message === 'string' && (err.message.includes("429") || err.message.includes("quota"))) {
        // simple backoff for quota issues
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  throw lastError || new Error(`All models failed for ${name}`);
};

export const performMultiAgentAnalysis = async (
  ticker: string,
  companyName: string | undefined,
  onProgress: (stage: AnalysisStage) => void
): Promise<AnalysisResult> => {
  if (!googleApiKey) throw new Error("Missing VITE_API_KEY");
  if (!hasSearchKey) throw new Error("Missing Search Key");

  const upperTicker = ticker.toUpperCase();
  const searchName = companyName || upperTicker;
  const runId = `${upperTicker}-${Date.now()}`;
  const runLog = (msg: string, extra?: any) => console.info(`[MsgAgent][${runId}] ${msg}`, extra || "");

  // Check Cache
  const existing = cache.get(upperTicker);
  if (existing && Date.now() - existing.ts < CACHE_TTL_MS) {
    runLog("cache-hit");
    return existing.data;
  }

  try {
    // 1. Gather Data
    onProgress(AnalysisStage.SEARCH);
    const marketHits = await webSearch(`${upperTicker} ${searchName} stock price earnings news analysis`, { days: 7 });
    const marketContext = formatSourcesForPrompt(marketHits);

    onProgress(AnalysisStage.REDDIT);
    // Tiered Search: Try last 30 days first, then fallback to 90
    let redditHits = await webSearch(`${upperTicker} ${searchName} stock sentiment discussion`, {
      domains: ['reddit.com', 'stocktwits.com', 'news.ycombinator.com'],
      days: 30
    });

    if (redditHits.length === 0) {
      runLog("reddit-search-fallback", { message: "No recent posts found (30d), trying 90d" });
      redditHits = await webSearch(`${upperTicker} ${searchName} stock sentiment discussion`, {
        domains: ['reddit.com', 'stocktwits.com', 'news.ycombinator.com'],
        days: 90
      });
    }

    const redditContext = formatSourcesForPrompt(redditHits);

    // 2. Agents: Parallel Analysis (JSON)
    onProgress(AnalysisStage.REDDIT);

    // Reddit Agent - Strict JSON
    const redditAgentPromise = executeChain(
      "reddit-analysis",
      `You are the "Social Sentiment Expert". You analyze Reddit, StockTwits, and Hacker News.
        
        SOCIAL INTEL:
        {redditContext}
        
        Your Goal: Analyze the sentiment for: {upperTicker} (${searchName}).
        
        CRITICAL FILTERING RULES:
        1. **Strict Relevance**: IGNORE any post that does not explicitly mention "{upperTicker}" or "${searchName}". If you are unsure if a post is about this specific stock, DISCARD IT. Err on the side of irrelevance.
        2. **User Content Only**: Prioritize genuine user discussions. Do NOT use news headlines.
        3. **Recency**: Prioritize posts from the last month.
        
        Return strictly valid JSON (no markdown formatting):
        {{
            "sentiment_score": number (-1 to 1),
            "label": "Bullish" | "Bearish" | "Neutral",
            "summary": "Strictly one short sentence summary of the social vibe (max 10 words)",
            "quotes": [
                {{ "text": "quote 1 text", "url": "url_from_intel_or_blank" }},
                {{ "text": "quote 2 text", "url": "url_from_intel_or_blank" }}
            ] (2-3 distinct, short, relevant quotes from ACTUAL USER DISCUSSIONS. Do NOT use news headlines or articles. Only use genuine Reddit comments/posts or StockTwits user messages. IF NO RELEVANT USER POSTS FOUND: Return an empty array []),
            "social_volume_weekly": [number, number, number, number, number, number, number, number] (Estimate relative discussion intensity for last 8 weeks, 0-100. Week 8 is current week.)
        }}`,
      { redditContext, upperTicker, searchName },
      runLog
    );

    onProgress(AnalysisStage.TECHNICALS);
    // Technical Agent - Strict JSON
    const technicalAgentPromise = executeChain(
      "technical-analysis",
      `You are the "Technical Analyst Agent". You are a seasoned Wall Street quant.
        
        MARKET INTEL:
        {marketContext}
        
        Your Goal: Analyze the price action and data for: {upperTicker} (${searchName}).

        CRITICAL FILTERING RULES:
        1. **Strict Relevance**: Ensure all data points (price, news) specifically refer to "{upperTicker}" or "${searchName}". If data is ambiguous (e.g. general market news), ignore it.
        2. **Source Quality**: For basic ticker data (price, trends), prioritize data from official exchanges (NYSE, NASDAQ) or major financial news outlets present in the INTEL.
        
        Return strictly valid JSON (no markdown formatting):
        {{
            "rsi": number (0-100 estimate),
            "macd": "string summary",
            "signal": "BUY" | "SELL" | "HOLD",
            "trend": "string",
            "reasoning": "One paragraph summary of your technical stance",
            "current_price": "string (e.g. $154.23)" (Extract the most recent price from the INTEL)
        }}`,
      { marketContext, upperTicker, searchName },
      runLog
    );

    const [redditRaw, technicalRaw] = await Promise.all([redditAgentPromise, technicalAgentPromise]);

    const redditResult = safeJson(redditRaw, {
      sentiment_score: 0,
      label: "Neutral",
      summary: "Failed to parse Social agent",
      quotes: [] as { text: string; url: string }[],
      social_volume_weekly: [0, 0, 0, 0, 0, 0, 0, 0]
    });

    const technicalResult = safeJson(technicalRaw, {
      rsi: 50,
      macd: "Neutral",
      signal: "HOLD" as const,
      trend: "Ranges",
      reasoning: "Failed to parse Technical agent",
      current_price: "Unknown"
    });

    // 3. Narrator Synthesis (Memo)
    onProgress(AnalysisStage.MEMO);

    // Prepare quotes string (handle empty)
    const redditQuotes = (redditResult.quotes && redditResult.quotes.length > 0)
      ? redditResult.quotes.map(q => `> "${q.text}" - [Reference](${q.url})`).join("\n")
      : "NO_QUOTES_FOUND";

    const memoPromise = executeChain(
      "narrator-synthesis",
      `You are the Lead Investment Strategist.
        
        REPORT 1: SOCIAL SENTIMENT
        Score: {redditScore} ({redditLabel})
        Summary: {redditSummary}
        
        REPORT 2: TECHNICAL ANALYSIS
        Signal: {technicalSignal}
        Reasoning: {technicalReasoning}
        
        Your Goal: Write a cohesive, professional "Investment Memo".
        
        Guidelines:
        - **Target Audience**: An average person who understands business basics but is NOT a stock expert.
        - **Tone**: Professional but accessible. Avoid complex financial jargon. Explain things simply.
        - **Brevity**: Be extremely concise. Get straight to the point.
        - Do NOT explicitly mention "Reddit Agent" or "Technical Agent". Instead use terms like "social sentiment", "discussions", "market data", or "technical signals".
        - Start directly with your recommendation.
        - Highlight conflicts between social sentiment and technicals naturally in the rationale.
        
        Format as Markdown:
        ### 1. The Verdict
        ::: [BUY/SELL/HOLD] :::
        (Your final synthesized conclusion. STRICTLY wrap the main decision word(s) in ":::" colons as shown.)
        ### 2. The Rationale
        (Explain why in 2-3 short, clear sentences. Synthesize the vibe and data. If they conflict, simply say why.)
        ### 3. Key Factors
        (If verdict is BUY: Title this "Key Opportunities" and list positive outlooks. If SELL/HOLD: Title this "Key Risks" and list downsides. List 2-3 bullet points.)
        ### 4. What are people yapping about?
        (Display the 2-3 provided social quotes directly here. ONLY use the provided quotes. Format them using markdown blockquotes starting with >. Do not add commentary inside the blockquote. IF THE INPUT QUOTES SAY "NO_QUOTES_FOUND": State "No substantial community discussion found for this stock in the last 90 days.")
        
        Quotes to use:
        {redditQuotes}
        `,
      {
        redditScore: redditResult.sentiment_score,
        redditLabel: redditResult.label,
        redditSummary: redditResult.summary,
        technicalSignal: technicalResult.signal,
        technicalReasoning: technicalResult.reasoning,
        redditQuotes
      },
      runLog
    );

    const memo = await memoPromise;

    // Collect Sources
    const allSources = [...marketHits, ...redditHits]
      .slice(0, 10)
      .map(s => ({ title: s.title, uri: s.url }));

    const result: AnalysisResult = {
      ticker: upperTicker,
      companyName: upperTicker,
      currentPrice: technicalResult.current_price || "Unknown",
      priceChange: "-",
      sentiment: {
        score: redditResult.sentiment_score,
        label: redditResult.label,
        summary: redditResult.summary,
        socialVolume: redditResult.social_volume_weekly
      },
      technicalAnalysis: {
        rsi: technicalResult.rsi,
        macd: technicalResult.macd,
        signal: technicalResult.signal,
        trend: technicalResult.trend
      },
      memo,
      sources: allSources,
      timestamp: new Date().toLocaleString()
    };

    cache.set(upperTicker, { data: result, ts: Date.now() });
    return result;

  } catch (err: any) {
    runLog("error", err);
    throw err;
  }
};
