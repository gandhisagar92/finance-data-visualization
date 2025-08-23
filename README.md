Reference Data Relationship Explorer

Tech Stack
- Frontend: React + TypeScript + TailwindCSS + Vite
- Backend: Python (Tornado), file-backed JSON store (mock DB)
- Node 20+, npm 10+, Python 3.10+

Run locally (two services)
1. Backend
   - Install deps:
     ```bash
     python3 -m pip install --break-system-packages -r /workspace/backend/requirements.txt
     ```
   - Run:
     ```bash
     python3 /workspace/backend/app.py
     ```
   - Server runs on http://localhost:8000
2. Frontend (Vite dev server)
   ```bash
   cd /workspace/frontend
   npm install
   npm run dev
   ```
   - App runs on http://localhost:5173 and proxies /api to backend

API Contract
- GET /api/meta → Meta for dynamic UI + graph/ui config
- POST /api/search → returns graph {nodes, edges, root}
- GET /api/node/:nodeType/:id → Full payload for a node
- GET /api/expand?nodeType=...&id=... → Expand relationships for a node

Graph Model
- Node types: Stock, StockTradingLine, Option, OptionTradingLine, Index, IndexTradingLine, Future, FutureTradingLine, Exchange, IndexComposition
- Edge types: HAS, LISTED_ON, HAS_UNDERLYING

UI/Graph Behavior
- Header bar with title "Reference Data Explorer"
- Left panel: dynamic SearchForm; bottom-left NodeDetails
- Right panel: full-panel interactive graph; draggable nodes and attributes; zoom/pan; toggle to hide/show sub-elements; hover tooltip shows attributes

ERD (conceptual)
- Stock (instrumentId, isin, name, tradingLines[])
- StockTradingLine (tradingLineId, postTradeId, ric, bloombergTicker, currency, exchangeMic)
- Option (instrumentId, isin, postTradeId, strike, contractSize, expirationDate, CallOrPut, tradingLines[], underlyingInstrumentIds[])
- OptionTradingLine (tradingLineId, ric, bloombergTicker, currency, exchangeMic)
- Index (instrumentId, isin, postTradeId, tradingLines[], compositionId)
- IndexComposition (basketId, totalConstituents, constituentStocks[])
- IndexTradingLine (tradingLineId, ric, bloombergTicker, currency, exchangeMic)
- Future (instrumentId, isin, postTradeId, contractSize, lastTradeDate, tradingLines[], underlyingInstrumentIds[])
- FutureTradingLine (tradingLineId, ric, bloombergTicker, currency, exchangeMic)
- Exchange (mic, name)

Mock Data
- See backend/data/*.json for mock records.

