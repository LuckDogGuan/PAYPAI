# PayPai - AI-Powered Smart Contract Wallet

An AI-driven Account Abstraction wallet system built on Kite AI Layer 1 chain, allowing users to execute blockchain transactions through natural language commands.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Web3**: Kite AA SDK, ethers.js v6
- **AI**: Qwen API for natural language processing
- **Network**: Kite Testnet

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Update the following values:
- `PRIVATE_KEY`: Your wallet private key (development only)
- `QWEN_API_KEY`: Your Qwen API key
- `NEXT_PUBLIC_VAULT_FACTORY`: VaultFactory address (after deployment)
- `NEXT_PUBLIC_VAULT_IMPLEMENTATION_ADDRESS`: ClientAgentVault implementation address
- `EXECUTOR_PRIVATE_KEY`: Server-side executor key for AI Vault execution
- `NEXT_PUBLIC_EXECUTOR_ADDRESS`: (optional) Executor address to display in UI

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
PayPai/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── lib/              # Utility libraries
│   │   ├── kite.ts       # Kite SDK configuration
│   │   └── agent.ts      # AI agent service
│   └── types/            # TypeScript types
├── docs/                 # Documentation
└── public/               # Static assets
```

## Features

- [x] Account Abstraction wallet creation
- [x] ClientAgentVault deployment with spending rules
- [ ] Natural language transaction processing
- [ ] ERC-20 token transactions
- [ ] Frontend UI

## License

MIT
