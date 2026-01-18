
import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Sparkles, TrendingUp, Star, Trash2, ChevronRight, XCircle } from 'lucide-react';
import { AgentStatus, AgentStep, AnalysisResult, WatchlistItem, AnalysisStage } from '../types';
import { performMultiAgentAnalysis } from './services/geminiService';
import AgentStatusList from '../components/AgentStatusList';
import Dashboard from '../components/Dashboard';

type TickerDirectoryEntry = {
  ticker: string;
  name: string;
};

const log = (...args: any[]) => console.log('[FinAgent]', ...args);

const INITIAL_STEPS: AgentStep[] = [
  { id: 'search', name: 'Data Harvester', description: 'Retrieving market news and price data', status: AgentStatus.IDLE },
  { id: 'reddit', name: 'Reddit Intel', description: 'Scanning r/wallstreetbets, r/stocks & more', status: AgentStatus.IDLE },
  { id: 'technicals', name: 'Quant Agent', description: 'Analyzing technical indicators', status: AgentStatus.IDLE },
  { id: 'memo', name: 'Synthesis Engine', description: 'Drafting final investment memo', status: AgentStatus.IDLE },
];

const FALLBACK_TICKERS: TickerDirectoryEntry[] = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corporation' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'META', name: 'Meta Platforms Inc.' },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway' },
  { ticker: 'V', name: 'Visa Inc.' },
  { ticker: 'JNJ', name: 'Johnson & Johnson' },
  { ticker: 'WMT', name: 'Walmart Inc.' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.' },
  { ticker: 'MA', name: 'Mastercard Inc.' },
  { ticker: 'PG', name: 'Procter & Gamble' },
  { ticker: 'UNH', name: 'UnitedHealth Group' },
  { ticker: 'HD', name: 'Home Depot Inc.' },
  { ticker: 'BAC', name: 'Bank of America' },
  { ticker: 'DIS', name: 'Walt Disney Co.' },
  { ticker: 'GME', name: 'GameStop Corp.' },
  { ticker: 'AMC', name: 'AMC Entertainment' },
  { ticker: 'PLTR', name: 'Palantir Technologies' },
  { ticker: 'AMD', name: 'Advanced Micro Devices' },
  { ticker: 'NFLX', name: 'Netflix Inc.' },
  { ticker: 'PYPL', name: 'PayPal Holdings' },
  { ticker: 'ADBE', name: 'Adobe Inc.' },
  { ticker: 'CRM', name: 'Salesforce Inc.' },
  { ticker: 'INTC', name: 'Intel Corporation' },
  { ticker: 'CMCSA', name: 'Comcast Corporation' },
  { ticker: 'PFE', name: 'Pfizer Inc.' },
  { ticker: 'PEP', name: 'PepsiCo Inc.' },
  { ticker: 'COST', name: 'Costco Wholesale' },
  { ticker: 'AVGO', name: 'Broadcom Inc.' },
  { ticker: 'T', name: 'AT&T Inc.' },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.' },
  { ticker: 'CVX', name: 'Chevron Corporation' },
  { ticker: 'ABBV', name: 'AbbVie Inc.' },
  { ticker: 'NKE', name: 'NIKE Inc.' },
  { ticker: 'KO', name: 'Coca-Cola Company' },
  { ticker: 'MRK', name: 'Merck & Co. Inc.' },
  { ticker: 'ORCL', name: 'Oracle Corporation' }
];

