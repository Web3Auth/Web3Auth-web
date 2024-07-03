import Client from "@walletconnect/sign-client";
import { SessionTypes } from "@walletconnect/types";
import { getSdkError, isValidArray } from "@walletconnect/utils";
import {
  ADAPTER_CATEGORY,
  ADAPTER_CATEGORY_TYPE,
  ADAPTER_EVENTS,
  ADAPTER_NAMESPACES,
  ADAPTER_STATUS,
  ADAPTER_STATUS_TYPE,
  AdapterInitOptions,
  AdapterNamespaceType,
  CHAIN_NAMESPACES,
  ChainNamespaceType,
  CONNECTED_EVENT_DATA,
  CustomChainConfig,
  IProvider,
  log,
  UserInfo,
  WALLET_ADAPTERS,
  WalletConnectV2Data,
  WalletInitializationError,
  WalletLoginError,
  Web3AuthError,
} from "@web3auth/base";
import { BaseEvmAdapter } from "@web3auth/base-evm-adapter";
import merge from "lodash.merge";

import { getWalletConnectV2Settings, WALLET_CONNECT_EXTENSION_ADAPTERS } from "./config";
import { WalletConnectV2AdapterOptions } from "./interface";
import { WalletConnectV2Provider } from "./WalletConnectV2Provider";

class WalletConnectV2Adapter extends BaseEvmAdapter<void> {
  readonly name: string = WALLET_ADAPTERS.WALLET_CONNECT_V2;

  readonly adapterNamespace: AdapterNamespaceType = ADAPTER_NAMESPACES.EIP155;

  readonly currentChainNamespace: ChainNamespaceType = CHAIN_NAMESPACES.EIP155;

  readonly type: ADAPTER_CATEGORY_TYPE = ADAPTER_CATEGORY.EXTERNAL;

  adapterOptions: WalletConnectV2AdapterOptions = {};

  public status: ADAPTER_STATUS_TYPE = ADAPTER_STATUS.NOT_READY;

  public adapterData: WalletConnectV2Data = {
    uri: "",
    extensionAdapters: WALLET_CONNECT_EXTENSION_ADAPTERS,
  };

  public connector: Client | null = null;

  public activeSession: SessionTypes.Struct | null = null;

  private wcProvider: WalletConnectV2Provider | null = null;

  constructor(options: WalletConnectV2AdapterOptions = {}) {
    super(options);
    this.adapterOptions = { ...options };
    this.setAdapterSettings(options);
  }

  get connected(): boolean {
    return !!this.activeSession;
  }

  get provider(): IProvider | null {
    if (this.status !== ADAPTER_STATUS.NOT_READY && this.wcProvider) {
      return this.wcProvider;
    }
    return null;
  }

  set provider(_: IProvider | null) {
    throw new Error("Not implemented");
  }

  async init(options: AdapterInitOptions): Promise<void> {
    await super.init();
    super.checkInitializationRequirements();
    const projectId = this.adapterOptions.adapterSettings?.walletConnectInitOptions?.projectId;
    if (!projectId) {
      throw WalletInitializationError.invalidParams("Wallet connect project id is required in wallet connect v2 adapter");
    }

    const wc2Settings = await getWalletConnectV2Settings(
      this.chainConfig?.chainNamespace as ChainNamespaceType,
      [this.chainConfig?.id?.toString(16)],
      projectId
    );
    if (!this.adapterOptions.loginSettings || Object.keys(this.adapterOptions.loginSettings).length === 0) {
      this.adapterOptions.loginSettings = wc2Settings.loginSettings;
    }

    this.adapterOptions.adapterSettings = merge(wc2Settings.adapterSettings, this.adapterOptions.adapterSettings);

    const { adapterSettings } = this.adapterOptions;
    this.connector = await Client.init(adapterSettings?.walletConnectInitOptions);
    this.wcProvider = new WalletConnectV2Provider({
      config: { chainConfig: this.chainConfig as CustomChainConfig },
      connector: this.connector,
    });

    this.emit(ADAPTER_EVENTS.READY, WALLET_ADAPTERS.WALLET_CONNECT_V2);
    this.status = ADAPTER_STATUS.READY;
    log.debug("initializing wallet connect v2 adapter");
    if (options.autoConnect) {
      await this.checkForPersistedSession();

      if (this.connected) {
        this.rehydrated = true;
        try {
          await this.onConnectHandler();
        } catch (error) {
          log.error("wallet auto connect", error);
          this.emit(ADAPTER_EVENTS.ERRORED, error);
        }
      } else {
        this.status = ADAPTER_STATUS.NOT_READY;
        this.emit(ADAPTER_EVENTS.CACHE_CLEAR);
      }
    }
  }

