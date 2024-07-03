import Torus, { LoginParams, NetworkInterface, TorusCtorArgs, TorusParams } from "@toruslabs/torus-embed";
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
import { BaseEvmAdapter } from "@web3auth/base-evm-adapter";

export interface TorusWalletOptions extends BaseAdapterSettings {
  adapterSettings?: TorusCtorArgs;
  loginSettings?: LoginParams;
  initParams?: Omit<TorusParams, "network">;
}

export class TorusWalletAdapter extends BaseEvmAdapter<never> {
  readonly name: string = WALLET_ADAPTERS.TORUS_EVM;

  readonly adapterNamespace: AdapterNamespaceType = ADAPTER_NAMESPACES.EIP155;

  readonly currentChainNamespace: ChainNamespaceType = CHAIN_NAMESPACES.EIP155;

  readonly type: ADAPTER_CATEGORY_TYPE = ADAPTER_CATEGORY.EXTERNAL;

  public status: ADAPTER_STATUS_TYPE = ADAPTER_STATUS.NOT_READY;

  public torusInstance: Torus | null = null;

  private torusWalletOptions?: TorusCtorArgs;

  private initParams?: TorusParams;

  private loginSettings?: LoginParams = {};

  constructor(params: TorusWalletOptions = {}) {
    super(params);
    this.torusWalletOptions = params.adapterSettings || {};
    this.initParams = params.initParams || {};
    this.loginSettings = params.loginSettings || {};
  }

  get provider(): IProvider | null {
    if (this.status !== ADAPTER_STATUS.NOT_READY && this.torusInstance) {
      return this.torusInstance.provider as unknown as IProvider;
    }
    return null;
  }

  set provider(_: IProvider | null) {
    throw new Error("Not implemented");
  }

  async init(options: AdapterInitOptions = {}): Promise<void> {
    await super.init(options);
    super.checkInitializationRequirements();

    const { id, blockExplorers, name, rpcUrls, nativeCurrency } = this.chainConfig as CustomChainConfig;
    const network: NetworkInterface = {
      chainId: id,
      host: rpcUrls?.default?.http?.[0],
      blockExplorer: blockExplorers?.default?.url,
      networkName: name,
      ticker: nativeCurrency?.symbol,
      tickerName: nativeCurrency?.name,
      // decimals: decimals || 18,
    };

    this.torusInstance = new Torus(this.torusWalletOptions);
    log.debug("initializing torus evm adapter init");
    await this.torusInstance.init({
      showTorusButton: false,
      ...this.initParams,
      network,
    });
    this.status = ADAPTER_STATUS.READY;
    this.emit(ADAPTER_EVENTS.READY, WALLET_ADAPTERS.TORUS_EVM);

    try {
      log.debug("initializing torus evm adapter");
      if (options.autoConnect) {
        this.rehydrated = true;
        await this.connect();
      }
    } catch (error) {
      log.error("Failed to connect with torus evm provider", error);
      this.emit(ADAPTER_EVENTS.ERRORED, error);
    }
  }

