import { SafeEventEmitter } from "@toruslabs/openlogin-jrpc";
import { UX_MODE_TYPE, WhiteLabelData } from "@toruslabs/openlogin-utils";
import { BaseAdapterConfig, IWalletConnectExtensionAdapter, LoginMethodConfig, WALLET_ADAPTER_TYPE } from "@web3auth/base";

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

  adapterListener: SafeEventEmitter;

  /**
   * UX Mode for the openlogin adapter
   */
  uxMode?: UX_MODE_TYPE;
}

export const LOGIN_MODAL_EVENTS = {
  INIT_EXTERNAL_WALLETS: "INIT_EXTERNAL_WALLETS",
  LOGIN: "LOGIN",
  DISCONNECT: "DISCONNECT",
  MODAL_VISIBILITY: "MODAL_VISIBILITY",
  PASSKEY_LOGIN: "PASSKEY_LOGIN",
  PASSKEY_REGISTER: "PASSKEY_REGISTER",
};

export const PASSKEY_MODAL_EVENTS = {
  PASSKEY_MODAL_VISIBILITY: "PASSKEY_MODAL_VISIBILITY",
};

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
  wcAdapters: IWalletConnectExtensionAdapter[];
  hasPasskeyEnabled: boolean;
}

export type SocialLoginEventType = { adapter: string; loginParams: { loginProvider: string; login_hint?: string; name: string } };
export type ExternalWalletEventType = { adapter: string };

export const DEFAULT_LOGO_LIGHT = "https://images.web3auth.io/web3auth-logo-w.svg"; // logo used on light mode
export const DEFAULT_LOGO_DARK = "https://images.web3auth.io/web3auth-logo-w-light.svg"; // logo used on dark mode

export const WALLET_CONNECT_LOGO = "https://images.web3auth.io/login-wallet-connect.svg";