  async connect(): Promise<IProvider | null> {
    super.checkConnectionRequirements();
    if (!this.connector) throw WalletInitializationError.notReady("Wallet adapter is not ready yet");
    try {
      // if already connected
      if (this.connected) {
        await this.onConnectHandler();
        return this.provider;
      }

      if (this.status !== ADAPTER_STATUS.CONNECTING) {
        await this.createNewSession();
      }
      return this.provider;
    } catch (error) {
      log.error("Wallet connect v2 adapter error while connecting", error);
      // ready again to be connected
      this.status = ADAPTER_STATUS.READY;
      this.rehydrated = true;
      this.emit(ADAPTER_EVENTS.ERRORED, error);

      const finalError =
        error instanceof Web3AuthError
          ? error
          : WalletLoginError.connectionError(`Failed to login with wallet connect: ${(error as Error)?.message || ""}`);
      throw finalError;
    }
  }

  // should be called only before initialization.
  setAdapterSettings(adapterSettings: Partial<WalletConnectV2AdapterOptions>): void {
    super.setAdapterSettings(adapterSettings);
    const { qrcodeModal, walletConnectInitOptions } = adapterSettings?.adapterSettings || {};

    this.adapterOptions = {
      ...this.adapterOptions,
      adapterSettings: this.adapterOptions?.adapterSettings ?? {},
      loginSettings: this.adapterOptions?.loginSettings ?? {},
    };

    if (qrcodeModal) this.adapterOptions.adapterSettings.qrcodeModal = qrcodeModal;
    if (walletConnectInitOptions)
      this.adapterOptions.adapterSettings.walletConnectInitOptions = {
        ...(this.adapterOptions.adapterSettings.walletConnectInitOptions ?? {}),
        ...walletConnectInitOptions,
      };

    const { loginSettings } = adapterSettings;
    if (loginSettings) this.adapterOptions.loginSettings = { ...(this.adapterOptions.loginSettings || {}), ...loginSettings };
  }

  public async addChain(chainConfig: CustomChainConfig, init = false): Promise<void> {
    super.checkAddChainRequirements(chainConfig, init);
    await this.wcProvider?.addChain(chainConfig);
    this.addChainConfig(chainConfig);
  }

  public async switchChain(params: { chainId: number }, init = false): Promise<void> {
    super.checkSwitchChainRequirements(params, init);
    await this.wcProvider?.switchChain({ chainId: params.chainId });
    this.setAdapterSettings({ chainConfig: this.getChainConfig(params.chainId) as CustomChainConfig });
  }

  async getUserInfo(): Promise<Partial<UserInfo>> {
    if (!this.connected) throw WalletLoginError.notConnectedError("Not connected with wallet, Please login/connect first");
    return {};
  }

  async disconnect(options: { cleanup: boolean } = { cleanup: false }): Promise<void> {
    await super.disconnectSession();
    const { cleanup } = options;
    if (!this.connector || !this.connected || !this.activeSession?.topic) throw WalletLoginError.notConnectedError("Not connected with wallet");
    await this.connector.disconnect({ topic: this.activeSession?.topic, reason: getSdkError("USER_DISCONNECTED") });
    this.rehydrated = false;
    if (cleanup) {
      this.connector = null;
      this.status = ADAPTER_STATUS.NOT_READY;
      this.wcProvider = null;
    } else {
      // ready to connect again
      this.status = ADAPTER_STATUS.READY;
    }
    this.activeSession = null;
    await super.disconnect();
  }

  public async enableMFA(): Promise<void> {
    throw new Error("Method Not implemented");
  }

  private cleanupPendingPairings(): void {
    if (!this.connector) throw WalletInitializationError.notReady("Wallet adapter is not ready yet");
    const inactivePairings = this.connector.pairing.getAll({ active: false });

    if (!isValidArray(inactivePairings)) return;

    inactivePairings.forEach((pairing) => {
      if (this.connector) {
        this.connector.pairing.delete(pairing.topic, getSdkError("USER_DISCONNECTED"));
      }
    });
  }

  private async checkForPersistedSession(): Promise<SessionTypes.Struct | null> {
    if (!this.connector) throw WalletInitializationError.notReady("Wallet adapter is not ready yet");
    if (this.connector.session.length) {
      const lastKeyIndex = this.connector.session.keys.length - 1;
      this.activeSession = this.connector.session.get(this.connector.session.keys[lastKeyIndex]);
    }
    return this.activeSession;
  }

