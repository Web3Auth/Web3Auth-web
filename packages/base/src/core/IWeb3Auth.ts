import { SafeEventEmitter } from "@toruslabs/openlogin-jrpc";
import { WhiteLabelData } from "@toruslabs/openlogin-utils";

import { ADAPTER_STATUS_TYPE, IAdapter, IBaseProvider, IProvider, OPENLOGIN_NETWORK_TYPE, UserAuthInfo, UserInfo } from "../adapter/IAdapter";
import { CustomChainConfig } from "../chain/IChainInterface";
import { type IPlugin } from "../plugin";
import { WALLET_ADAPTER_TYPE } from "../wallet";

export interface IWeb3AuthCoreOptions {
  /**
   * Client id for web3auth.
   * You can obtain your client id from the web3auth developer dashboard.
   * You can set any random string for this on localhost.
   */
  clientId: string;
  /**
   * custom chain configuration for chainNamespace
   *
   * @defaultValue mainnet config of provided chainNamespace
   */
  chainConfig?: CustomChainConfig;

  /**
   * setting to true will enable logs
   *
   * @defaultValue false
   */
  enableLogging?: boolean;
  /**
   * setting to "local" will persist social login session accross browser tabs.
   *
   * @defaultValue "local"
   */
  storageKey?: "session" | "local";

  /**
   * sessionTime (in seconds) for idToken issued by Web3Auth for server side verification.
   * @defaultValue 86400
   *
   * Note: max value can be 7 days (86400 * 7) and min can be  1 day (86400)
   */
  sessionTime?: number;
  /**
   * Web3Auth Network to use for the session & the issued idToken
   * @defaultValue mainnet
   */
  web3AuthNetwork?: OPENLOGIN_NETWORK_TYPE;

  /**
   * Uses core-kit key with web3auth provider
   * @defaultValue false
   */
  useCoreKitKey?: boolean;

  /**
   * WhiteLabel options for web3auth
   */
  uiConfig?: WhiteLabelData;

  /**
   * Private key provider for your chain namespace
   */
  privateKeyProvider?: IBaseProvider<string>;
}

export interface IWeb3AuthCore extends SafeEventEmitter {
  readonly coreOptions: IWeb3AuthCoreOptions;
  connectedAdapterName: string | null;
  status: ADAPTER_STATUS_TYPE;
  provider: IProvider | null;
  init(): Promise<void>;
  logout(options?: { cleanup: boolean }): Promise<void>;
  getUserInfo(): Promise<Partial<UserInfo>>;
  authenticateUser(): Promise<UserAuthInfo>;
  addChain(chainConfig: CustomChainConfig): Promise<void>;
  switchChain(params: { chainId: string }): Promise<void>;
  addPlugin(plugin: IPlugin): void;
  getPlugin(pluginName: string): IPlugin | null;
}

export interface IWeb3Auth extends IWeb3AuthCore {
  connected: boolean;
  cachedAdapter: string | null;
  walletAdapters: Record<string, IAdapter<unknown>>;
  getAdapter(adapterName: WALLET_ADAPTER_TYPE): IAdapter<unknown> | null;
  configureAdapter(adapter: IAdapter<unknown>): IWeb3Auth;
  /**
   * Connect to a specific wallet adapter
   * @param walletName - Key of the walletAdapter to use.
   */
  connectTo<T>(walletName: WALLET_ADAPTER_TYPE, loginParams?: T): Promise<IProvider | null>;
  enableMFA<T>(params: T): Promise<void>;

  registerPasskey(params?: { authenticatorAttachment: AuthenticatorAttachment; username: string }): Promise<boolean | void>;
  loginWithPasskey(params?: { authenticatorId: string }): Promise<IProvider>;
}

export type Web3AuthNoModalOptions = IWeb3AuthCoreOptions;
