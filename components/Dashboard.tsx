
import React from 'react';
import { AnalysisResult } from '../types';
import {
  TrendingUp, TrendingDown, Minus,
  ExternalLink, FileText, BarChart3,
  Activity, Newspaper, Star, Sparkles,
  MessageSquare, Quote, AlertTriangle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Label,
  BarChart, Bar
} from 'recharts';

interface Props {
  result: AnalysisResult;
  isWatched: boolean;
  onToggleWatchlist: (ticker: string) => void;
}

const Dashboard: React.FC<Props> = ({ result, isWatched, onToggleWatchlist }) => {
  const isPositive = result.sentiment.score > 0;

  // Use social volume data if available, otherwise fallback
  const volumeData = result.sentiment.socialVolume || Array(8).fill(0);
  const chartData = volumeData.map((val, i) => ({
    name: i,
    value: val,
    day: `W-${8 - 1 - i}`
  }));

  const renderMemoContent = (memo: string) => {
    let currentSection = '';

    return memo.split('\n').filter(line => line.trim()).map((line, idx) => {
      const cleanLine = line.trim();

      // Styled Headers
      if (cleanLine.startsWith('###') || cleanLine.startsWith('**')) {
        const lower = cleanLine.toLowerCase();
        if (lower.includes('risk')) currentSection = 'risks';
        else if (lower.includes('opportunit')) currentSection = 'opportunities';
        else currentSection = ''; // Reset section

        // Verdict Decision Box (Wrapped in :::)
        if (cleanLine.includes("verdict")) {
          return (
            <div key={idx} className="my-8 text-center">
              <h4 className="text-blue-400 font-black text-xs uppercase tracking-[0.2em] mb-2 border-b border-blue-500/20 pb-4 inline-block px-12">
                The Verdict
              </h4>
            </div>
          );
        }

        return (
          <h4 key={idx} className="text-zinc-100 font-bold mt-8 mb-3 text-xs uppercase tracking-widest flex items-center gap-2 first:mt-0">
            <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
            {cleanLine.replace(/[#*]/g, '').trim()}
          </h4>
        );
      }

      // Special handling for Verdict Decision line (wrapped in :::)
      if (line.includes(":::")) {
        const text = line.replace(/:::/g, '').trim();
        const isBuy = text.toUpperCase().includes('BUY');
        const isSell = text.toUpperCase().includes('SELL');

        return (
          <div key={idx} className="flex justify-center mb-8">
            <span className={`text-4xl font-black px-8 py-4 rounded-2xl shadow-2xl tracking-wider ${isBuy ? 'bg-emerald-500 text-emerald-950 shadow-emerald-500/20' :
              isSell ? 'bg-red-500 text-red-950 shadow-red-500/20' :
                'bg-zinc-700 text-zinc-100 shadow-zinc-700/20'
              }`}>
              {text}
            </span>
          </div>
        );
      }

      // Styled Risk Boxes
      if (currentSection === 'risks' && (cleanLine.startsWith('-') || cleanLine.startsWith('*') || /^\d+\./.test(cleanLine))) {
        const content = cleanLine.replace(/^[-*]|\d+\.\s*/, '').trim();
        return (
          <div key={idx} className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4 mb-3 flex gap-3 items-start group hover:bg-rose-500/10 transition-colors">
            <AlertTriangle className="w-4 h-4 text-rose-500/50 mt-0.5 shrink-0 group-hover:text-rose-400 transition-colors" />
            <p className="text-sm text-zinc-300 font-medium leading-relaxed">
              {content}
            </p>
          </div>
        );
      }

      // Styled Opportunity Boxes
      if (currentSection === 'opportunities' && (cleanLine.startsWith('-') || cleanLine.startsWith('*') || /^\d+\./.test(cleanLine))) {
        const content = cleanLine.replace(/^[-*]|\d+\.\s*/, '').trim();
        return (
          <div key={idx} className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mb-3 flex gap-3 items-start group hover:bg-emerald-500/10 transition-colors">
            <TrendingUp className="w-4 h-4 text-emerald-500/50 mt-0.5 shrink-0 group-hover:text-emerald-400 transition-colors" />
            <p className="text-sm text-zinc-300 font-medium leading-relaxed">
              {content}
            </p>
          </div>
        );
      }

      // Styled Quote Bubbles
      if (cleanLine.startsWith('>')) {
        const rawLine = cleanLine.replace(/^>\s*/, '').replace(/"/g, '');
        // Check for markdown link [Reference](url)
        const linkMatch = rawLine.match(/\[(.*?)\]\((.*?)\)/);
        let content = rawLine;
        let url = null;

        if (linkMatch) {
          content = rawLine.replace(linkMatch[0], '').trim();
          if (content.endsWith('-')) content = content.slice(0, -1).trim();
          url = linkMatch[2];
        }

        return (
          <div key={idx} className="my-6 relative pl-10 pr-6 py-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 shadow-xl shadow-orange-500/5 group">
            <div className="absolute left-3 top-4 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
              <MessageSquare className="w-2.5 h-2.5 text-white" />
            </div>
            <p className="text-sm italic text-orange-200 leading-relaxed font-medium">
              "{content}"
            </p>
            {url && url !== '#' && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase font-bold text-orange-400 hover:text-orange-300 transition-colors"
              >
                View Source <ExternalLink className="w-3 h-3" />
              </a>
            )}
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
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-xs font-medium uppercase">Ticker</p>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-white mt-1">{result.ticker}</h2>
                <button
                  onClick={() => onToggleWatchlist(result.ticker)}
                  className={`p-2 rounded-lg transition-all mt-1 ${isWatched ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  title={isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
                >
                  <Star className={`w-4 h-4 ${isWatched ? 'fill-current' : ''}`} />
                </button>
              </div>
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
                style={{ width: `${Math.min(100, Math.max(0, ((result.sentiment.score + 1) * 50)))}%` }}
              />
            </div>
            <span className="text-lg font-bold text-white">
              {((result.sentiment.score + 1) * 5).toFixed(1)}<span className="text-xs text-zinc-500 font-normal">/10</span>
            </span>
          </div>

          <p className="mt-3 text-sm text-zinc-300 leading-snug">
            {result.sentiment.summary}
          </p>

          <div className="mt-3 flex items-center gap-2">
            {result.sentiment.score > 0.2 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : result.sentiment.score < -0.2 ? (
              <TrendingDown className="w-4 h-4 text-red-500" />
            ) : (
              <Minus className="w-4 h-4 text-zinc-400" />
            )}
            <span className="text-xs text-zinc-500 uppercase tracking-wider">{result.sentiment.label}</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <p className="text-zinc-400 text-xs font-medium uppercase">Current Signal</p>
          <div className="mt-2">
            <span className={`text-2xl font-black px-3 py-1 rounded ${result.technicalAnalysis.signal === 'BUY' ? 'bg-emerald-500 text-emerald-950' :
              result.technicalAnalysis.signal === 'SELL' ? 'bg-red-500 text-red-950' : 'bg-zinc-700 text-zinc-100'
              }`}>
              {result.technicalAnalysis.signal}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="text-zinc-500 uppercase">RSI: <span className="text-zinc-300 font-mono">{result.technicalAnalysis.rsi}</span></div>
          </div>
        </div>
      </div>

      {/* Main Analysis Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl shadow-blue-500/5">
            <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-center gap-2 bg-zinc-900/50">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-zinc-200 uppercase text-xs tracking-widest text-center">Rapid Insight</h3>
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
              <h3 className="font-semibold text-zinc-200 text-xs uppercase tracking-widest">Social Volume (8 Weeks)</h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#52525b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#52525b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}`}
                    dx={-5}
                  >
                    <Label value="Post Density" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle' }} fill="#71717a" fontSize={10} fontWeight={600} />
                  </YAxis>
                  <Tooltip
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    itemStyle={{ color: '#a855f7' }}
                    labelFormatter={(val) => `Day ${val}`}
                  />
                  <Bar
                    dataKey="value"
                    fill="#a855f7"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                  />
                </BarChart>
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


        </div>
      </div>
    </div>
  );
};

export default Dashboard;