  private async createNewSession(opts: { forceNewSession: boolean } = { forceNewSession: false }): Promise<void> {
    try {
      if (!this.connector) throw WalletInitializationError.notReady("Wallet adapter is not ready yet");

      if (!this.adapterOptions.loginSettings || Object.keys(this.adapterOptions.loginSettings).length === 0)
        throw WalletInitializationError.notReady("login settings are not set yet");

      this.status = ADAPTER_STATUS.CONNECTING;
      this.emit(ADAPTER_EVENTS.CONNECTING, { adapter: WALLET_ADAPTERS.WALLET_CONNECT_V2 });
      if (opts.forceNewSession && this.activeSession?.topic) {
        await this.connector.disconnect({ topic: this.activeSession?.topic, reason: getSdkError("USER_DISCONNECTED") });
      }

      log.debug("creating new session for web3auth wallet connect");
      const { uri, approval } = await this.connector.connect(this.adapterOptions.loginSettings);

      const qrcodeModal = this.adapterOptions?.adapterSettings?.qrcodeModal;
      // Open QRCode modal if a URI was returned (i.e. we're not connecting with an existing pairing).
      if (uri) {
        if (qrcodeModal) {
          try {
            await qrcodeModal.openModal({ uri });
            log.debug("EVENT", "QR Code Modal closed");
            this.status = ADAPTER_STATUS.READY;
            this.emit(ADAPTER_EVENTS.READY, WALLET_ADAPTERS.WALLET_CONNECT_V2);
          } catch (error) {
            log.error("unable to open qr code modal");
          }
        } else {
          this.updateAdapterData({ uri, extensionAdapters: WALLET_CONNECT_EXTENSION_ADAPTERS } as WalletConnectV2Data);
        }
      }

      log.info("awaiting session approval from wallet");

      // Await session approval from the wallet.
      const session = await approval();
      this.activeSession = session;
      // Handle the returned session (e.g. update UI to "connected" state).
      await this.onConnectHandler();
      if (qrcodeModal) {
        qrcodeModal.closeModal();
      }
    } catch (error: unknown) {
      if ((error as Error).message?.toLowerCase().includes("proposal expired")) {
        // Retry if adapter status is still connecting
        log.info("current adapter status: ", this.status);
        if (this.status === ADAPTER_STATUS.CONNECTING) {
          log.info("retrying to create new wallet connect session since proposal expired");
          return this.createNewSession({ forceNewSession: true });
        }
        if (this.status === ADAPTER_STATUS.READY) {
          log.info("ignoring proposal expired error since some other adapter is connected");
          return;
        }
      }
      log.error("error while creating new wallet connect session", error);
      this.emit(ADAPTER_EVENTS.ERRORED, error);
      throw error;
    }
  }

  private async onConnectHandler() {
    if (!this.connector || !this.wcProvider) throw WalletInitializationError.notReady("Wallet adapter is not ready yet");
    if (!this.chainConfig) throw WalletInitializationError.invalidParams("Chain config is not set");
    if (this.adapterOptions.adapterSettings?.qrcodeModal) {
      this.wcProvider = new WalletConnectV2Provider({
        config: {
          chainConfig: this.chainConfig as CustomChainConfig,
          skipLookupNetwork: true,
        },
        connector: this.connector,
      });
    }
    await this.wcProvider.setupProvider(this.connector);
    this.subscribeEvents();
    this.cleanupPendingPairings();
    this.status = ADAPTER_STATUS.CONNECTED;
    this.emit(ADAPTER_EVENTS.CONNECTED, {
      adapter: WALLET_ADAPTERS.WALLET_CONNECT_V2,
      reconnected: this.rehydrated,
      provider: this.provider,
    } as CONNECTED_EVENT_DATA);
  }

  private subscribeEvents(): void {
    if (!this.connector) throw WalletInitializationError.notReady("Wallet adapter is not ready yet");

    this.connector.events.on("session_update", ({ topic, params }) => {
      if (!this.connector) return;
      const { namespaces } = params;
      const _session = this.connector.session.get(topic);
      // Overwrite the `namespaces` of the existing session with the incoming one.
      const updatedSession = { ..._session, namespaces };
      // Integrate the updated session state into your dapp state.
      this.activeSession = updatedSession;
    });

    this.connector.events.on("session_delete", () => {
      // Session was deleted -> reset the dapp state, clean up from user session, etc.

      this.disconnect();
    });
  }
}

export { WalletConnectV2Adapter };
