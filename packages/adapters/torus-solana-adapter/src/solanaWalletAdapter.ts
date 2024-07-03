import Torus, { NetworkInterface, TorusCtorArgs, TorusLoginParams, TorusParams } from "@toruslabs/solana-embed";
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
import { ITorusWalletProvider, TorusInjectedProvider } from "@web3auth/solana-provider";

export interface SolanaWalletOptions extends BaseAdapterSettings {
  adapterSettings?: TorusCtorArgs;
  loginSettings?: TorusLoginParams;
  initParams?: Omit<TorusParams, "network">;
}

export class SolanaWalletAdapter extends BaseSolanaAdapter<void> {
  readonly name: string = WALLET_ADAPTERS.TORUS_SOLANA;

  readonly adapterNamespace: AdapterNamespaceType = ADAPTER_NAMESPACES.SOLANA;

  readonly currentChainNamespace: ChainNamespaceType = CHAIN_NAMESPACES.SOLANA;

  readonly type: ADAPTER_CATEGORY_TYPE = ADAPTER_CATEGORY.EXTERNAL;

  public status: ADAPTER_STATUS_TYPE = ADAPTER_STATUS.NOT_READY;

  public torusInstance: Torus | null = null;

  private torusWalletOptions?: TorusCtorArgs;

  private initParams?: TorusParams;

  private loginSettings?: TorusLoginParams = {};

  private solanaProvider: TorusInjectedProvider | null = null;

  constructor(params: SolanaWalletOptions = {}) {
    super(params);
    this.torusWalletOptions = params.adapterSettings || {};
    this.initParams = params.initParams || {};
    this.loginSettings = params.loginSettings || {};
  }

  get provider(): IProvider | null {
    if (this.status !== ADAPTER_STATUS.NOT_READY && this.solanaProvider) {
      return this.solanaProvider;
    }
    return null;
  }

  set provider(_: IProvider | null) {
    throw new Error("Not implemented");
  }

  async init(options: AdapterInitOptions = {}): Promise<void> {
    await super.init(options);
    super.checkInitializationRequirements();
    const { id: chainId, blockExplorers, name, rpcUrls, nativeCurrency, logo } = this.chainConfig as CustomChainConfig;
    const network: NetworkInterface = {
      chainId: chainId.toString(16),
      rpcTarget: rpcUrls?.default?.http?.[0],
      blockExplorerUrl: blockExplorers?.default?.url,
      displayName: name,
      tickerName: nativeCurrency?.symbol,
      ticker: nativeCurrency?.name,
      logo,
    };

    this.torusInstance = new Torus(this.torusWalletOptions);
    log.debug("initializing torus solana adapter init");
    await this.torusInstance.init({ showTorusButton: false, ...this.initParams, network });

    this.solanaProvider = new TorusInjectedProvider({
      config: {
        chainConfig: this.chainConfig as CustomChainConfig,
      },
    });
    this.status = ADAPTER_STATUS.READY;
    this.emit(ADAPTER_EVENTS.READY, WALLET_ADAPTERS.TORUS_SOLANA);

    try {
      log.debug("initializing torus solana adapter");
      if (options.autoConnect) {
        this.rehydrated = true;
        await this.connect();
      }
    } catch (error) {
      log.error("Failed to connect with cached torus solana provider", error);
      this.emit(ADAPTER_EVENTS.ERRORED, error);
    }
  }

