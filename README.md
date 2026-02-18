# FinAgent Pro: Multi-Agent Financial Intelligence

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue)
![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF)

A sophisticated multi-agent financial analysis platform that leverages Google Gemini AI to provide comprehensive stock analysis through institutional data, technical signals, and social sentiment from Reddit's r/wallstreetbets.

## ✨ Features

### Multi-Agent Intelligence System
- **Data Harvester Agent**: Retrieves real-time news and price data from multiple sources
- **Reddit Intel Agent**: Scrapes r/wallstreetbets for retail investor sentiment analysis
- **Sentiment Analyst Agent**: Aggregates market sentiment from news and social media
- **Quant Agent**: Calculates technical indicators (RSI, MACD, trend analysis)
- **Synthesis Engine**: Generates professional investment memos with comprehensive analysis

### Advanced Capabilities
- 🔍 **Real-time Stock Search**: Smart ticker search with autocomplete suggestions
- 📊 **Technical Analysis**: RSI, MACD, and trend indicators with actionable signals
- 💬 **Social Sentiment**: r/wallstreetbets sentiment analysis for retail investor insights
- 📰 **News Integration**: Web search grounding for latest market news
- ⭐ **Watchlist Management**: Track and monitor multiple stocks with saved sentiment data
- 📈 **Interactive Dashboard**: Beautiful visualizations powered by Recharts
- ⚡ **Rate Limiting**: Smart rate limiting with model pooling for reliability

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Google Gemini API key
- (Optional) Tavily API key for enhanced web search

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MShiyaji/stock-analyzer.git
cd stock-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_API_KEY=your_google_gemini_api_key_here
VITE_TAVILY_API_KEY=your_tavily_api_key_here  # Optional
```

### Getting API Keys

#### Google Gemini API Key (Required)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file as `VITE_API_KEY`

#### Tavily API Key (Optional - for enhanced web search)
1. Visit [Tavily.com](https://tavily.com/)
2. Sign up for an account
3. Get your API key from the dashboard
4. Add it to your `.env` file as `VITE_TAVILY_API_KEY`

### Running the Application

Development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

The application will be available at `http://localhost:5173` (or the next available port).

## 📖 Usage

1. **Search for a Stock**: Enter a ticker symbol (e.g., NVDA, TSLA, GME) in the search bar
2. **Trigger Analysis**: Click the "Analyze" button to start the multi-agent analysis
3. **Watch Progress**: Monitor the status of each agent as they work in parallel
4. **Review Results**: See comprehensive analysis including:
   - Current price and price changes
   - Sentiment score and social sentiment summary
   - Technical indicators (RSI, MACD)
   - Buy/Sell/Hold signals
   - Professional investment memo
   - Source citations
5. **Manage Watchlist**: Click the star icon to add stocks to your watchlist for quick access

## 🛠️ Technology Stack

### Frontend
- **React 19.2.3**: Modern UI library
- **TypeScript 5.8.2**: Type-safe development
- **Vite 6.2.0**: Fast build tool and dev server
- **Tailwind CSS 3.4.13**: Utility-first CSS framework
- **Lucide React**: Beautiful icon library
- **Recharts 3.6.0**: Composable charting library

### AI & Language Models
- **Google Gemini AI**: Advanced language models (2.5/3.0 Flash)
- **LangChain**: AI application framework
  - `@langchain/google-genai`: Google Gemini integration
  - `@langchain/core`: Core LangChain functionality

### API Integration
- **Tavily API**: Advanced web search for financial news
- **Reddit Data**: Social sentiment from r/wallstreetbets

## 📁 Project Structure

```
stock-analyzer/
├── components/              # React components
│   ├── AgentStatusList.tsx # Agent progress tracker
│   └── Dashboard.tsx       # Main analysis dashboard
├── src/
│   └── services/           # Backend services
│       ├── geminiService.ts    # Gemini AI integration
│       ├── rateLimiter.ts      # Rate limiting logic
│       └── redditService.ts    # Reddit data fetching
├── public/
│   └── tickers.json        # Ticker directory
├── App.tsx                 # Main application component
├── types.ts                # TypeScript type definitions
├── index.tsx               # Application entry point
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
```

## 🔧 Configuration

### Model Selection
The application uses a model pool with automatic rotation:
- `gemini-2.5-flash-lite`
- `gemini-2.5-flash`
- `gemini-3-flash-preview`

### Rate Limiting
Default rate limit: 15 requests per minute (configurable in `rateLimiter.ts`)

### Caching
Analysis results are cached for 30 minutes to optimize API usage

## 🎨 Features in Detail

### Agent Orchestration
The platform employs a sophisticated multi-agent architecture where specialized agents work together:

1. **Data Harvester**: Gathers financial news and market data
2. **Reddit Intel**: Analyzes social sentiment from retail investors
3. **Sentiment Analyst**: Combines news and social data for overall sentiment
4. **Quant Agent**: Performs technical analysis with various indicators
5. **Synthesis Engine**: Creates a comprehensive investment memo

### Watchlist System
- Persistent storage using localStorage
- Automatic price and sentiment updates
- One-click access to saved stocks
- Visual indicators for active analysis

### Smart Search
- Autocomplete with 40+ popular tickers
- Company name search
- Custom ticker directory support via `public/tickers.json`

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This application is for educational and informational purposes only. It should not be considered financial advice. Always conduct your own research and consult with a qualified financial advisor before making investment decisions.

## 🙏 Acknowledgments

- Google Gemini AI for powering the multi-agent intelligence
- Tavily for advanced web search capabilities
- Reddit r/wallstreetbets community for social sentiment data
- All open-source contributors

## 📧 Support

For questions, issues, or suggestions, please open an issue on GitHub.

---

Built with ❤️ using React, TypeScript, and Google Gemini AI