function App() {
  const [ticker, setTicker] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>(INITIAL_STEPS);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [availableTickers, setAvailableTickers] = useState<TickerDirectoryEntry[]>(FALLBACK_TICKERS);
  const [isTickerListLoading, setIsTickerListLoading] = useState(true);

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const saved = localStorage.getItem('finagent_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    log('App mounted');
  }, []);

  useEffect(() => {
    localStorage.setItem('finagent_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Click outside listener for suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadTickers = async () => {
      try {
        setIsTickerListLoading(true);
        const response = await fetch('/tickers.json', { signal: controller.signal });
        if (!response.ok) throw new Error('Failed to fetch ticker directory.');

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Ticker directory is malformed.');

        const normalized: TickerDirectoryEntry[] = data
          .map((entry: any) => ({
            ticker: String(entry.ticker || entry.symbol || '').toUpperCase().trim(),
            name: String(entry.name || entry.company || entry.ticker || '').trim(),
          }))
          .filter((entry: TickerDirectoryEntry) => entry.ticker.length > 0);
        setAvailableTickers(normalized);
        log('Loaded ticker directory', { count: normalized.length });
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('Ticker list load failed; using fallback.', err);
        setAvailableTickers(FALLBACK_TICKERS);
        log('Ticker directory fallback in use', { fallbackCount: FALLBACK_TICKERS.length });
      } finally {
        setIsTickerListLoading(false);
      }
    };

    loadTickers();
    return () => controller.abort();
  }, []);

  const updateStepStatus = (id: string, status: AgentStatus) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleAnalysis = async (e?: React.FormEvent, manualTicker?: string) => {
    if (e) e.preventDefault();
    const targetTicker = (manualTicker || ticker).trim().toUpperCase();
    if (!targetTicker) return;

    log('Starting analysis', { ticker: targetTicker });

    // Sync input field if clicked from watchlist or suggestion
    if (manualTicker) setTicker(manualTicker);

    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    setShowSuggestions(false);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: AgentStatus.IDLE })));

    try {
      const stageHandler = (stage: AnalysisStage) => {
        switch (stage) {
          case AnalysisStage.SEARCH:
            updateStepStatus('search', AgentStatus.RUNNING);
            break;
          case AnalysisStage.REDDIT:
            updateStepStatus('search', AgentStatus.COMPLETED);
            updateStepStatus('reddit', AgentStatus.RUNNING);
            break;
          case AnalysisStage.TECHNICALS:
            // Reddit agent is done when Technicals starts
            updateStepStatus('reddit', AgentStatus.COMPLETED);
            updateStepStatus('technicals', AgentStatus.RUNNING);
            break;
          case AnalysisStage.MEMO:
            updateStepStatus('technicals', AgentStatus.COMPLETED);
            updateStepStatus('memo', AgentStatus.RUNNING);
            break;
          default:
            break;
        }
      };

      const companyInfo = availableTickers.find(t => t.ticker === targetTicker);
      const companyName = companyInfo ? companyInfo.name : undefined;

      const analysis = await performMultiAgentAnalysis(targetTicker, companyName, stageHandler);

      updateStepStatus('memo', AgentStatus.COMPLETED);
      setResult(analysis);

      // Auto-update watchlist if analyzed item exists
      setWatchlist(prev => prev.map(item =>
        item.ticker === analysis.ticker
          ? { ...item, lastPrice: analysis.currentPrice, lastSentiment: analysis.sentiment.label }
          : item
      ));

    } catch (err: any) {
      console.error('Analysis failed', err);
      setError(err.message || 'An error occurred during analysis.');
      setSteps(prev => prev.map(s => s.status === AgentStatus.RUNNING ? { ...s, status: AgentStatus.ERROR } : s));
    } finally {
      setIsAnalyzing(false);
      log('Analysis finished');
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
        lastPrice: (result && result.ticker === target) ? result.currentPrice : undefined,
        lastSentiment: (result && result.ticker === target) ? result.sentiment.label : undefined
      }, ...prev];
    });
  };

  const clearWatchlist = () => {
    if (window.confirm('Clear all items from your watchlist?')) {
      setWatchlist([]);
    }
  };

  const filteredSuggestions = ticker.length > 0
    ? availableTickers.filter(item =>
      item.ticker.toLowerCase().startsWith(ticker.toLowerCase()) ||
      item.name.toLowerCase().includes(ticker.toLowerCase())
    )
    : [];

  const getSentimentColor = (label?: string) => {
    if (!label) return 'text-zinc-500';
    const l = label.toLowerCase();
    if (l.includes('bullish')) return 'text-emerald-400';
    if (l.includes('bearish')) return 'text-rose-400';
    return 'text-zinc-400';
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
              Ticker<span className="text-blue-500 font-light">Vibes</span>
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
            <h2 className="text-3xl font-bold text-white mb-2 font-sans">What are the Vibes looking like?</h2>
            <p className="text-zinc-400 text-lg">
              Analyze stocks using institutional data, technical signals, and <span className="text-orange-400 font-semibold italic">Reddit r/wallstreetbets</span> sentiment.
            </p>
          </div>

          <form onSubmit={handleAnalysis} className="flex gap-4 max-w-xl relative">
            <div className="relative flex-1" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                autoComplete="off"
                placeholder="Enter ticker (e.g. NVDA, TSLA, GME)"
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono uppercase text-lg"
                disabled={isAnalyzing}
              />

              {showSuggestions && ticker.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[60] overflow-hidden">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {isTickerListLoading ? (
                      <div className="px-4 py-3 text-sm text-zinc-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading ticker directory...
                      </div>
                    ) : filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map((item) => (
                        <button
                          key={item.ticker}
                          type="button"
                          onClick={() => {
                            setShowSuggestions(false);
                            handleAnalysis(undefined, item.ticker);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-baseline gap-2 overflow-hidden">
                            <span className="font-mono font-bold text-zinc-100 shrink-0">{item.ticker}</span>
                            <span className="font-sans italic text-zinc-500 text-xs truncate group-hover:text-zinc-400 transition-colors">
                              {item.name || '—'}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-500 transition-colors shrink-0" />
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-zinc-500">No tickers match "{ticker.toUpperCase()}"</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isAnalyzing || !ticker.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Orchestrating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          </form>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <aside className="xl:col-span-1 space-y-6">
            <div id="watchlist" className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full max-h-[600px]">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  Watchlist
                </h3>
                {watchlist.length > 0 && (
                  <button
                    onClick={clearWatchlist}
                    className="text-[10px] text-zinc-600 hover:text-rose-400 font-bold uppercase tracking-tighter transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-800 custom-scrollbar">
                {watchlist.length > 0 ? watchlist.map((item) => {
                  const isActive = result?.ticker === item.ticker;
                  return (
                    <div
                      key={item.ticker}
                      className={`group flex items-center justify-between p-4 transition-all relative ${isActive ? 'bg-blue-600/10' : 'hover:bg-zinc-800/50'
                        }`}
                    >
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>}
                      <button
                        onClick={() => handleAnalysis(undefined, item.ticker)}
                        disabled={isAnalyzing}
                        className="flex-1 text-left flex items-center gap-3 overflow-hidden"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs transition-all shrink-0 ${isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-blue-400 group-hover:bg-zinc-700'
                          }`}>
                          {item.ticker[0]}
                        </div>
                        <div className="overflow-hidden">
                          <div className={`font-bold flex items-center gap-2 ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                            {item.ticker}
                            {isActive && <ActivityStatusPulse />}
                          </div>
                          <div className="flex flex-col mt-0.5">
                            <span className="text-[11px] font-mono text-zinc-400 leading-none">
                              {item.lastPrice || '---'}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-tight mt-1 truncate ${getSentimentColor(item.lastSentiment)}`}>
                              {item.lastSentiment || 'No Data'}
                            </span>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(item.ticker);
                        }}
                        title="Remove from watchlist"
                        className="p-2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-all ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }) : (
                  <div className="p-12 text-center space-y-3">
                    <Star className="w-8 h-8 text-zinc-800 mx-auto" />
                    <p className="text-zinc-600 text-xs italic leading-relaxed">
                      Your watchlist is empty.<br />Analyze a stock and click the star icon to track it here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <AgentStatusList steps={steps} />


          </aside>

          <div className="xl:col-span-3">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-xl text-rose-400 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5" />
                  <p className="font-bold">Analysis Failed</p>
                </div>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!result && !isAnalyzing && !error && (
              <div className="h-96 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-600 group hover:border-zinc-700 transition-colors">
                <TrendingUp className="w-12 h-12 mb-4 opacity-20 group-hover:opacity-40 transition-opacity" />
                <p className="text-sm font-medium">Enter a ticker.</p>
                <div className="mt-6 flex gap-2">
                  {['NVDA', 'TSLA', 'GME'].map(t => (
                    <button
                      key={t}
                      onClick={() => handleAnalysis(undefined, t)}
                      className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold hover:border-blue-500 hover:text-blue-400 transition-all uppercase"
                    >
                      Try {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isAnalyzing && !result && (
              <div className="h-96 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-blue-600/20 rounded-full animate-ping absolute inset-0"></div>
                  <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-white tracking-tight">Aggregating Social Signals</p>
                  <p className="text-sm text-zinc-500 italic mt-1 animate-pulse">"Combining expert analysis with vibes"</p>
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
    </div>
  );
}

const ActivityStatusPulse = () => (
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
  </span>
);

export default App;
