import type { SafeEventEmitter, UX_MODE_TYPE, WhiteLabelData } from "@web3auth/auth";
import {
  BaseAdapterConfig,
  ChainNamespaceType,
  LoginMethodConfig,
  WALLET_ADAPTER_TYPE,
  WalletRegistry,
  WalletRegistryItem,
  Web3AuthNoModalEvents,
} from "@web3auth/base";

// capture whitelabel only once
export interface UIConfig extends WhiteLabelData {
  /**
   * order of how login methods are shown
   *
   * @defaultValue `["google", "facebook", "twitter", "reddit", "discord", "twitch", "apple", "line", "github", "kakao", "linkedin", "weibo", "wechat", "email_passwordless"]`
   */
  loginMethodsOrder?: string[];

  /**
   * Z-index of the modal and iframe
   * @defaultValue 99998
   */
  modalZIndex?: string;

  /**
   * Whether to show errors on Web3Auth modal.
   *
   * @defaultValue `true`
   */
  displayErrorsOnModal?: boolean;

  /**
   * number of columns to display the Social Login buttons
   *
   * @defaultValue `3`
   */
  loginGridCol?: 2 | 3;

  /**
   * Decides which button will be the focus of the modal
   * For `socialLogin` the social icon will be colored
   * For other options like `emailLogin` and `externalLogin` the respective buttons will be coverted into a primary button
   *
   * @defaultValue `socialLogin`
   */
  primaryButton?: "externalLogin" | "socialLogin" | "emailLogin";

  adapterListener: SafeEventEmitter<Web3AuthNoModalEvents>;

  /**
   * UX Mode for the auth adapter
   */
  uxMode?: UX_MODE_TYPE;
}

export interface LoginModalProps extends UIConfig {
  chainNamespace: ChainNamespaceType;
  walletRegistry: WalletRegistry;
}

export const LOGIN_MODAL_EVENTS = {
  INIT_EXTERNAL_WALLETS: "INIT_EXTERNAL_WALLETS",
  LOGIN: "LOGIN",
  DISCONNECT: "DISCONNECT",
  MODAL_VISIBILITY: "MODAL_VISIBILITY",
} as const;

export type SocialLoginsConfig = {
  loginMethodsOrder: string[];
  loginMethods: LoginMethodConfig;
  adapter: WALLET_ADAPTER_TYPE;
  uiConfig: Omit<UIConfig, "adapterListener">;
};

export const MODAL_STATUS = {
  INITIALIZED: "initialized",
  CONNECTED: "connected",
  CONNECTING: "connecting",
  ERRORED: "errored",
};
export type ModalStatusType = (typeof MODAL_STATUS)[keyof typeof MODAL_STATUS];

export interface ModalState {
  status: ModalStatusType;
  externalWalletsInitialized: boolean;
  hasExternalWallets: boolean;
  externalWalletsVisibility: boolean;
  modalVisibility: boolean;
  modalVisibilityDelayed: boolean;
  postLoadingMessage: string;
  walletConnectUri: string;
  socialLoginsConfig: SocialLoginsConfig;
  externalWalletsConfig: Record<string, BaseAdapterConfig>;
  detailedLoaderAdapter: string;
  detailedLoaderAdapterName: string;
  showExternalWalletsOnly: boolean;
  currentPage: string;
}

export type SocialLoginEventType = { adapter: string; loginParams: { loginProvider: string; login_hint?: string; name: string } };
export type ExternalWalletEventType = { adapter: string };

export const DEFAULT_LOGO_LIGHT = "https://images.web3auth.io/web3auth-logo-w.svg"; // logo used on light mode
export const DEFAULT_LOGO_DARK = "https://images.web3auth.io/web3auth-logo-w-light.svg"; // logo used on dark mode

export const WALLET_CONNECT_LOGO = "https://images.web3auth.io/login-wallet-connect.svg";

export type StateEmitterEvents = {
  STATE_UPDATED: (state: Partial<ModalState>) => void;
  MOUNTED: () => void;
};

export type ExternalButton = {
  name: string;
  displayName?: string;
  href?: string;
  hasInjectedWallet: boolean;
  hasWalletConnect: boolean;
  hasInstallLinks: boolean;
  walletRegistryItem?: WalletRegistryItem;
  imgExtension?: string;
};

export type os = "iOS" | "Android";
export type platform = "mobile" | "desktop" | "tablet";
export type browser = "chrome" | "firefox" | "edge" | "safari" | "brave";
export type mobileOs = "ios" | "android";

export interface WalletAppConfig {
  browser?: string;
  android?: string;
  ios?: string;
  chrome?: string;
  firefox?: string;
  edge?: string;
  brave?: string;
}
