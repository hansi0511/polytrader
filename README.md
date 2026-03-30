# POLYTRADER // BTC Intelligence

Polymarket CLOB trading interface with BTC 5-minute signal prediction.

## Features
- **Live BTC Predictor** — 6 technical indicators (EMA9/21, RSI14, MACD, Bollinger, ROC, Volume)
- **Polymarket CLOB** — Full order placement via EIP-712 / MetaMask
- **ARB Detector** — Auto-detects arbitrage opportunities (YES+NO < 1.00)
- **Full API** — Orders, Fills, Positions via Vercel proxy (no CORS issues)
- **Signal Adoption** — One click to transfer BTC signal into order form

## Architecture

```
Browser (MetaMask + ethers.js)
        ↓ fetch /api/*
Vercel Serverless Functions (CORS proxy)
   api/gamma.js  →  gamma-api.polymarket.com
   api/clob.js   →  clob.polymarket.com
   api/binance.js →  api.binance.com
        ↓
Polygon Mainnet (settlement)
```

## Setup

### 1. Clone & Deploy
```bash
git clone https://github.com/YOUR_USERNAME/polytrader
cd polytrader
vercel deploy
```

### 2. Connect Wallet
- Install MetaMask
- Switch to Polygon Mainnet
- Click "CONNECT WALLET"

### 3. Derive API Keys
- Click "DERIVE API KEYS" — signs EIP-712 message
- Required for: placing orders, viewing fills & positions

### 4. USDC Allowances (first time only)
EOA wallets need to approve USDC + CTF token contracts:
```
USDC:         0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
CTF Exchange: 0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E
```

## API Routes (Vercel Proxy)

| Route | Target | Auth |
|---|---|---|
| `GET /api/gamma/markets` | Gamma Markets API | None |
| `GET /api/clob/book` | CLOB Order Book | None |
| `GET /api/clob/midpoint` | CLOB Midpoint | None |
| `POST /api/clob/auth/api-key` | API Key Derivation | L1 (EIP-712) |
| `GET /api/clob/orders` | Open Orders | L2 (HMAC) |
| `POST /api/clob/order` | Place Order | L2 (HMAC) |
| `DELETE /api/clob/order` | Cancel Order | L2 (HMAC) |
| `GET /api/clob/fills` | Trade History | L2 (HMAC) |
| `GET /api/clob/positions` | Positions | L2 (HMAC) |
| `GET /api/binance/klines` | BTC Klines | None |

## BTC Algorithm

Weighted scoring across 6 indicators:

| Indicator | Weight | Signal Logic |
|---|---|---|
| EMA 9/21 | 2.5 | Crossover direction |
| RSI 14 | 2.0 | <30 oversold, >70 overbought |
| MACD 12/26/9 | 2.0 | Histogram + zero line |
| Bollinger Bands 20 | 1.5 | Band proximity |
| ROC 10 | 1.5 | Rate of change momentum |
| Volume Momentum | 1.0 | Buy/sell volume dominance |

**Note:** 5-minute predictions are inherently noisy. Expected accuracy ~52-58%. Not financial advice.

## Tech Stack
- Vanilla JS + ethers.js 5.7 (EIP-712 signing)
- Chart.js 4.4 (price chart)
- Vercel Serverless Functions (Node.js proxy)
- Binance Public API (BTC data)
- Polymarket CLOB API v2
