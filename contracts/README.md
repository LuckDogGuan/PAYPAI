# PayPai Smart Contracts

This directory contains the smart contracts for the PayPai vault system.

## Contracts

### ClientAgentVault
The main vault contract that manages AI agent spending rules and budgets.

**Features:**
- Configurable spending rules (token, budget, time window, whitelist, blacklist)
- Withdraw functionality for vault owner
- Budget tracking and enforcement

### VaultFactory
Factory contract for deploying new ClientAgentVault instances.

**Features:**
- CREATE2 deterministic deployment
- Predictable vault addresses
- Easy vault creation

### PayPaiTestToken
Simple mintable ERC20 token for testing. Includes a faucet-style mint for end users.

## Setup

1. Install dependencies:
```bash
cd contracts
npm install
```

2. Configure environment:
```bash
# Copy .env.example to .env
cp .env.example .env
```

3. Update `.env` with your values:
```bash
PRIVATE_KEY=your_private_key_here
NEXT_PUBLIC_KITE_RPC_URL=https://rpc-testnet.gokite.ai
SETTLEMENT_TOKEN=0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63
```

## Deployment

Deploy to Kite Testnet:

```bash
npm run deploy
```

Deploy a test ERC20 token:

```bash
npm run deploy:token
```

Optional env vars for the test token:

```bash
TEST_TOKEN_NAME=PayPai Test Token
TEST_TOKEN_SYMBOL=PPT
TEST_TOKEN_DECIMALS=18
TEST_TOKEN_SUPPLY=1000000
TEST_TOKEN_FAUCET_AMOUNT=1000
TEST_TOKEN_FAUCET_COOLDOWN=3600
```

## Verification

Verify vault contracts:

```bash
npm run verify:vault
```

Verify test token:

```bash
npm run verify:token
```

Explorer env vars (Blockscout/Etherscan-compatible):

```bash
KITE_EXPLORER_API_URL=https://testnet.kitescan.ai/api
KITE_EXPLORER_BROWSER_URL=https://testnet.kitescan.ai
KITE_EXPLORER_API_KEY=anything-non-empty
PRIVATE_KEY=your_private_key_here
```

This will:
1. Deploy the ClientAgentVault implementation
2. Deploy the VaultFactory
3. Save deployment addresses to `deployments.json`

## Post-Deployment

After deployment, update your `.env.local` in the root directory:

```bash
NEXT_PUBLIC_VAULT_FACTORY=<factory_address_from_deployment>
NEXT_PUBLIC_VAULT_IMPLEMENTATION=<implementation_address_from_deployment>
```

## Contract Sizes

- ClientAgentVault: ~5 KB
- VaultFactory: ~2 KB

Both are well within Kite's contract size limits.

## Security Notes

- All contracts use OpenZeppelin's audited implementations
- Vault uses Ownable pattern for access control
- Factory uses CREATE2 for deterministic deployments
- No critical vulnerabilities detected

## Testing

Test the contracts locally:

```bash
npx hardhat test
```

## License

MIT
