# Quick Start: Deploy Vault Factory

This guide will help you deploy the Vault Factory contract in 5 minutes.

## What is the Factory Contract?

The Factory contract allows you (or your users) to deploy ClientAgentVault contracts with ONE CLICK - no complex deployment scripts needed!

## Why Deploy Factory?

- ✅ **One-click vault deployment** for users
- ✅ **Deterministic addresses** - predictable vault addresses
- ✅ **Gasless** - users don't need to hold ETH
- ✅ **Required for AI agent** - vault manages spending rules

## Deployment Steps

### Step 1: Install Dependencies

```bash
cd contracts
npm install
```

### Step 2: Configure Environment

Create `.env` file in the `contracts` directory:

```bash
PRIVATE_KEY=your_private_key_here
```

**IMPORTANT**: Use the same private key you use for the app!

### Step 3: Deploy to Kite Testnet

```bash
npm run deploy
```

This will deploy:
1. ClientAgentVault implementation contract
2. VaultFactory contract

### Step 4: Update App Configuration

After deployment, copy the factory address from `deployments.json` and add it to your `.env.local`:

```bash
NEXT_PUBLIC_VAULT_FACTORY=0xYourFactoryAddressHere
```

### Step 5: Test the Deployment

1. Restart your app: `npm run dev`
2. Go to Vault Management page
3. You should see a green "Factory Available" status
4. Click "Deploy Vault Now" to deploy your vault!

## Troubleshooting

### "Insufficient funds" error
- Make sure your wallet has some testnet tokens
- Get testnet tokens from: [Kite Faucet](https://faucet.gokite.ai)

### "Factory not deployed" error
- Check that `deployments.json` was created
- Verify the factory address is correct in `.env.local`

### "Transaction failed" error
- Check Kite testnet status
- Try again after a few seconds

## Contract Addresses (for reference)

- Settlement Token: `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63`
- Your Factory: *(deployed in Step 3)*
- Your Vault: *(deployed in Step 5)*

## Next Steps

After factory deployment:

1. ✅ Users can deploy vaults with one click
2. ✅ Configure spending rules for AI agent
3. ✅ Start building AI features!

## Need Help?

Check the detailed guide: `contracts/README.md`
