import { LoginParams, OpenloginUserInfo } from "@toruslabs/openlogin-utils";

import { ADAPTER_STATUS_TYPE, IProvider, UserAuthInfo } from "../adapter";
import { CustomChainConfig } from "../chain/IChainInterface";
import { IPlugin } from "../plugin";

export interface IBaseWeb3AuthHookContext {
  isConnected: boolean;
  provider: IProvider | null;
  userInfo: Partial<OpenloginUserInfo> | null;
  isMFAEnabled: boolean;
  isInitialized: boolean;
  status: ADAPTER_STATUS_TYPE | null;
  enableMFA(params?: LoginParams): Promise<void>;
  logout(params?: { cleanup: boolean }): Promise<void>;
  addAndSwitchChain(chainConfig: CustomChainConfig): Promise<void>;
  addPlugin(plugin: IPlugin): void;
  getPlugin(pluginName: string): IPlugin | null;
  authenticateUser(): Promise<UserAuthInfo>;
  addChain(chainConfig: CustomChainConfig): Promise<void>;
  switchChain(params: { chainId: number }): Promise<void>;
}

export interface IBaseWalletServicesHookContext {
  isPluginConnected: boolean;
  showWalletConnectScanner(): Promise<void>;
  showCheckout(): Promise<void>;
  showWalletUI(): Promise<void>;
}