  async connect(): Promise<IProvider | null> {
    super.checkConnectionRequirements();
    if (!this.torusInstance) throw WalletInitializationError.notReady("Torus wallet is not initialized");
    if (!this.solanaProvider) throw WalletInitializationError.notReady("Torus wallet is not initialized");
    this.status = ADAPTER_STATUS.CONNECTING;
    this.emit(ADAPTER_EVENTS.CONNECTING, { adapter: WALLET_ADAPTERS.TORUS_SOLANA });
    try {
      await this.torusInstance.login(this.loginSettings);
      try {
        const torusInpageProvider = this.torusInstance.provider as unknown as ITorusWalletProvider;
        torusInpageProvider.sendTransaction = this.torusInstance.sendTransaction.bind(this.torusInstance);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        torusInpageProvider.signAllTransactions = this.torusInstance.signAllTransactions.bind(this.torusInstance);
        torusInpageProvider.signMessage = this.torusInstance.signMessage.bind(this.torusInstance);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        torusInpageProvider.signTransaction = this.torusInstance.signTransaction.bind(this.torusInstance);
        await this.solanaProvider.setupProvider(torusInpageProvider);
      } catch (error: unknown) {
        // some issue in solana wallet, always connecting to mainnet on init.
        // fallback to change network if not connected to correct one on login.
        if (error instanceof Web3AuthError && error.code === 5010) {
          const { id: chainId, blockExplorers, name, rpcUrls, nativeCurrency, logo } = this.chainConfig as CustomChainConfig;
          const network: NetworkInterface = {
            chainId: chainId.toString(16),
            rpcTarget: rpcUrls?.default?.http?.[0],
            blockExplorerUrl: blockExplorers?.default?.url,
            displayName: name,
            tickerName: nativeCurrency?.symbol,
            ticker: nativeCurrency?.name,
            logo,
          };
          await this.torusInstance.setProvider(network);
        } else {
          throw error;
        }
      }
      this.status = ADAPTER_STATUS.CONNECTED;
      this.torusInstance.showTorusButton();
      this.emit(ADAPTER_STATUS.CONNECTED, { adapter: WALLET_ADAPTERS.TORUS_SOLANA, reconnected: this.rehydrated } as CONNECTED_EVENT_DATA);
      return this.provider;
    } catch (error) {
      // ready again to be connected
      this.status = ADAPTER_STATUS.READY;
      this.rehydrated = false;
      this.emit(ADAPTER_EVENTS.ERRORED, error);
      if (error instanceof Web3AuthError) throw error;
      throw WalletLoginError.connectionError("Failed to login with torus solana wallet");
    }
  }

  async disconnect(options: { cleanup: boolean } = { cleanup: false }): Promise<void> {
    await super.disconnectSession();
    if (!this.torusInstance) throw WalletInitializationError.notReady("Torus wallet is not initialized");
    await this.torusInstance.logout();
    if (options.cleanup) {
      // ready to connect again
      this.status = ADAPTER_STATUS.NOT_READY;
      this.torusInstance = null;
      this.solanaProvider = null;
    } else {
      // ready to connect again
      this.status = ADAPTER_STATUS.READY;
    }
    await super.disconnect();
  }

  async getUserInfo(): Promise<Partial<UserInfo>> {
    if (this.status !== ADAPTER_STATUS.CONNECTED) throw WalletLoginError.notConnectedError("Not connected with wallet");
    if (!this.torusInstance) throw WalletInitializationError.notReady("Torus wallet is not initialized");
    const userInfo = await this.torusInstance.getUserInfo();
    return userInfo;
  }

  public async addChain(chainConfig: CustomChainConfig, init = false): Promise<void> {
    super.checkAddChainRequirements(chainConfig, init);
    // await this.solanaProvider?.addChain(chainConfig);
    this.addChainConfig(chainConfig);
  }

  public async switchChain(params: { chainId: number }, init = false): Promise<void> {
    super.checkSwitchChainRequirements(params, init);
    const chainConfig = this.getChainConfig(params.chainId) as CustomChainConfig;
    await this.torusInstance?.setProvider({
      rpcTarget: chainConfig.rpcUrls?.default?.http?.[0],
      chainId: chainConfig.id.toString(16),
      displayName: chainConfig.name,
      blockExplorerUrl: chainConfig.blockExplorers?.default?.url,
      ticker: chainConfig.nativeCurrency?.name,
      tickerName: chainConfig.nativeCurrency?.symbol,
      logo: chainConfig.logo || "https://images.web3auth.io/login-torus-solana.svg",
    });
    this.setAdapterSettings({ chainConfig: this.getChainConfig(params.chainId) as CustomChainConfig });
  }

  public async enableMFA(): Promise<void> {
    throw new Error("Method Not implemented");
  }
}
