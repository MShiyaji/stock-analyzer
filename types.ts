
export enum AgentStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AnalysisResult {
  ticker: string;
  companyName: string;
  currentPrice: string;
  priceChange: string;
  sentiment: {
    score: number; // -1 to 1
    label: string;
    summary: string;
    socialVolume?: number[];
  };
  technicalAnalysis: {
    rsi: number;
    macd: string;
    signal: 'BUY' | 'SELL' | 'HOLD';
    trend: string;
  };
  memo: string;
  sources: { title: string; uri: string }[];
  timestamp: string;
}

export interface AgentStep {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
}

export interface WatchlistItem {
  ticker: string;
  lastPrice?: string;
  lastSentiment?: string;
  addedAt: number;
}

export enum AnalysisStage {
  SEARCH = 'SEARCH',
  REDDIT = 'REDDIT',
  SENTIMENT = 'SENTIMENT',
  TECHNICALS = 'TECHNICALS',
  AGENT_DISCUSSION = 'AGENT_DISCUSSION',
  MEMO = 'MEMO'
}
