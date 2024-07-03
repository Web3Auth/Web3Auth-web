import {
  ADAPTER_CATEGORY,
  ADAPTER_CATEGORY_TYPE,
  ADAPTER_EVENTS,
  ADAPTER_NAMESPACES,
  ADAPTER_STATUS,
  ADAPTER_STATUS_TYPE,
  AdapterInitOptions,
  AdapterNamespaceType,
  BaseAdapterSettings,
  CHAIN_NAMESPACES,
  ChainNamespaceType,
  CONNECTED_EVENT_DATA,
  CustomChainConfig,
  IProvider,
  log,
  UserInfo,
  WALLET_ADAPTERS,
  WalletInitializationError,
  WalletLoginError,
  Web3AuthError,
} from "@web3auth/base";
import { BaseSolanaAdapter } from "@web3auth/base-solana-adapter";
import { ISlopeProvider, SlopeInjectedProxyProvider } from "@web3auth/solana-provider";

import { detectProvider } from "./utils";

export type SlopeWalletOptions = BaseAdapterSettings;

export class SlopeAdapter extends BaseSolanaAdapter<void> {
  readonly name: string = WALLET_ADAPTERS.SLOPE;

  readonly adapterNamespace: AdapterNamespaceType = ADAPTER_NAMESPACES.SOLANA;

  readonly currentChainNamespace: ChainNamespaceType = CHAIN_NAMESPACES.SOLANA;

  readonly type: ADAPTER_CATEGORY_TYPE = ADAPTER_CATEGORY.EXTERNAL;

  public status: ADAPTER_STATUS_TYPE = ADAPTER_STATUS.NOT_READY;

  public _wallet: ISlopeProvider | null = null;

  private slopeProxyProvider: SlopeInjectedProxyProvider | null = null;

  get isWalletConnected(): boolean {
    return this.status === ADAPTER_STATUS.CONNECTED;
  }

  get provider(): IProvider | null {
    if (this.status !== ADAPTER_STATUS.NOT_READY && this.slopeProxyProvider) {
      return this.slopeProxyProvider;
    }
    return null;
  }

  set provider(_: IProvider | null) {
    throw new Error("Not implemented");
  }

  async init(options: AdapterInitOptions = {}): Promise<void> {
    await super.init(options);
    super.checkInitializationRequirements();
    this._wallet = await detectProvider({ interval: 500, count: 3 });
    if (!this._wallet) throw WalletInitializationError.notInstalled();
    this.slopeProxyProvider = new SlopeInjectedProxyProvider({ config: { chainConfig: this.chainConfig as CustomChainConfig } });
    this.status = ADAPTER_STATUS.READY;
    this.emit(ADAPTER_EVENTS.READY, WALLET_ADAPTERS.SLOPE);

    try {
      log.debug("initializing slope adapter");
      if (options.autoConnect) {
        this.rehydrated = true;
        await this.connect();
      }
    } catch (error) {
      log.error("Failed to connect with cached slope provider", error);
      this.emit("ERRORED", error);
    }
  }

  async connect(): Promise<IProvider | null> {
    try {
      super.checkConnectionRequirements();
      this.status = ADAPTER_STATUS.CONNECTING;
      this.emit(ADAPTER_EVENTS.CONNECTING, { adapter: WALLET_ADAPTERS.SLOPE });

      if (!this._wallet) throw WalletInitializationError.notInstalled();
      try {
        const { data, msg } = await this._wallet.connect();
        if (!data.publicKey) throw WalletLoginError.connectionError(`No public key found: ${msg}`);
        await this.connectWithProvider(this._wallet);
      } catch (error: unknown) {
        if (error instanceof Web3AuthError) throw error;
        throw WalletLoginError.connectionError((error as Error)?.message);
      }

      return this.provider;
    } catch (error: unknown) {
      // ready again to be connected
      this.status = ADAPTER_STATUS.READY;
      this.rehydrated = false;
      this.emit(ADAPTER_EVENTS.ERRORED, error);
      throw error;
    }
  }

  async disconnect(options: { cleanup: boolean } = { cleanup: false }): Promise<void> {
    await super.disconnectSession();
    try {
      await this._wallet?.disconnect();
      if (options.cleanup) {
        this.status = ADAPTER_STATUS.NOT_READY;
        this.slopeProxyProvider = null;
        this._wallet = null;
      }
      await super.disconnect();
    } catch (error: unknown) {
      this.emit(ADAPTER_EVENTS.ERRORED, WalletLoginError.disconnectionError((error as Error)?.message));
    }
  }

  async getUserInfo(): Promise<Partial<UserInfo>> {
    if (!this.isWalletConnected) throw WalletLoginError.notConnectedError("Not connected with wallet, Please login/connect first");
    return {};
  }

  public async addChain(chainConfig: CustomChainConfig, init = false): Promise<void> {
    super.checkAddChainRequirements(chainConfig, init);
    this.slopeProxyProvider?.addChain(chainConfig);
    this.addChainConfig(chainConfig);
  }

  public async enableMFA(): Promise<void> {
    throw new Error("Method Not implemented");
  }

  public async switchChain(params: { chainId: number }, init = false): Promise<void> {
    super.checkSwitchChainRequirements(params, init);
    await this.slopeProxyProvider?.switchChain(params);
    this.setAdapterSettings({ chainConfig: this.getChainConfig(params.chainId) as CustomChainConfig });
  }

  private async connectWithProvider(injectedProvider: ISlopeProvider): Promise<IProvider | null> {
    if (!this.slopeProxyProvider) throw WalletLoginError.connectionError("No Slope provider found");
    await this.slopeProxyProvider.setupProvider(injectedProvider);
    this.status = ADAPTER_STATUS.CONNECTED;
    this.emit(ADAPTER_EVENTS.CONNECTED, {
      adapter: WALLET_ADAPTERS.SLOPE,
      reconnected: this.rehydrated,
      provider: this.provider,
    } as CONNECTED_EVENT_DATA);
    return this.provider;
  }

  private _onDisconnect = () => {
    if (this._wallet) {
      this._wallet.off("disconnect", this._onDisconnect);
      this.rehydrated = false;
      // ready to be connected again only if it was previously connected and not cleaned up
      this.status = this.status === ADAPTER_STATUS.CONNECTED ? ADAPTER_STATUS.READY : ADAPTER_STATUS.NOT_READY;
      this.emit(ADAPTER_EVENTS.DISCONNECTED);
    }
  };
}
