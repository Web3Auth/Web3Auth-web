export const CHECKOUT_BUILD_ENV = {
  PRODUCTION: "production",
  STAGING: "staging",
  DEVELOPMENT: "development",
  TESTING: "testing",
} as const;

export type CHECKOUT_BUILD_ENV_TYPE = (typeof CHECKOUT_BUILD_ENV)[keyof typeof CHECKOUT_BUILD_ENV];

export const CHECKOUT_URLS: Record<CHECKOUT_BUILD_ENV_TYPE, string> = {
  [CHECKOUT_BUILD_ENV.DEVELOPMENT]: "http://localhost:4050",
  [CHECKOUT_BUILD_ENV.PRODUCTION]: "https://checkout.web3auth.io",
  [CHECKOUT_BUILD_ENV.STAGING]: "https://staging-checkout.web3auth.io",
  [CHECKOUT_BUILD_ENV.TESTING]: "https://develop-checkout.web3auth.io",
};
