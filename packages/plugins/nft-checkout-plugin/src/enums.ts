export const NFT_CHECKOUT_BUILD_ENV = {
  PRODUCTION: "production",
  STAGING: "staging",
  DEVELOPMENT: "development",
  TESTING: "testing",
} as const;

export type NFT_CHECKOUT_BUILD_ENV_TYPE = (typeof NFT_CHECKOUT_BUILD_ENV)[keyof typeof NFT_CHECKOUT_BUILD_ENV];

export const NFT_CHECKOUT_URLS: Record<NFT_CHECKOUT_BUILD_ENV_TYPE, string> = {
  [NFT_CHECKOUT_BUILD_ENV.DEVELOPMENT]: "http://localhost:4050",
  [NFT_CHECKOUT_BUILD_ENV.TESTING]: "https://develop-nft-checkout.web3auth.io",
  [NFT_CHECKOUT_BUILD_ENV.STAGING]: "https://staging-nft-checkout.web3auth.io",
  [NFT_CHECKOUT_BUILD_ENV.PRODUCTION]: "https://nft-checkout.web3auth.io",
};

export const NFT_CHECKOUT_EMBED_MESSAGE_TYPES = {
  INIT: "init",
  SETUP_COMPLETE: "setup_complete",
  SHOW_NFT_CHECKOUT: "show_nft_checkout",
  HIDE_NFT_CHECKOUT: "hide_nft_checkout",
} as const;
