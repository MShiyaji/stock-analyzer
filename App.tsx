
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Sparkles, TrendingUp, Cpu, Star, Trash2, ChevronRight } from 'lucide-react';
import { AgentStatus, AgentStep, AnalysisResult, WatchlistItem } from './types';
import { performMultiAgentAnalysis } from './services/geminiService';
import AgentStatusList from './components/AgentStatusList';
import Dashboard from './components/Dashboard';

const INITIAL_STEPS: AgentStep[] = [
  { id: 'search', name: 'Data Harvester', description: 'Retrieving news and price data', status: AgentStatus.IDLE },
  { id: 'reddit', name: 'Reddit Intel', description: 'Scanning r/wallstreetbets for retail sentiment', status: AgentStatus.IDLE },
  { id: 'sentiment', name: 'Sentiment Analyst', description: 'Aggregating market and social tone', status: AgentStatus.IDLE },
  { id: 'technicals', name: 'Quant Agent', description: 'Simulating technical indicators', status: AgentStatus.IDLE },
  { id: 'memo', name: 'Synthesis Engine', description: 'Drafting final investment memo', status: AgentStatus.IDLE },
];

const POPULAR_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'V', 'JNJ', 
  'WMT', 'JPM', 'MA', 'PG', 'UNH', 'HD', 'BAC', 'DIS', 'GME', 'AMC', 
  'PLTR', 'AMD', 'NFLX', 'PYPL', 'ADBE', 'CRM', 'INTC', 'CMCSA', 'PFE', 'PEP',
  'COST', 'AVGO', 'T', 'XOM', 'CVX', 'ABBV', 'NKE', 'KO', 'MRK', 'ORCL'
];

function App() {
  const [ticker, setTicker] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>(INITIAL_STEPS);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    const saved = localStorage.getItem('finagent_watchlist');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('finagent_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const updateStepStatus = (id: string, status: AgentStatus) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleAnalysis = async (e?: React.FormEvent, manualTicker?: string) => {
    if (e) e.preventDefault();
    const targetTicker = (manualTicker || ticker).trim().toUpperCase();
    if (!targetTicker) return;

    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: AgentStatus.IDLE })));

    try {
      updateStepStatus('search', AgentStatus.RUNNING);
      
      const analysis = await performMultiAgentAnalysis(targetTicker, (progressMsg) => {
        if (progressMsg.includes('Scraping r/wallstreetbets')) {
          updateStepStatus('search', AgentStatus.COMPLETED);
          updateStepStatus('reddit', AgentStatus.RUNNING);
        } else if (progressMsg.includes('Analyzing market & social')) {
          updateStepStatus('reddit', AgentStatus.COMPLETED);
          updateStepStatus('sentiment', AgentStatus.RUNNING);
        } else if (progressMsg.includes('Calculating technical')) {
          updateStepStatus('sentiment', AgentStatus.COMPLETED);
          updateStepStatus('technicals', AgentStatus.RUNNING);
        } else if (progressMsg.includes('Synthesizing professional')) {
          updateStepStatus('technicals', AgentStatus.COMPLETED);
          updateStepStatus('memo', AgentStatus.RUNNING);
        }
      });

      updateStepStatus('memo', AgentStatus.COMPLETED);
      setResult(analysis);
      
      setWatchlist(prev => prev.map(item => 
        item.ticker === analysis.ticker 
          ? { ...item, lastPrice: analysis.currentPrice, lastSentiment: analysis.sentiment.label } 
          : item
      ));

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during analysis.');
      setSteps(prev => prev.map(s => s.status === AgentStatus.RUNNING ? { ...s, status: AgentStatus.ERROR } : s));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleWatchlist = (t: string) => {
    const target = t.toUpperCase();
    setWatchlist(prev => {
      const exists = prev.find(i => i.ticker === target);
      if (exists) {
        return prev.filter(i => i.ticker !== target);
      }
      return [{ 
        ticker: target, 
        addedAt: Date.now(),
        lastPrice: result?.ticker === target ? result.currentPrice : undefined,
        lastSentiment: result?.ticker === target ? result.sentiment.label : undefined
      }, ...prev];
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              FinAgent <span className="text-blue-500 font-light">Pro</span>
            </h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#" className="text-white">Terminal</a>
            <a href="#watchlist" className="hover:text-white transition-colors">Watchlist ({watchlist.length})</a>
            <a href="#" className="hover:text-white transition-colors">Portfolio</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        <section className="space-y-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-white mb-2">Multi-Agent Intelligence</h2>
            <p className="text-zinc-400 text-lg">
              Analyze stocks using institutional data, technical signals, and <span className="text-orange-400 font-semibold italic">Reddit r/wallstreetbets</span> sentiment.
            </p>
          </div>

          <form onSubmit={handleAnalysis} className="flex gap-4 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                list="ticker-suggestions"
                placeholder="Enter ticker (e.g. NVDA, TSLA, GME)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono uppercase"
                disabled={isAnalyzing}
              />
              <datalist id="ticker-suggestions">
                {POPULAR_TICKERS.map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <button
              type="submit"
              disabled={isAnalyzing || !ticker.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Orchestrating Agents...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Market
                </>
              )}
            </button>
          </form>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <aside className="xl:col-span-1 space-y-6">
            <div id="watchlist" className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Watchlist</h3>
                <Star className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-zinc-800">
                {watchlist.length > 0 ? watchlist.map((item) => (
                  <div key={item.ticker} className="group flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
                    <button 
                      onClick={() => handleAnalysis(undefined, item.ticker)}
                      disabled={isAnalyzing}
                      className="flex-1 text-left flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {item.ticker[0]}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-200 flex items-center gap-2">
                          {item.ticker}
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {item.lastPrice && (
                          <div className="text-[10px] text-zinc-500 flex gap-2">
                            <span>{item.lastPrice}</span>
                            <span className="text-zinc-600">•</span>
                            <span>{item.lastSentiment}</span>
                          </div>
                        )}
                      </div>
                    </button>
                    <button 
                      onClick={() => toggleWatchlist(item.ticker)}
                      className="p-2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )) : (
                  <div className="p-8 text-center text-zinc-600 text-xs italic">
                    Your watchlist is empty.
                  </div>
                )}
              </div>
            </div>

            <AgentStatusList steps={steps} />
            
            <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Cpu className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Engine Status</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Powered by <span className="text-zinc-200">Gemini 3 Pro</span>. 
                Utilizing decentralized retrieval for news and <span className="text-orange-400">Social Intel</span>.
              </p>
            </div>
          </aside>

          <div className="xl:col-span-3">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl text-red-400">
                <p className="font-bold mb-1">Analysis Failed</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!result && !isAnalyzing && !error && (
              <div className="h-96 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-600">
                <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
                <p>Enter a ticker (e.g. GME, TSLA) to trigger the multi-agent hive mind.</p>
              </div>
            )}

            {isAnalyzing && !result && (
              <div className="h-96 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-blue-600/20 rounded-full animate-ping absolute inset-0"></div>
                  <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-white">Aggregating Social Signals</p>
                  <p className="text-sm text-zinc-500 italic">"Checking r/wallstreetbets sentiment..."</p>
                </div>
              </div>
            )}

            {result && (
              <Dashboard 
                result={result} 
                isWatched={watchlist.some(i => i.ticker === result.ticker)}
                onToggleWatchlist={toggleWatchlist}
              />
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-8 px-6 text-center text-zinc-600 text-xs">
        <p>© 2024 FinAgent Pro Intelligence System. Social data sourced from r/wallstreetbets discussions via Gemini Grounding.</p>
      </footer>
    </div>
  );
}

export default App;
