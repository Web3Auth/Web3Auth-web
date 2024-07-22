import { BUILD_ENV, type BUILD_ENV_TYPE, OPENLOGIN_NETWORK, type OPENLOGIN_NETWORK_TYPE } from "@toruslabs/openlogin-utils";

export const PASSKEY_SVC_URL: Record<BUILD_ENV_TYPE, string> = {
  [BUILD_ENV.DEVELOPMENT]: "http://localhost:3041",
  [BUILD_ENV.TESTING]: "https://api-develop-passwordless.web3auth.io",
  [BUILD_ENV.STAGING]: "https://api-passwordless.web3auth.io",
  [BUILD_ENV.PRODUCTION]: "https://api-passwordless.web3auth.io",
};

export const PASSKEYS_VERIFIER_MAP: Record<OPENLOGIN_NETWORK_TYPE, string> = {
  [OPENLOGIN_NETWORK.MAINNET]: "passkey-legacy-mainnet",
  [OPENLOGIN_NETWORK.TESTNET]: "passkey-legacy-testnet",
  [OPENLOGIN_NETWORK.AQUA]: "passkey-legacy-aqua",
  [OPENLOGIN_NETWORK.CYAN]: "passkey-legacy-cyan",
  [OPENLOGIN_NETWORK.SAPPHIRE_DEVNET]: "passkey-sapphire-devnet",
  [OPENLOGIN_NETWORK.SAPPHIRE_MAINNET]: "passkey-sapphire-mainnet",
  [OPENLOGIN_NETWORK.CELESTE]: "",
};
