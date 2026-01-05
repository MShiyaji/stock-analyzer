
import React from 'react';
import { AnalysisResult } from '../types';
import { 
  TrendingUp, TrendingDown, Minus, 
  ExternalLink, FileText, BarChart3, 
  Activity, Newspaper, Star, Sparkles,
  MessageSquare, Quote
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Label 
} from 'recharts';

interface Props {
  result: AnalysisResult;
  isWatched: boolean;
  onToggleWatchlist: (ticker: string) => void;
}

const Dashboard: React.FC<Props> = ({ result, isWatched, onToggleWatchlist }) => {
  const isPositive = result.sentiment.score > 0;
  
  // Mock chart data based on RSI/Signal for visual flair
  const chartData = Array.from({ length: 20 }, (_, i) => ({
    name: i,
    value: 100 + Math.sin(i / 2) * 10 + (result.technicalAnalysis.signal === 'BUY' ? i : -i)
  }));

  const renderMemoContent = (memo: string) => {
    return memo.split('\n').filter(line => line.trim()).map((line, idx) => {
      // Styled Headers
      if (line.startsWith('###') || line.startsWith('**')) {
        return (
          <h4 key={idx} className="text-zinc-100 font-bold mt-8 mb-3 text-xs uppercase tracking-widest flex items-center gap-2 first:mt-0">
            <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
            {line.replace(/[#*]/g, '').trim()}
          </h4>
        );
      }

      // Styled Quote Bubbles
      if (line.startsWith('>')) {
        return (
          <div key={idx} className="my-6 relative pl-10 pr-6 py-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 shadow-xl shadow-orange-500/5 group">
            <div className="absolute left-3 top-4 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
              <MessageSquare className="w-2.5 h-2.5 text-white" />
            </div>
            <p className="text-sm italic text-orange-200 leading-relaxed font-medium">
              {line.replace(/^>\s*/, '').replace(/"/g, '')}
            </p>
            <div className="absolute -bottom-1 left-8 w-3 h-3 bg-orange-500/10 border-r border-b border-orange-500/20 rotate-45"></div>
          </div>
        );
      }

      // Standard paragraphs
      return (
        <p key={idx} className="text-zinc-300 leading-relaxed mb-4 text-sm font-medium">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
          <button 
            onClick={() => onToggleWatchlist(result.ticker)}
            className={`absolute top-4 right-4 p-2 rounded-lg transition-all ${
              isWatched ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title={isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            <Star className={`w-4 h-4 ${isWatched ? 'fill-current' : ''}`} />
          </button>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-xs font-medium uppercase">Ticker</p>
              <h2 className="text-3xl font-bold text-white mt-1">{result.ticker}</h2>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-mono text-white">{result.currentPrice}</span>
            <span className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.priceChange}
            </span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <p className="text-zinc-400 text-xs font-medium uppercase">Market Vibe</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${Math.max(10, Math.abs(result.sentiment.score) * 100)}%`, marginLeft: result.sentiment.score < 0 ? '0' : '50%' }}
              />
            </div>
            <span className="text-lg font-bold text-white">
              {(result.sentiment.score * 10).toFixed(1)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {result.sentiment.score > 0.2 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : result.sentiment.score < -0.2 ? (
              <TrendingDown className="w-4 h-4 text-red-500" />
            ) : (
              <Minus className="w-4 h-4 text-zinc-400" />
            )}
            <span className="text-sm text-zinc-300">{result.sentiment.label}</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <p className="text-zinc-400 text-xs font-medium uppercase">Current Signal</p>
          <div className="mt-2">
            <span className={`text-2xl font-black px-3 py-1 rounded ${
              result.technicalAnalysis.signal === 'BUY' ? 'bg-emerald-500 text-emerald-950' : 
              result.technicalAnalysis.signal === 'SELL' ? 'bg-red-500 text-red-950' : 'bg-zinc-700 text-zinc-100'
            }`}>
              {result.technicalAnalysis.signal}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="text-zinc-500 uppercase">RSI: <span className="text-zinc-300 font-mono">{result.technicalAnalysis.rsi}</span></div>
            <div className="text-zinc-500 uppercase">Trend: <span className="text-zinc-300">{result.technicalAnalysis.trend}</span></div>
          </div>
        </div>
      </div>

      {/* Main Analysis Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl shadow-blue-500/5">
            <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-2 bg-zinc-900/50">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-zinc-200 uppercase text-xs tracking-widest">Rapid Insight</h3>
            </div>
            <div className="p-8">
              <div className="max-w-2xl mx-auto">
                {renderMemoContent(result.memo)}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <h3 className="font-semibold text-zinc-200 text-xs uppercase tracking-widest">Trend Matrix</h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `T-${19 - val}`}
                    dy={10}
                  >
                    <Label value="Simulated Time (Ticks)" offset={-20} position="insideBottom" fill="#71717a" fontSize={10} fontWeight={600} />
                  </XAxis>
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `$${val.toFixed(0)}`}
                    dx={-5}
                  >
                    <Label value="Price ($)" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle' }} fill="#71717a" fontSize={10} fontWeight={600} />
                  </YAxis>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    itemStyle={{ color: '#3b82f6' }}
                    labelFormatter={(val) => `Interval ${val}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    strokeWidth={2}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="w-4 h-4 text-zinc-400" />
              <h3 className="font-semibold text-zinc-200 text-xs uppercase tracking-widest">Grounding Intel</h3>
            </div>
            <div className="space-y-3">
              {result.sources.length > 0 ? result.sources.map((source, idx) => (
                <a 
                  key={idx} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-300 line-clamp-2 leading-tight group-hover:text-white font-medium">{source.title}</span>
                    <ExternalLink className="w-3 h-3 text-zinc-500 shrink-0" />
                  </div>
                </a>
              )) : (
                <p className="text-zinc-500 text-sm italic">Scanning sources...</p>
              )}
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
            <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">Smart Summary</h4>
            <p className="text-xs text-emerald-300/70 leading-relaxed font-medium">
              Analyzed {result.sources.length} intelligence nodes. Social sentiment extracted from live discourse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
