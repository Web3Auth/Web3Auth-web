import { type BUILD_ENV_TYPE, OpenloginSessionData } from "@toruslabs/openlogin-utils";
import { type RegisterPasskeyModal } from "@web3auth/ui";
export interface PasskeyServiceEndpoints {
  register: {
    options: string;
    verify: string;
  };
  authenticate: {
    options: string;
    verify: string;
  };
  crud: {
    list: string;
  };
}

export interface TorusSubVerifierInfo {
  verifier: string;
  idToken: string;
}

export interface PasskeyExtraVerifierParams extends Record<string, string> {
  signature: string; // LOGIN
  clientDataJSON: string; // LOGIN
  authenticatorData: string; // LOGIN
  publicKey: string; // REGISTER
  challenge: string; // LOGIN
  rpId: string; // LOGIN/REGISTER
  credId: string; // LOGIN/REGISTER
}

export interface LoginParams {
  verifier: string;
  verifierId: string;
  idToken: string;
  subVerifierInfoArray?: TorusSubVerifierInfo[];
  // offset in seconds
  serverTimeOffset?: number;
  extraVerifierParams: PasskeyExtraVerifierParams;
}

export interface RegisterPasskeyParams {
  /**
   * The passkey in the user device will be saved with this name.
   *
   * @defaultValue loginProvider|verifierId
   */
  username?: string;
  /**
   * This option, if set, restricts the type of authenticators that can be registered.
   *
   * @defaultValue undefined.
   */
  authenticatorAttachment?: AuthenticatorAttachment;
}

export interface IPasskeysPluginOptions {
  buildEnv?: BUILD_ENV_TYPE;
  /**
   * `rpID` should be your app domain.
   *
   * If your app is hosted on "your.app.xyz" the RPID can be "your.app.xyz" or "app.xyz".
   *
   * Be aware: if you create passkeys on "your.app.xyz", they won't be usable on other subdomains (e.g. "other.app.xyz").
   * So unless you have good reasons not to, use the top-level domain as the RPID.
   *
   * `rpID` will show up in the initial registration popup:
   *
   * @defaultValue tld
   */
  rpID?: string;
  /**
   * `rpName` doesn't show up in the popup so can be set to anything.
   *
   * We recommend setting it to the correctly capitalized name of your app,
   * in case browsers start showing it in their native UIs in the future.
   *
   * @defaultValue window.title || window.location.hostname
   */
  rpName?: string;

  /**
   * register flow modal to show before registering a passkey.
   */
  registerFlowModal?: RegisterPasskeyModal;
}
export interface ExternalAuthTokenPayload {
  iat: number;
  aud: string;
  nonce: string;
  iss: string;
  wallets: Array<{ public_key: string; type: string; curve: string }>;
  email?: string;
  name?: string;
  profileImage?: string;
  verifier?: string;
  verifierId?: string;
  aggregateVerifier?: string;
  typeOfLogin?: string;
}

export type EncryptedMetadata = { state: OpenloginSessionData; jwtTokenPayload: { wallets: ExternalAuthTokenPayload["wallets"] } };
