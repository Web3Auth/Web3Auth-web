import OpenLogin from "@toruslabs/openlogin";
import { LoginParams, OPENLOGIN_NETWORK, OpenLoginOptions, SUPPORTED_KEY_CURVES, UX_MODE } from "@toruslabs/openlogin-utils";
import {
  ADAPTER_CATEGORY,
  ADAPTER_CATEGORY_TYPE,
  ADAPTER_EVENTS,
  ADAPTER_NAMESPACES,
  ADAPTER_STATUS,
  ADAPTER_STATUS_TYPE,
  AdapterInitOptions,
  AdapterNamespaceType,
  BaseAdapter,
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
import merge from "lodash.merge";

import { getOpenloginDefaultOptions } from "./config";
import type { LoginSettings, OpenloginAdapterOptions, PrivateKeyProvider } from "./interface";

export type OpenloginLoginParams = LoginParams & {
  // to maintain backward compatibility
  login_hint?: string;
};

export class OpenloginAdapter extends BaseAdapter<OpenloginLoginParams> {
  readonly name: string = WALLET_ADAPTERS.OPENLOGIN;

  readonly adapterNamespace: AdapterNamespaceType = ADAPTER_NAMESPACES.MULTICHAIN;

  readonly type: ADAPTER_CATEGORY_TYPE = ADAPTER_CATEGORY.IN_APP;

  public openloginInstance: OpenLogin | null = null;

  public status: ADAPTER_STATUS_TYPE = ADAPTER_STATUS.NOT_READY;

  public currentChainNamespace: ChainNamespaceType = CHAIN_NAMESPACES.EIP155;

  public privateKeyProvider: PrivateKeyProvider | null = null;

  private openloginOptions: OpenloginAdapterOptions["adapterSettings"];

  private loginSettings: LoginSettings = { loginProvider: "" };

  constructor(params: OpenloginAdapterOptions = {}) {
    super(params);
    this.setAdapterSettings({
      ...params.adapterSettings,
      chainConfig: params.chainConfig,
      clientId: params.clientId || "",
      sessionTime: params.sessionTime,
      web3AuthNetwork: params.web3AuthNetwork,
      useCoreKitKey: params.useCoreKitKey,
      privateKeyProvider: params.privateKeyProvider,
    });
    this.loginSettings = params.loginSettings || { loginProvider: "" };
    this.privateKeyProvider = params.privateKeyProvider || null;
  }

  get chainConfigProxy(): CustomChainConfig | null {
    return this.chainConfig ? { ...this.chainConfig } : null;
  }

  get provider(): IProvider | null {
    if (this.status !== ADAPTER_STATUS.NOT_READY && this.privateKeyProvider) {
      return this.privateKeyProvider;
    }
    return null;
  }

  set provider(_: IProvider | null) {
    throw new Error("Not implemented");
  }

  async init(options: AdapterInitOptions): Promise<void> {
    super.checkInitializationRequirements();
    if (!this.clientId) throw WalletInitializationError.invalidParams("clientId is required before openlogin's initialization");
    if (!this.openloginOptions) throw WalletInitializationError.invalidParams("openloginOptions is required before openlogin's initialization");
    const isRedirectResult = this.openloginOptions.uxMode === UX_MODE.REDIRECT;

    this.openloginOptions = {
      ...this.openloginOptions,
      replaceUrlOnRedirect: isRedirectResult,
      useCoreKitKey: this.useCoreKitKey,
    };
    this.openloginInstance = new OpenLogin({
      ...this.openloginOptions,
      clientId: this.clientId,
      network: this.openloginOptions.network || this.web3AuthNetwork || OPENLOGIN_NETWORK.SAPPHIRE_MAINNET,
    });
    log.debug("initializing openlogin adapter init");

    await this.openloginInstance.init();

    if (!this.chainConfig) throw WalletInitializationError.invalidParams("chainConfig is required before initialization");

    this.status = ADAPTER_STATUS.READY;
    this.emit(ADAPTER_EVENTS.READY, WALLET_ADAPTERS.OPENLOGIN);

    try {
      log.debug("initializing openlogin adapter");

      const finalPrivKey = this._getFinalPrivKey();
      // connect only if it is redirect result or if connect (adapter is cached/already connected in same session) is true
      if (finalPrivKey && (options.autoConnect || isRedirectResult)) {
        this.rehydrated = true;
        await this.connect();
      }
    } catch (error) {
      log.error("Failed to connect with cached openlogin provider", error);
      this.emit("ERRORED", error);
    }
  }

  async connect(params: OpenloginLoginParams = { loginProvider: "" }): Promise<IProvider | null> {
    super.checkConnectionRequirements();
    this.status = ADAPTER_STATUS.CONNECTING;
    this.emit(ADAPTER_EVENTS.CONNECTING, { ...params, adapter: WALLET_ADAPTERS.OPENLOGIN });
    try {
      await this.connectWithProvider(params);
      return this.provider;
    } catch (error: unknown) {
      log.error("Failed to connect with openlogin provider", error);
      // ready again to be connected
      this.status = ADAPTER_STATUS.READY;
      this.emit(ADAPTER_EVENTS.ERRORED, error);
      if ((error as Error)?.message.includes("user closed popup")) {
        throw WalletLoginError.popupClosed();
      } else if (error instanceof Web3AuthError) {
        throw error;
      }
      throw WalletLoginError.connectionError("Failed to login with openlogin");
    }
  }

  public async enableMFA(params: OpenloginLoginParams = { loginProvider: "" }): Promise<void> {
    if (this.status !== ADAPTER_STATUS.CONNECTED) throw WalletLoginError.notConnectedError("Not connected with wallet");
    if (!this.openloginInstance) throw WalletInitializationError.notReady("openloginInstance is not ready");
    try {
      await this.openloginInstance.enableMFA(params);
    } catch (error: unknown) {
      log.error("Failed to enable MFA with openlogin provider", error);
      if (error instanceof Web3AuthError) {
        throw error;
      }
      throw WalletLoginError.connectionError((error as Error).message || "Failed to enable MFA with openlogin");
    }
  }

  async disconnect(options: { cleanup: boolean } = { cleanup: false }): Promise<void> {
    if (this.status !== ADAPTER_STATUS.CONNECTED) throw WalletLoginError.notConnectedError("Not connected with wallet");
    if (!this.openloginInstance) throw WalletInitializationError.notReady("openloginInstance is not ready");
    await this.openloginInstance.logout();
    if (options.cleanup) {
      this.status = ADAPTER_STATUS.NOT_READY;
      this.openloginInstance = null;
      this.privateKeyProvider = null;
    } else {
      // ready to be connected again
      this.status = ADAPTER_STATUS.READY;
    }

    this.rehydrated = false;
    this.emit(ADAPTER_EVENTS.DISCONNECTED);
  }

  async authenticateUser(): Promise<{ idToken: string }> {
    if (this.status !== ADAPTER_STATUS.CONNECTED) throw WalletLoginError.notConnectedError("Not connected with wallet, Please login/connect first");
    const userInfo = await this.getUserInfo();
    return {
      idToken: userInfo.idToken as string,
    };
  }

  async getUserInfo(): Promise<Partial<UserInfo>> {
    if (this.status !== ADAPTER_STATUS.CONNECTED) throw WalletLoginError.notConnectedError("Not connected with wallet");
    if (!this.openloginInstance) throw WalletInitializationError.notReady("openloginInstance is not ready");
    const userInfo = this.openloginInstance.getUserInfo();
    return userInfo;
  }

  // should be called only before initialization.
  setAdapterSettings(adapterSettings: Partial<OpenLoginOptions & BaseAdapterSettings> & { privateKeyProvider?: PrivateKeyProvider }): void {
    super.setAdapterSettings(adapterSettings);
    const defaultOptions = getOpenloginDefaultOptions();
    log.info("setting adapter settings", adapterSettings);
    this.openloginOptions = merge(
      defaultOptions.adapterSettings,
      this.openloginOptions,
      adapterSettings
    ) as OpenloginAdapterOptions["adapterSettings"];
    if (adapterSettings.web3AuthNetwork) {
      this.openloginOptions.network = adapterSettings.web3AuthNetwork;
    }
    if (adapterSettings.privateKeyProvider) {
      this.privateKeyProvider = adapterSettings.privateKeyProvider;
    }
  }

  public async addChain(chainConfig: CustomChainConfig, init = false): Promise<void> {
    super.checkAddChainRequirements(chainConfig, init);
    this.privateKeyProvider?.addChain(chainConfig);
    this.addChainConfig(chainConfig);
  }

  public async switchChain(params: { chainId: number }, init = false): Promise<void> {
    super.checkSwitchChainRequirements(params, init);
    await this.privateKeyProvider?.switchChain(params);
    this.setAdapterSettings({ chainConfig: this.getChainConfig(params.chainId) as CustomChainConfig });
  }

  private _getFinalPrivKey() {
    if (!this.openloginInstance) return "";
    let finalPrivKey = this.openloginInstance.privKey;
    // coreKitKey is available only for custom verifiers by default
    if (this.useCoreKitKey) {
      // this is to check if the user has already logged in but coreKitKey is not available.
      // when useCoreKitKey is set to true.
      // This is to ensure that when there is no user session active, we don't throw an exception.
      if (this.openloginInstance.privKey && !this.openloginInstance.coreKitKey) {
        throw WalletLoginError.coreKitKeyNotFound();
      }
      finalPrivKey = this.openloginInstance.coreKitKey;
    }
    return finalPrivKey;
  }

  private _getFinalEd25519PrivKey() {
    if (!this.openloginInstance) return "";
    let finalPrivKey = this.openloginInstance.ed25519PrivKey;
    // coreKitKey is available only for custom verifiers by default
    if (this.useCoreKitKey) {
      // this is to check if the user has already logged in but coreKitKey is not available.
      // when useCoreKitKey is set to true.
      // This is to ensure that when there is no user session active, we don't throw an exception.
      if (this.openloginInstance.ed25519PrivKey && !this.openloginInstance.coreKitEd25519Key) {
        throw WalletLoginError.coreKitKeyNotFound();
      }
      finalPrivKey = this.openloginInstance.coreKitEd25519Key;
    }
    return finalPrivKey;
  }

  private async connectWithProvider(params: OpenloginLoginParams = { loginProvider: "" }): Promise<void> {
    if (!this.privateKeyProvider) throw WalletInitializationError.invalidParams("PrivateKey Provider is required before initialization");
    if (!this.openloginInstance) throw WalletInitializationError.notReady("openloginInstance is not ready");

    const keyAvailable = this._getFinalPrivKey();
    // if not logged in then login
    if (!keyAvailable || params.extraLoginOptions?.id_token) {
      if (!this.loginSettings.curve) {
        this.loginSettings.curve =
          this.currentChainNamespace === CHAIN_NAMESPACES.SOLANA ? SUPPORTED_KEY_CURVES.ED25519 : SUPPORTED_KEY_CURVES.SECP256K1;
      }
      if (!params.loginProvider && !this.loginSettings.loginProvider)
        throw WalletInitializationError.invalidParams("loginProvider is required for login");
      await this.openloginInstance.login(
        merge(this.loginSettings, params, {
          extraLoginOptions: { ...(params.extraLoginOptions || {}), login_hint: params.login_hint || params.extraLoginOptions?.login_hint },
        })
      );
    }
    let finalPrivKey = this._getFinalPrivKey();
    if (finalPrivKey) {
      if (this.currentChainNamespace === CHAIN_NAMESPACES.SOLANA) {
        finalPrivKey = this._getFinalEd25519PrivKey();
      }

      await this.privateKeyProvider.setupProvider(finalPrivKey);
      this.status = ADAPTER_STATUS.CONNECTED;
      this.emit(ADAPTER_EVENTS.CONNECTED, {
        adapter: WALLET_ADAPTERS.OPENLOGIN,
        reconnected: this.rehydrated,
        provider: this.provider,
      } as CONNECTED_EVENT_DATA);
    }
  }
}
