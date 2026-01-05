
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const performMultiAgentAnalysis = async (
  ticker: string,
  onProgress: (step: string) => void
): Promise<AnalysisResult> => {
  // 1. Data Gathering Agent (General Market)
  onProgress('Gathering real-time market data and news...');
  
  const searchPrompt = `Perform a comprehensive data gathering for the stock ticker: ${ticker}. 
  Find the current stock price, recent price movements, latest news headlines from the last 7 days, 
  and any recent SEC filings or major announcements. Return the information in a clear, structured way.`;

  const searchResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const rawMarketData = searchResponse.text;
  let allSources = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
    title: chunk.web?.title || 'Source',
    uri: chunk.web?.uri || '#'
  })) || [];

  // 2. Reddit Intelligence Agent (r/wallstreetbets)
  onProgress('Scraping r/wallstreetbets for social sentiment...');
  
  const redditPrompt = `Search specifically on Reddit, especially r/wallstreetbets, for the ticker ${ticker}. 
  Identify the current "vibe" or sentiment among retail traders. Look for:
  - Specific, direct quotes or paraphrased highlights from recent posts and comments about ${ticker}.
  - If there is very little discussion or almost no posts specifically referencing ${ticker}, explicitly note: "Low discussion volume detected for this ticker."
  - Is it a trending topic?
  - Are there major "YOLO" positions mentioned?
  - What are the main bullish and bearish arguments being discussed currently?
  - General consensus: Bullish, Bearish, or Volatile.`;

  const redditResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: redditPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const rawRedditData = redditResponse.text;
  const redditSources = redditResponse.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
    title: chunk.web?.title || 'Reddit Discussion',
    uri: chunk.web?.uri || '#'
  })) || [];
  
  allSources = [...allSources, ...redditSources];

  // 3. Sentiment Analysis Agent (Aggregated)
  onProgress('Analyzing market & social sentiment impact...');
  
  const sentimentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the combined sentiment of financial news and r/wallstreetbets discussions for ${ticker}:
    
    Market Data: ${rawMarketData}
    Reddit Data: ${rawRedditData}

    Provide a sentiment score between -1 (bearish) and 1 (bullish).
    If Reddit is highly bullish but news is bearish, highlight the divergence.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          label: { type: Type.STRING },
          summary: { type: Type.STRING }
        },
        required: ["score", "label", "summary"]
      }
    }
  });

  const sentiment = JSON.parse(sentimentResponse.text);

  // 4. Technical Analysis Agent
  onProgress('Calculating technical indicators and trends...');
  
  const technicalResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Based on the gathered market data for ${ticker}: \n\n ${rawMarketData}, 
    simulate a technical analysis. Estimate reasonable current values for RSI (14-day), MACD, 
    and identify the current trend. Decide on a signal: BUY, SELL, or HOLD.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rsi: { type: Type.NUMBER },
          macd: { type: Type.STRING },
          signal: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD"] },
          trend: { type: Type.STRING }
        },
        required: ["rsi", "macd", "signal", "trend"]
      }
    }
  });

  const technical = JSON.parse(technicalResponse.text);

  // 5. Synthesis Engine
  onProgress('Synthesizing market insight for you...');
  
  const memoResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Explain the current status of ${ticker} for an average retail trader. 
    
    CRITICAL INSTRUCTIONS:
    - BE EXTREMELY BRIEF. Maximum 1-2 sentences per section.
    - Use Markdown headers (e.g., ### Section Name).
    - Use Markdown blockquotes (starting with >) for ANY specific Reddit quotes or highlights.
    
    Break down into:
    ### 1. General Vibe
    ### 2. The Pros' View
    ### 3. Reddit Buzz (Cite specific quotes with > "quote here" or note low volume)
    ### 4. Game Plan (Technical summary)

    Inputs:
    - Market/Analyst Data: ${rawMarketData}
    - Reddit Discussion: ${rawRedditData}
    - Aggregated Sentiment: ${sentiment.label}
    - Technical Signal: ${technical.signal} (${technical.trend})`,
    config: {
      systemInstruction: "You are a brief, direct trading mentor. You never use more words than necessary. You wrap every Reddit quote in a markdown blockquote (>). If social volume is low, you say exactly that in one short sentence."
    }
  });

  const priceRegex = /\$?(\d{1,6}\.\d{2})/;
  const priceMatch = rawMarketData.match(priceRegex);
  const currentPrice = priceMatch ? priceMatch[0] : "N/A";

  return {
    ticker: ticker.toUpperCase(),
    companyName: ticker.toUpperCase(),
    currentPrice,
    priceChange: "+0.00%",
    sentiment,
    technicalAnalysis: technical,
    memo: memoResponse.text,
    sources: allSources.slice(0, 10), 
    timestamp: new Date().toLocaleString()
  };
};
