import { BaseRedirectParams, LoginParams, OpenLoginOptions } from "@toruslabs/openlogin-utils";
import { BaseAdapterSettings, IBaseProvider } from "@web3auth/base";

export type LoginSettings = Partial<LoginParams> & Partial<BaseRedirectParams>;

type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> & Partial<Pick<Type, Key>>;

export type PrivateKeyProvider = IBaseProvider<string>;

export interface OpenloginAdapterOptions extends BaseAdapterSettings {
  adapterSettings?: MakeOptional<OpenLoginOptions, "clientId" | "network">;
  loginSettings?: LoginSettings;
  privateKeyProvider?: PrivateKeyProvider;
}

export interface ExternalAuthTokenPayload extends Record<string, unknown> {
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

export * from "@toruslabs/openlogin-utils";
export { type LoginConfig } from "@toruslabs/openlogin-utils";
