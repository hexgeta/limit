// Global paywall configuration
export const PAYWALL_ENABLED = true;

// Token-gating requirements
export const PARTY_TOKEN_ADDRESS = '0x4581af35199bbde87a89941220e04e27ce4b0099' as const;
export const TEAM_TOKEN_ADDRESS = '0xb7c9e99da8a857ce576a830a9c19312114d9de02' as const;
export const REQUIRED_PARTY_TOKENS = 50000;
export const REQUIRED_TEAM_TOKENS = 50000;

// Paywall modal text
export const PAYWALL_TITLE = "Premium Data Access";
export const PAYWALL_DESCRIPTION = `Hold either ${REQUIRED_PARTY_TOKENS.toLocaleString()} $PARTY or ${REQUIRED_TEAM_TOKENS.toLocaleString()} $TEAM tokens to get access. (~$100)`;
