# OTC Contract Whitelist Information

## Overview

This document provides information about the whitelisted tokens on the OTC contract and how to verify/update them.

## Contract Address

**OTC Contract:** `0x342DF6d98d06f03a20Ae6E2c456344Bb91cE33a2`

## Current Whitelisted Tokens (as of 2025-10-10)

### ✅ Active Tokens (8)

1. **PLSX** (PulseX) - `0x95B303987A60C71504D99Aa1b13B4DA07b0790ab`
2. **weDAI** (Wrapped DAI from Eth) - `0xefD766cCb38EaF1dfd701853BFCe31359239F305`
3. **PLS** (Pulse) - `0x000000000000000000000000000000000000dEaD`
4. **INC** (Incentive) - `0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d`
5. **HEX** (HEX on Pls) - `0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39`
6. **USDL** - `0x0dEEd1486bc52aA0d3E6f8849cEC5adD6598A162`
7. **weWETH** (Wrapped WETH from Eth) - `0x02DcdD04e3F455D838cd1249292C58f3B79e3C3C`
8. **2PHUX** (2PHUX Governance Token) - `0x115f3Fa979a936167f9D208a7B7c4d85081e84BD`

### ❌ Inactive Tokens (2)

- **weUSDC** (Wrapped USDC from Eth) - `0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07`
- **weUSDT** (Wrapped USDT from Eth) - `0x0Cb6F5a34ad42ec934882A05265A7d5F59b51A2f`

## Checking the Whitelist

To verify the current whitelist from the contract, run:

```bash
npm run check-whitelist
```

Or directly:

```bash
node scripts/check-whitelist.js
```

This will query the contract via RPC and display all whitelisted tokens with their active status.

## Using Whitelisted Tokens in Code

The `constants/crypto.ts` file has been updated with `isWhitelisted` flags for each token. You can use the following helpers:

### Get All Whitelisted Tokens

```typescript
import { WHITELISTED_TOKENS } from "@/constants/crypto";

// Returns an array of only whitelisted tokens
const whitelistedTokens = WHITELISTED_TOKENS;
```

### Check if a Token is Whitelisted

```typescript
import { isTokenWhitelisted } from "@/constants/crypto";

// Check by address (case-insensitive)
const isWhitelisted = isTokenWhitelisted(
  "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab"
);
```

### Filter by Whitelist Status

```typescript
import { TOKEN_CONSTANTS } from "@/constants/crypto";

// Get all whitelisted tokens
const whitelisted = TOKEN_CONSTANTS.filter(
  (token) => token.isWhitelisted === true
);

// Get all non-whitelisted tokens
const notWhitelisted = TOKEN_CONSTANTS.filter((token) => !token.isWhitelisted);
```

## Updating the Whitelist

When the contract whitelist is updated by the dev:

1. Run `npm run check-whitelist` to get the current on-chain whitelist
2. Update `constants/crypto.ts`:
   - Add/update `isWhitelisted: true` for active tokens
   - Add/update `isWhitelisted: false` for inactive tokens
   - Update the comment block at the top of `TOKEN_CONSTANTS` array with the new list
3. Test the application to ensure token selection works correctly

## Important Notes

- The whitelist is controlled by the smart contract, not by this application
- Only tokens marked as `isWhitelisted: true` can be used for creating OTC positions
- The contract owner can add/remove tokens from the whitelist at any time
- Always verify against the contract before making assumptions about which tokens are whitelisted

## Previous Tokens Removed from Whitelist

The following tokens were previously thought to be whitelisted but are NOT in the current contract whitelist:

- PCOCK
- HTT3000
- HTT5000
- HTT7000
- ALAMO
- BRIAH
- weHEX
- WPLS

These tokens exist in the constants but should not be used for OTC trading unless re-added to the contract whitelist.
