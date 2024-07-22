import { SafeEventEmitter } from "@toruslabs/openlogin-jrpc";
import {
  ADAPTER_EVENTS,
  ADAPTER_NAMESPACES,
  ADAPTER_STATUS,
  ADAPTER_STATUS_TYPE,
  CHAIN_NAMESPACES,
  CONNECTED_EVENT_DATA,
  CustomChainConfig,
  fetchProjectConfig,
  getChainConfig,
  IAdapter,
  IBaseProvider,
  IPlugin,
  IProvider,
  IWeb3Auth,
  IWeb3AuthCoreOptions,
  log,
  PLUGIN_EVENTS,
  PLUGIN_NAMESPACES,
  PLUGIN_STATUS,
  PROJECT_CONFIG_RESPONSE,
  storageAvailable,
  UserAuthInfo,
  UserInfo,
  WALLET_ADAPTER_TYPE,
  WALLET_ADAPTERS,
  WalletInitializationError,
  WalletLoginError,
  Web3AuthError,
} from "@web3auth/base";
import { CommonJRPCProvider } from "@web3auth/base-provider";
import { LOGIN_PROVIDER, LoginConfig, OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { type PasskeysPlugin } from "@web3auth/passkeys-pnp-plugin";
import { WalletConnectV2Adapter } from "@web3auth/wallet-connect-v2-adapter";
import clonedeep from "lodash.clonedeep";
import merge from "lodash.merge";

import { PASSKEYS_PLUGIN } from "./constants";

const ADAPTER_CACHE_KEY = "Web3Auth-cachedAdapter";
export class Web3AuthNoModal extends SafeEventEmitter implements IWeb3Auth {
  readonly coreOptions: IWeb3AuthCoreOptions;

  public connectedAdapterName: WALLET_ADAPTER_TYPE | null = null;

  public status: ADAPTER_STATUS_TYPE = ADAPTER_STATUS.NOT_READY;

  public cachedAdapter: string | null = null;

  public walletAdapters: Record<string, IAdapter<unknown>> = {};

  protected commonJRPCProvider: CommonJRPCProvider | null = null;

  private plugins: Record<string, IPlugin> = {};

  private storage: "sessionStorage" | "localStorage" = "localStorage";

  constructor(options: IWeb3AuthCoreOptions) {
    super();
    if (!options.clientId) throw WalletInitializationError.invalidParams("Please provide a valid clientId in constructor");
    if (options.enableLogging) log.enableAll();
    else log.setLevel("error");
    if (!options.privateKeyProvider && !options.chainConfig) {
      throw WalletInitializationError.invalidParams("Please provide chainConfig or privateKeyProvider");
    }
    options.chainConfig = options.chainConfig || options.privateKeyProvider.currentChainConfig;
    if (!options.chainConfig?.chainNamespace || !Object.values(CHAIN_NAMESPACES).includes(options.chainConfig?.chainNamespace))
      throw WalletInitializationError.invalidParams("Please provide a valid chainNamespace in chainConfig");
    if (options.storageKey === "session") this.storage = "sessionStorage";
    this.cachedAdapter = storageAvailable(this.storage) ? window[this.storage].getItem(ADAPTER_CACHE_KEY) : null;

    this.coreOptions = {
      ...options,
      chainConfig: {
        ...(getChainConfig(options.chainConfig?.chainNamespace, options.chainConfig?.chainId) || {}),
        ...options.chainConfig,
      },
    };
    this.subscribeToAdapterEvents = this.subscribeToAdapterEvents.bind(this);
  }

  get connected(): boolean {
    return Boolean(this.connectedAdapterName);
  }

  get provider(): IProvider | null {
    if (this.status !== ADAPTER_STATUS.NOT_READY && this.commonJRPCProvider) {
      return this.commonJRPCProvider;
    }
    return null;
  }

  set provider(_: IProvider | null) {
    throw new Error("Not implemented");
  }

  public async init(): Promise<void> {
    this.commonJRPCProvider = await CommonJRPCProvider.getProviderInstance({ chainConfig: this.coreOptions.chainConfig as CustomChainConfig });

    let projectConfig: PROJECT_CONFIG_RESPONSE;
    try {
      projectConfig = await fetchProjectConfig(this.coreOptions.clientId, this.coreOptions.web3AuthNetwork);
    } catch (e) {
      log.error("Failed to fetch project configurations", e);
      throw WalletInitializationError.notReady("failed to fetch project configurations", e);
    }

    const initPromises = Object.keys(this.walletAdapters).map(async (adapterName) => {
      this.subscribeToAdapterEvents(this.walletAdapters[adapterName]);
      // if adapter doesn't have any chain config yet then set it based on provided namespace and chainId.
      // if no chainNamespace or chainId is being provided, it will connect with mainnet.
      if (!this.walletAdapters[adapterName].chainConfigProxy) {
        const providedChainConfig = this.coreOptions.chainConfig;
        if (!providedChainConfig.chainNamespace) throw WalletInitializationError.invalidParams("Please provide chainNamespace in chainConfig");
        this.walletAdapters[adapterName].setAdapterSettings({
          chainConfig: providedChainConfig,
          sessionTime: this.coreOptions.sessionTime,
          clientId: this.coreOptions.clientId,
          web3AuthNetwork: this.coreOptions.web3AuthNetwork,
          useCoreKitKey: this.coreOptions.useCoreKitKey,
        });
      } else {
        this.walletAdapters[adapterName].setAdapterSettings({
          sessionTime: this.coreOptions.sessionTime,
          clientId: this.coreOptions.clientId,
          web3AuthNetwork: this.coreOptions.web3AuthNetwork,
          useCoreKitKey: this.coreOptions.useCoreKitKey,
        });
      }
      if (adapterName === WALLET_ADAPTERS.OPENLOGIN) {
        const openloginAdapter = this.walletAdapters[adapterName] as OpenloginAdapter;

        const { whitelabel } = projectConfig;
        this.coreOptions.uiConfig = merge(clonedeep(whitelabel), this.coreOptions.uiConfig);
        if (!this.coreOptions.uiConfig.mode) this.coreOptions.uiConfig.mode = "light";

        const { sms_otp_enabled: smsOtpEnabled, whitelist } = projectConfig;
        if (smsOtpEnabled !== undefined) {
          openloginAdapter.setAdapterSettings({
            loginConfig: {
              [LOGIN_PROVIDER.SMS_PASSWORDLESS]: {
                showOnModal: smsOtpEnabled,
                showOnDesktop: smsOtpEnabled,
                showOnMobile: smsOtpEnabled,
                showOnSocialBackupFactor: smsOtpEnabled,
              } as LoginConfig[keyof LoginConfig],
            },
          });
        }
        if (whitelist) {
          openloginAdapter.setAdapterSettings({ originData: whitelist.signed_urls });
        }

        if (this.coreOptions.privateKeyProvider) {
          if (openloginAdapter.currentChainNamespace !== this.coreOptions.privateKeyProvider.currentChainConfig.chainNamespace) {
            throw WalletInitializationError.incompatibleChainNameSpace(
              "private key provider is not compatible with provided chainNamespace for openlogin adapter"
            );
          }
          openloginAdapter.setAdapterSettings({ privateKeyProvider: this.coreOptions.privateKeyProvider });
        }
        openloginAdapter.setAdapterSettings({ whiteLabel: this.coreOptions.uiConfig });
        if (!openloginAdapter.privateKeyProvider) {
          throw WalletInitializationError.invalidParams("privateKeyProvider is required for openlogin adapter");
        }
      } else if (adapterName === WALLET_ADAPTERS.WALLET_CONNECT_V2) {
        const walletConnectAdapter = this.walletAdapters[adapterName] as WalletConnectV2Adapter;
        const { wallet_connect_enabled: walletConnectEnabled, wallet_connect_project_id: walletConnectProjectId } = projectConfig;

        if (walletConnectEnabled === false) {
          throw WalletInitializationError.invalidParams("Please enable wallet connect v2 addon on dashboard");
        }
        if (!walletConnectProjectId)
          throw WalletInitializationError.invalidParams("Invalid wallet connect project id. Please configure it on the dashboard");

        walletConnectAdapter.setAdapterSettings({
          adapterSettings: {
            walletConnectInitOptions: {
              projectId: walletConnectProjectId,
            },
          },
        });
      }

      return this.walletAdapters[adapterName].init({ autoConnect: this.cachedAdapter === adapterName }).catch((e) => log.error(e));
    });
    await Promise.all(initPromises);

    if (this.plugins[PASSKEYS_PLUGIN]) {
      await this.plugins[PASSKEYS_PLUGIN].initWithWeb3Auth(this);
    }

    if (this.status === ADAPTER_STATUS.NOT_READY) {
      this.status = ADAPTER_STATUS.READY;
      this.emit(ADAPTER_EVENTS.READY);
    }
  }

  public getAdapter(adapterName: WALLET_ADAPTER_TYPE): IAdapter<unknown> | null {
    return this.walletAdapters[adapterName] || null;
  }

  public configureAdapter(adapter: IAdapter<unknown>): Web3AuthNoModal {
    this.checkInitRequirements();
    const providedChainConfig = this.coreOptions.chainConfig;

    if (!providedChainConfig.chainNamespace) throw WalletInitializationError.invalidParams("Please provide chainNamespace in chainConfig");

    const adapterAlreadyExists = this.walletAdapters[adapter.name];
    if (adapterAlreadyExists) throw WalletInitializationError.duplicateAdapterError(`Wallet adapter for ${adapter.name} already exists`);
    if (adapter.adapterNamespace !== ADAPTER_NAMESPACES.MULTICHAIN && adapter.adapterNamespace !== providedChainConfig.chainNamespace)
      throw WalletInitializationError.incompatibleChainNameSpace(
        `This wallet adapter belongs to ${adapter.adapterNamespace} which is incompatible with currently used namespace: ${providedChainConfig.chainNamespace}`
      );

    if (
      adapter.adapterNamespace === ADAPTER_NAMESPACES.MULTICHAIN &&
      adapter.currentChainNamespace &&
      providedChainConfig.chainNamespace !== adapter.currentChainNamespace
    ) {
      // chainConfig checks are already validated in constructor so using typecast is safe here.
      adapter.setAdapterSettings({ chainConfig: providedChainConfig as CustomChainConfig });
    }

    this.walletAdapters[adapter.name] = adapter;
    return this;
  }

  public clearCache() {
    if (!storageAvailable(this.storage)) return;
    window[this.storage].removeItem(ADAPTER_CACHE_KEY);
    this.cachedAdapter = null;
  }

  public async addChain(chainConfig: CustomChainConfig): Promise<void> {
    if (this.status === ADAPTER_STATUS.CONNECTED && this.connectedAdapterName)
      return this.walletAdapters[this.connectedAdapterName].addChain(chainConfig);
    if (this.commonJRPCProvider) {
      return this.commonJRPCProvider.addChain(chainConfig);
    }
    throw WalletInitializationError.notReady(`No wallet is ready`);
  }

  public async switchChain(params: { chainId: string }): Promise<void> {
    if (this.status === ADAPTER_STATUS.CONNECTED && this.connectedAdapterName)
      return this.walletAdapters[this.connectedAdapterName].switchChain(params);
    if (this.commonJRPCProvider) {
      return this.commonJRPCProvider.switchChain(params);
    }
    throw WalletInitializationError.notReady(`No wallet is ready`);
  }

  /**
   * Connect to a specific wallet adapter
   * @param walletName - Key of the walletAdapter to use.
   */
  async connectTo<T>(walletName: WALLET_ADAPTER_TYPE, loginParams?: T): Promise<IProvider | null> {
    if (!this.walletAdapters[walletName] || !this.commonJRPCProvider)
      throw WalletInitializationError.notFound(`Please add wallet adapter for ${walletName} wallet, before connecting`);
    const provider = await this.walletAdapters[walletName].connect(loginParams);
    this.commonJRPCProvider.updateProviderEngineProxy((provider as IBaseProvider<unknown>).provider || provider);
    return this.provider;
  }

  async registerPasskey(params?: { authenticatorAttachment?: AuthenticatorAttachment; username?: string }): Promise<boolean | void> {
    const plugin = this.getPlugin(PASSKEYS_PLUGIN) as PasskeysPlugin;
    if (!plugin) throw WalletInitializationError.notFound("Please add passkeys plugin before connecting");

    const result = await plugin.registerPasskey(params);
    return result;
  }

  async loginWithPasskey(params?: { authenticatorId?: string }): Promise<IProvider | null> {
    const plugin = this.getPlugin(PASSKEYS_PLUGIN) as PasskeysPlugin;
    if (!plugin) throw WalletInitializationError.notFound("Please add passkeys plugin before connecting");

    const provider = await plugin.loginWithPasskey(params);
    return provider;
  }

  async logout(options: { cleanup: boolean } = { cleanup: false }): Promise<void> {
    if (this.status !== ADAPTER_STATUS.CONNECTED || !this.connectedAdapterName) throw WalletLoginError.notConnectedError(`No wallet is connected`);
    await this.walletAdapters[this.connectedAdapterName].disconnect(options);
  }

  async getUserInfo(): Promise<Partial<UserInfo>> {
    log.debug("Getting user info", this.status, this.connectedAdapterName);
    if (this.status !== ADAPTER_STATUS.CONNECTED || !this.connectedAdapterName) throw WalletLoginError.notConnectedError(`No wallet is connected`);
    return this.walletAdapters[this.connectedAdapterName].getUserInfo();
  }

  async enableMFA<T>(loginParams?: T): Promise<void> {
    if (this.status !== ADAPTER_STATUS.CONNECTED || !this.connectedAdapterName) throw WalletLoginError.notConnectedError(`No wallet is connected`);
    if (this.connectedAdapterName !== WALLET_ADAPTERS.OPENLOGIN)
      throw WalletLoginError.unsupportedOperation(`EnableMFA is not supported for this adapter.`);
    return this.walletAdapters[this.connectedAdapterName].enableMFA(loginParams);
  }

  async authenticateUser(): Promise<UserAuthInfo> {
    if (this.status !== ADAPTER_STATUS.CONNECTED || !this.connectedAdapterName) throw WalletLoginError.notConnectedError(`No wallet is connected`);
    return this.walletAdapters[this.connectedAdapterName].authenticateUser();
  }

  public addPlugin(plugin: IPlugin): IWeb3Auth {
    if (this.plugins[plugin.name]) throw WalletInitializationError.duplicateAdapterError(`Plugin ${plugin.name} already exist`);
    if (plugin.pluginNamespace !== PLUGIN_NAMESPACES.MULTICHAIN && plugin.pluginNamespace !== this.coreOptions.chainConfig.chainNamespace)
      throw WalletInitializationError.incompatibleChainNameSpace(
        `This plugin belongs to ${plugin.pluginNamespace} namespace which is incompatible with currently used namespace: ${this.coreOptions.chainConfig.chainNamespace}`
      );

    this.plugins[plugin.name] = plugin;
    if (this.status === ADAPTER_STATUS.CONNECTED && this.connectedAdapterName && plugin.name !== PASSKEYS_PLUGIN) {
      // web3auth is already connected. can initialize plugins
      this.connectToPlugins({ adapter: this.connectedAdapterName });
    }

    if (plugin.name === PASSKEYS_PLUGIN && (this.status === ADAPTER_STATUS.READY || this.status === ADAPTER_STATUS.CONNECTED)) {
      // this does return a Promise but we don't need to wait here.
      // as its mostly a sync function.
      this.plugins[PASSKEYS_PLUGIN].initWithWeb3Auth(this);
    }

    return this;
  }

  public getPlugin(name: string): IPlugin | null {
    return this.plugins[name] || null;
  }

  protected subscribeToAdapterEvents(walletAdapter: IAdapter<unknown>): void {
    walletAdapter.on(ADAPTER_EVENTS.CONNECTED, async (data: CONNECTED_EVENT_DATA) => {
      if (!this.commonJRPCProvider) throw WalletInitializationError.notFound(`CommonJrpcProvider not found`);
      const { provider } = data;
      this.commonJRPCProvider.updateProviderEngineProxy((provider as IBaseProvider<unknown>).provider || provider);
      this.status = ADAPTER_STATUS.CONNECTED;
      this.connectedAdapterName = data.adapter;
      this.cacheWallet(data.adapter);
      log.debug("connected", this.status, this.connectedAdapterName);
      this.connectToPlugins(data);
      this.emit(ADAPTER_EVENTS.CONNECTED, { ...data } as CONNECTED_EVENT_DATA);
    });

    walletAdapter.on(ADAPTER_EVENTS.DISCONNECTED, async (data) => {
      // get back to ready state for rehydrating.
      this.status = ADAPTER_STATUS.READY;
      if (storageAvailable(this.storage)) {
        const cachedAdapter = window[this.storage].getItem(ADAPTER_CACHE_KEY);
        if (this.connectedAdapterName === cachedAdapter) {
          this.clearCache();
        }
      }

      log.debug("disconnected", this.status, this.connectedAdapterName);
      const localPlugins = Object.values(this.plugins).filter((plugin) => plugin.name !== PASSKEYS_PLUGIN);
      await Promise.all(
        Object.values(localPlugins).map((plugin: IPlugin) => {
          return plugin.disconnect().catch((error: Web3AuthError) => {
            // swallow error if adapter doesn't supports this plugin.
            if (error.code === 5211) {
              return;
            }
            // throw error;
            log.error(error);
          });
        })
      );
      this.connectedAdapterName = null;
      this.emit(ADAPTER_EVENTS.DISCONNECTED, data);
    });
    walletAdapter.on(ADAPTER_EVENTS.CONNECTING, (data) => {
      this.status = ADAPTER_STATUS.CONNECTING;
      this.emit(ADAPTER_EVENTS.CONNECTING, data);
      log.debug("connecting", this.status, this.connectedAdapterName);
    });
    walletAdapter.on(ADAPTER_EVENTS.ERRORED, (data) => {
      this.status = ADAPTER_STATUS.ERRORED;
      this.clearCache();
      this.emit(ADAPTER_EVENTS.ERRORED, data);
      log.debug("errored", this.status, this.connectedAdapterName);
    });

    walletAdapter.on(ADAPTER_EVENTS.ADAPTER_DATA_UPDATED, (data) => {
      log.debug("adapter data updated", data);
      this.emit(ADAPTER_EVENTS.ADAPTER_DATA_UPDATED, data);
    });

    walletAdapter.on(ADAPTER_EVENTS.CACHE_CLEAR, (data) => {
      log.debug("adapter cache clear", data);
      if (storageAvailable(this.storage)) {
        this.clearCache();
      }
    });
  }

  protected subscribeToPluginEvents(plugin: IPlugin): void {
    plugin.on(PLUGIN_EVENTS.CONNECTING, (data: unknown) => {
      this.status = PLUGIN_STATUS.CONNECTING;
      this.emit(PLUGIN_EVENTS.CONNECTING, data);
    });

    plugin.on(PLUGIN_EVENTS.ERRORED, (data: unknown) => {
      this.status = PLUGIN_STATUS.ERRORED;
      this.emit(PLUGIN_EVENTS.ERRORED, data);
    });
  }

  protected checkInitRequirements(): void {
    if (this.status === ADAPTER_STATUS.CONNECTING) throw WalletInitializationError.notReady("Already pending connection");
    if (this.status === ADAPTER_STATUS.CONNECTED) throw WalletInitializationError.notReady("Already connected");
    if (this.status === ADAPTER_STATUS.READY) throw WalletInitializationError.notReady("Adapter is already initialized");
  }

  private cacheWallet(walletName: string) {
    if (!storageAvailable(this.storage)) return;
    window[this.storage].setItem(ADAPTER_CACHE_KEY, walletName);
    this.cachedAdapter = walletName;
  }

  private connectToPlugins(data: { adapter: WALLET_ADAPTER_TYPE }) {
    const localPlugins = Object.values(this.plugins).filter((plugin) => plugin.name !== PASSKEYS_PLUGIN);
    Object.values(localPlugins).map(async (plugin) => {
      try {
        if (!plugin.SUPPORTED_ADAPTERS.includes(data.adapter)) {
          return;
        }
        if (plugin.status === PLUGIN_STATUS.CONNECTED) return;
        const { openloginInstance } = this.walletAdapters[this.connectedAdapterName] as OpenloginAdapter;
        const { options, sessionId, sessionNamespace } = openloginInstance || {};
        await plugin.initWithWeb3Auth(this, options.whiteLabel);
        await plugin.connect({ sessionId, sessionNamespace });
      } catch (error: unknown) {
        // swallow error if connector adapter doesn't supports this plugin.
        if ((error as Web3AuthError).code === 5211) {
          return;
        }
        log.error(error);
      }
    });
  }
}