  async connect(): Promise<IProvider | null> {
    super.checkConnectionRequirements();
    if (!this.torusInstance) throw WalletInitializationError.notReady("Torus wallet is not initialized");
    this.status = ADAPTER_STATUS.CONNECTING;
    this.emit(ADAPTER_EVENTS.CONNECTING, { adapter: WALLET_ADAPTERS.TORUS_EVM });
    try {
      await this.torusInstance.login(this.loginSettings);
      const chainId = await this.torusInstance.provider.request<string>({ method: "eth_chainId" });
      if (chainId && parseInt(chainId) !== this.chainConfig.id) {
        const { id: _chainId, blockExplorers, name, rpcUrls, nativeCurrency } = this.chainConfig as CustomChainConfig;
        const network: NetworkInterface = {
          chainId: _chainId,
          host: rpcUrls?.default?.http?.[0],
          blockExplorer: blockExplorers?.default?.url,
          networkName: name,
          tickerName: nativeCurrency?.symbol,
          ticker: nativeCurrency?.name,
        };
        // in some cases when user manually switches chain and relogin then adapter will not connect to initially passed
        // chainConfig but will connect to the one that user switched to.
        // So here trying to switch network to the one that was initially passed in chainConfig.
        await this.torusInstance.setProvider({
          ...network,
        });
        const updatedChainID = await this.torusInstance.ethereum.request<string>({ method: "eth_chainId" });
        if (updatedChainID && parseInt(updatedChainID) !== this.chainConfig.id) {
          throw WalletInitializationError.fromCode(
            5000,
            `Not connected to correct chainId. Expected: ${this.chainConfig.id}, Current: ${updatedChainID}`
          );
        }
      }
      this.status = ADAPTER_STATUS.CONNECTED;
      this.torusInstance.showTorusButton();
      this.emit(ADAPTER_STATUS.CONNECTED, { adapter: WALLET_ADAPTERS.TORUS_EVM, reconnected: this.rehydrated } as CONNECTED_EVENT_DATA);
      return this.provider;
    } catch (error) {
      // ready again to be connected
      this.status = ADAPTER_STATUS.READY;
      this.rehydrated = false;
      this.emit(ADAPTER_STATUS.ERRORED, error);
      throw error instanceof Web3AuthError ? error : WalletLoginError.connectionError("Failed to login with torus wallet");
    }
  }

  async disconnect(options: { cleanup: boolean } = { cleanup: false }): Promise<void> {
    await super.disconnectSession();
    if (!this.torusInstance) throw WalletInitializationError.notReady("Torus wallet is not initialized");
    await this.torusInstance.logout();
    this.torusInstance.hideTorusButton();
    if (options.cleanup) {
      this.status = ADAPTER_STATUS.NOT_READY;
      this.torusInstance = null;
    } else {
      // ready to be connected again
      this.status = ADAPTER_STATUS.READY;
    }
    await super.disconnect();
  }

  async getUserInfo(): Promise<Partial<UserInfo>> {
    if (this.status !== ADAPTER_STATUS.CONNECTED) throw WalletLoginError.notConnectedError("Not connected with wallet");
    if (!this.torusInstance) throw WalletInitializationError.notReady("Torus wallet is not initialized");
    const userInfo = await this.torusInstance.getUserInfo("");
    return userInfo;
  }

  public async addChain(chainConfig: CustomChainConfig, init = false): Promise<void> {
    super.checkAddChainRequirements(chainConfig, init);
    // TODO: add these in torus wallet.
    // await this.torusInstance?.provider.request({
    //   method: "wallet_addEthereumChain",
    //   params: [
    //     {
    //       chainId: chainConfig.chainId,
    //       chainName: chainConfig.displayName,
    //       rpcUrls: [chainConfig.rpcTarget],
    //       blockExplorerUrls: [chainConfig.blockExplorer],
    //       nativeCurrency: {
    //         name: chainConfig.tickerName,
    //         symbol: chainConfig.ticker,
    //         decimals: chainConfig.decimals || 18,
    //       },
    //     },
    //   ],
    // });
    this.addChainConfig(chainConfig);
  }

  public async switchChain(params: { chainId: number }, init = false): Promise<void> {
    super.checkSwitchChainRequirements(params, init);
    // TODO: add these in torus wallet.
    // await this.torusInstance?.provider.request({
    //   method: "wallet_switchEthereumChain",
    //   params: [{ chainId: params.chainId }],
    // });
    const chainConfig = this.getChainConfig(params.chainId) as CustomChainConfig;
    await this.torusInstance?.setProvider({
      host: chainConfig.rpcUrls?.default?.http?.[0],
      chainId: chainConfig.id,
      networkName: chainConfig.name,
      blockExplorer: chainConfig.blockExplorers?.default?.url,
      ticker: chainConfig.nativeCurrency?.symbol,
      tickerName: chainConfig.nativeCurrency?.name,
    });
    this.setAdapterSettings({ chainConfig: this.getChainConfig(params.chainId) as CustomChainConfig });
  }

  public async enableMFA(): Promise<void> {
    throw new Error("Method Not implemented");
  }
}
