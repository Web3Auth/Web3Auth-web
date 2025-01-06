import type { AccountAbstractionProvider } from "@web3auth/account-abstraction-provider";
import { AuthAdapter, AuthOptions, getAuthDefaultOptions, LOGIN_PROVIDER, LoginConfig } from "@web3auth/auth-adapter";
import {
  ADAPTER_CATEGORY,
  ADAPTER_EVENTS,
  ADAPTER_NAMES,
  ADAPTER_STATUS,
  BaseAdapterConfig,
  cloneDeep,
  CustomChainConfig,
  fetchProjectConfig,
  fetchWalletRegistry,
  getChainConfig,
  IBaseProvider,
  IProvider,
  IWeb3AuthCoreOptions,
  log,
  LoginMethodConfig,
  PROJECT_CONFIG_RESPONSE,
  WALLET_ADAPTER_TYPE,
  WALLET_ADAPTERS,
  WalletInitializationError,
  WalletRegistry,
} from "@web3auth/base";
import { CommonJRPCProvider } from "@web3auth/base-provider";
import {
  AUTH_PROVIDERS,
  capitalizeFirstLetter,
  getAdapterSocialLogins,
  getUserLanguage,
  LOGIN_MODAL_EVENTS,
  LoginModal,
  UIConfig,
} from "@web3auth/modal-ui";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { WalletConnectV2Adapter } from "@web3auth/wallet-connect-v2-adapter";
import deepmerge from "deepmerge";

import { defaultOtherModalConfig, walletRegistryUrl } from "./config";
import { AdaptersModalConfig, IWeb3AuthModal, ModalConfig, ModalConfigParams } from "./interface";

export interface Web3AuthOptions extends IWeb3AuthCoreOptions {
  /**
   * Config for configuring modal ui display properties
   */
  uiConfig?: Omit<UIConfig, "adapterListener">;

  /**
   * Private key provider for your chain namespace
   */
  privateKeyProvider: IBaseProvider<string>;
}

export class Web3Auth extends Web3AuthNoModal implements IWeb3AuthModal {
  public loginModal: LoginModal;

  readonly options: Web3AuthOptions;

  private modalConfig: AdaptersModalConfig = cloneDeep(defaultOtherModalConfig);

  constructor(options: Web3AuthOptions) {
    super(options);
    this.options = { ...options };

    if (!this.options.uiConfig) this.options.uiConfig = {};
    if (!this.coreOptions.privateKeyProvider) throw WalletInitializationError.invalidParams("privateKeyProvider is required");
  }

  public setModalConfig(modalConfig: AdaptersModalConfig): void {
    super.checkInitRequirements();
    this.modalConfig = modalConfig;
  }

  public async initModal(params?: ModalConfigParams): Promise<void> {
    super.checkInitRequirements();

    let projectConfig: PROJECT_CONFIG_RESPONSE;
    try {
      projectConfig = await fetchProjectConfig(
        this.options.clientId,
        this.options.web3AuthNetwork,
        (this.options.accountAbstractionProvider as AccountAbstractionProvider)?.config.smartAccountInit.name
      );
    } catch (e) {
      log.error("Failed to fetch project configurations", e);
      throw WalletInitializationError.notReady("failed to fetch project configurations", e);
    }

    const { whitelabel } = projectConfig;
    this.options.uiConfig = deepmerge(cloneDeep(whitelabel || {}), this.options.uiConfig || {});
    if (!this.options.uiConfig.defaultLanguage) this.options.uiConfig.defaultLanguage = getUserLanguage(this.options.uiConfig.defaultLanguage);
    if (!this.options.uiConfig.mode) this.options.uiConfig.mode = "light";

    let walletRegistry: WalletRegistry = { others: {}, default: {} };
    if (!params?.hideWalletDiscovery) {
      try {
        walletRegistry = await fetchWalletRegistry(walletRegistryUrl);
      } catch (e) {
        log.error("Failed to fetch wallet registry", e);
      }
    }
    this.loginModal = new LoginModal({
      ...this.options.uiConfig,
      adapterListener: this,
      chainNamespace: this.options.chainConfig.chainNamespace,
      walletRegistry,
    });
    this.subscribeToLoginModalEvents();

    const { sms_otp_enabled: smsOtpEnabled, whitelist, key_export_enabled: keyExportEnabled } = projectConfig;
    if (smsOtpEnabled !== undefined) {
      const adapterConfig: Record<WALLET_ADAPTER_TYPE, ModalConfig> = {
        [WALLET_ADAPTERS.AUTH]: {
          label: WALLET_ADAPTERS.AUTH,
          loginMethods: {
            [LOGIN_PROVIDER.SMS_PASSWORDLESS]: {
              name: LOGIN_PROVIDER.SMS_PASSWORDLESS,
              showOnModal: smsOtpEnabled,
              showOnDesktop: smsOtpEnabled,
              showOnMobile: smsOtpEnabled,
            },
          },
        },
      };
      if (!params?.modalConfig) params = { modalConfig: {} };
      const localSmsOtpEnabled = params.modalConfig[WALLET_ADAPTERS.AUTH]?.loginMethods?.[LOGIN_PROVIDER.SMS_PASSWORDLESS]?.showOnModal;
      if (localSmsOtpEnabled === true && smsOtpEnabled === false) {
        throw WalletInitializationError.invalidParams("must enable sms otp on dashboard in order to utilise it");
      }

      params.modalConfig = deepmerge(adapterConfig, cloneDeep(params.modalConfig));
    }

    await this.loginModal.initModal();
    const providedChainConfig = this.options.chainConfig;
    // merge default adapters with the custom configured adapters.
    const allAdapters = [...new Set([...Object.keys(this.modalConfig.adapters || {}), ...Object.keys(this.walletAdapters)])];

    const adapterConfigurationPromises = allAdapters.map(async (adapterName) => {
      // start with the default config of adapter.
      let adapterConfig = this.modalConfig.adapters?.[adapterName] || {
        label: ADAPTER_NAMES[adapterName] || adapterName.split("-").map(capitalizeFirstLetter).join(" "),
        showOnModal: true,
        showOnMobile: true,
        showOnDesktop: true,
      };

      // override the default config of adapter if some config is being provided by the user.
      if (params?.modalConfig?.[adapterName]) {
        adapterConfig = { ...adapterConfig, ...params.modalConfig[adapterName] };
      }
      (this.modalConfig.adapters as Record<WALLET_ADAPTER_TYPE, ModalConfig>)[adapterName] = adapterConfig as ModalConfig;

      // check if adapter is configured/added by user and exist in walletAdapters map.
      const adapter = this.walletAdapters[adapterName];
      log.debug("adapter config", adapterName, this.modalConfig.adapters?.[adapterName].showOnModal, adapter);

      // if adapter is not custom configured then check if it is available in default adapters.
      // and if adapter is not hidden by user
      if (!adapter && this.modalConfig.adapters?.[adapterName].showOnModal) {
        // Adapters to be shown on modal should be pre-configured.
        if (adapterName === WALLET_ADAPTERS.AUTH) {
          const defaultOptions = getAuthDefaultOptions();
          const { clientId, useCoreKitKey, chainConfig, web3AuthNetwork, sessionTime, privateKeyProvider } = this.coreOptions;
          const finalChainConfig = {
            ...getChainConfig(providedChainConfig.chainNamespace, this.coreOptions.chainConfig?.chainId),
            ...chainConfig,
          } as CustomChainConfig;
          if (!privateKeyProvider) {
            throw WalletInitializationError.invalidParams("privateKeyProvider is required");
          }
          const finalAuthAdapterSettings: Partial<AuthOptions> = {
            ...defaultOptions.adapterSettings,
            clientId,
            network: web3AuthNetwork,
            whiteLabel: this.options.uiConfig,
          };
          if (smsOtpEnabled !== undefined) {
            finalAuthAdapterSettings.loginConfig = {
              [LOGIN_PROVIDER.SMS_PASSWORDLESS]: {
                showOnModal: smsOtpEnabled,
                showOnDesktop: smsOtpEnabled,
                showOnMobile: smsOtpEnabled,
                showOnSocialBackupFactor: smsOtpEnabled,
              } as LoginConfig[keyof LoginConfig],
            };
          }
          if (whitelist) {
            finalAuthAdapterSettings.originData = whitelist.signed_urls;
          }
          if (this.options.uiConfig.uxMode) {
            finalAuthAdapterSettings.uxMode = this.options.uiConfig.uxMode;
          }
          const authAdapter = new AuthAdapter({
            ...defaultOptions,
            clientId,
            useCoreKitKey,
            chainConfig: { ...finalChainConfig },
            adapterSettings: finalAuthAdapterSettings,
            sessionTime,
            web3AuthNetwork,
            privateKeyProvider,
          });
          this.walletAdapters[adapterName] = authAdapter;
          return adapterName;
        }
        throw WalletInitializationError.invalidParams(`Adapter ${adapterName} is not configured`);
      } else if (adapter?.type === ADAPTER_CATEGORY.IN_APP || adapter?.type === ADAPTER_CATEGORY.EXTERNAL || adapterName === this.cachedAdapter) {
        if (!this.modalConfig.adapters?.[adapterName].showOnModal) return;
        // add client id to adapter, same web3auth client id can be used in adapter.
        // this id is being overridden if user is also passing client id in adapter's constructor.
        this.walletAdapters[adapterName].setAdapterSettings({
          clientId: this.options.clientId,
          sessionTime: this.options.sessionTime,
          web3AuthNetwork: this.options.web3AuthNetwork,
          useCoreKitKey: this.coreOptions.useCoreKitKey,
        });

        // if adapter doesn't have any chainConfig then we will set the chainConfig based of passed chainNamespace
        // and chainNamespace.
        if (!adapter.chainConfigProxy) {
          const chainConfig = {
            ...getChainConfig(providedChainConfig.chainNamespace, this.coreOptions.chainConfig?.chainId),
            ...this.coreOptions.chainConfig,
          } as CustomChainConfig;
          this.walletAdapters[adapterName].setAdapterSettings({ chainConfig });
        }

        if (adapterName === WALLET_ADAPTERS.AUTH) {
          const authAdapter = this.walletAdapters[adapterName] as AuthAdapter;
          if (this.coreOptions.privateKeyProvider) {
            if (authAdapter.currentChainNamespace !== this.coreOptions.privateKeyProvider.currentChainConfig.chainNamespace) {
              throw WalletInitializationError.incompatibleChainNameSpace(
                "private key provider is not compatible with provided chainNamespace for auth adapter"
              );
            }
            authAdapter.setAdapterSettings({ privateKeyProvider: this.coreOptions.privateKeyProvider });
          }
          if (smsOtpEnabled !== undefined) {
            authAdapter.setAdapterSettings({
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
            authAdapter.setAdapterSettings({ originData: whitelist.signed_urls });
          }
          if (this.options.uiConfig?.uxMode) {
            authAdapter.setAdapterSettings({ uxMode: this.options.uiConfig.uxMode });
          }
          authAdapter.setAdapterSettings({ whiteLabel: this.options.uiConfig });
          if (!authAdapter.privateKeyProvider) {
            throw WalletInitializationError.invalidParams("privateKeyProvider is required for auth adapter");
          }
        } else if (adapterName === WALLET_ADAPTERS.WALLET_CONNECT_V2) {
          const walletConnectAdapter = this.walletAdapters[adapterName] as WalletConnectV2Adapter;
          const { wallet_connect_enabled: walletConnectEnabled, wallet_connect_project_id: walletConnectProjectId } = projectConfig;

          if (walletConnectEnabled === false) {
            // override user specified config by hiding wallet connect
            this.modalConfig.adapters = {
              ...(this.modalConfig.adapters ?? {}),
              [WALLET_ADAPTERS.WALLET_CONNECT_V2]: {
                ...(this.modalConfig.adapters?.[WALLET_ADAPTERS.WALLET_CONNECT_V2] ?? {}),
                showOnModal: false,
              },
            } as Record<string, ModalConfig>;
            this.modalConfig.adapters[WALLET_ADAPTERS.WALLET_CONNECT_V2].showOnModal = false;
          } else {
            if (!walletConnectAdapter?.adapterOptions?.adapterSettings?.walletConnectInitOptions?.projectId && !walletConnectProjectId)
              throw WalletInitializationError.invalidParams("Invalid wallet connect project id. Please configure it on the dashboard");

            if (walletConnectProjectId) {
              walletConnectAdapter.setAdapterSettings({
                adapterSettings: {
                  walletConnectInitOptions: {
                    projectId: walletConnectProjectId,
                  },
                },
              });
            }
          }
        }

        return adapterName;
      }
    });

    const adapterNames = await Promise.all(adapterConfigurationPromises);
    const hasInAppWallets = Object.values(this.walletAdapters).some((adapter) => {
      if (adapter.type !== ADAPTER_CATEGORY.IN_APP) return false;
      if (this.modalConfig.adapters?.[adapter.name]?.showOnModal !== true) return false;
      if (!this.modalConfig.adapters?.[adapter.name]?.loginMethods) return true;
      const mergedLoginMethods = getAdapterSocialLogins(
        adapter.name,
        (this.modalConfig.adapters as Record<WALLET_ADAPTER_TYPE, ModalConfig>)[adapter.name]?.loginMethods
      );
      if (Object.values(mergedLoginMethods).some((method) => (method as LoginMethodConfig[keyof LoginMethodConfig]).showOnModal)) return true;
      return false;
    });
    log.debug(hasInAppWallets, this.walletAdapters, adapterNames, "hasInAppWallets");

    // Now, initialize the adapters.
    const initPromises = adapterNames.map(async (adapterName) => {
      if (!adapterName) return;
      try {
        const adapter = this.walletAdapters[adapterName];
        // only initialize a external adapter here if it is a cached adapter.
        if (this.cachedAdapter !== adapterName && adapter.type === ADAPTER_CATEGORY.EXTERNAL) {
          return;
        }
        // in-app wallets or cached wallet (being connected or already connected) are initialized first.
        // if adapter is configured then only initialize in app or cached adapter.
        // external wallets are initialized on INIT_EXTERNAL_WALLET event.
        this.subscribeToAdapterEvents(adapter);
        if (adapter.status === ADAPTER_STATUS.NOT_READY) await adapter.init({ autoConnect: this.cachedAdapter === adapterName });
        // note: not adding cachedWallet to modal if it is external wallet.
        // adding it later if no in-app wallets are available.
        if (adapter.type === ADAPTER_CATEGORY.IN_APP) {
          this.initializeInAppWallet(adapterName);
        }
      } catch (error) {
        log.error(error, "error while initializing adapter ", adapterName);
      }
    });

    this.commonJRPCProvider = await CommonJRPCProvider.getProviderInstance({ chainConfig: this.coreOptions.chainConfig as CustomChainConfig });
    if (typeof keyExportEnabled === "boolean") {
      this.coreOptions.privateKeyProvider.setKeyExportFlag(keyExportEnabled);
      // dont know if we need to do this.
      this.commonJRPCProvider.setKeyExportFlag(keyExportEnabled);
    }

    await Promise.all(initPromises);
    if (this.status === ADAPTER_STATUS.NOT_READY) {
      this.status = ADAPTER_STATUS.READY;
      this.emit(ADAPTER_EVENTS.READY);
    }

    const hasExternalWallets = allAdapters.some((adapterName) => {
      // if wallet connect adapter is available but hideWalletDiscovery is true then don't consider it as external wallet
      if (adapterName === WALLET_ADAPTERS.WALLET_CONNECT_V2 && params?.hideWalletDiscovery) return false;
      return this.walletAdapters[adapterName]?.type === ADAPTER_CATEGORY.EXTERNAL && this.modalConfig.adapters?.[adapterName].showOnModal;
    });

    if (hasExternalWallets) {
      this.loginModal.initExternalWalletContainer();
    }

    // variable to check if we have any in app wallets
    // currently all default in app and external wallets can be hidden or shown based on config.
    if (!hasInAppWallets && hasExternalWallets) {
      // if no in app wallet is available then initialize external wallets in modal
      await this.initExternalWalletAdapters(false, { showExternalWalletsOnly: true });
    }
  }

  public async connect(): Promise<IProvider | null> {
    if (!this.loginModal) throw WalletInitializationError.notReady("Login modal is not initialized");
    // if already connected return provider
    if (this.connectedAdapterName && this.status === ADAPTER_STATUS.CONNECTED && this.provider) return this.provider;
    this.loginModal.open();
    return new Promise((resolve, reject) => {
      this.once(ADAPTER_EVENTS.CONNECTED, () => {
        return resolve(this.provider);
      });
      this.once(ADAPTER_EVENTS.ERRORED, (err: unknown) => {
        return reject(err);
      });
      this.once(LOGIN_MODAL_EVENTS.MODAL_VISIBILITY, (visibility: boolean) => {
        // modal is closed but user is not connected to any wallet.
        if (!visibility && this.status !== ADAPTER_STATUS.CONNECTED) {
          return reject(new Error("User closed the modal"));
        }
      });
    });
  }

  private async initExternalWalletAdapters(externalWalletsInitialized: boolean, options?: { showExternalWalletsOnly: boolean }): Promise<void> {
    if (externalWalletsInitialized) return;
    const adaptersConfig: Record<string, BaseAdapterConfig> = {};
    // we do it like this because we don't want one slow adapter to delay the load of the entire external wallet section.
    Object.keys(this.walletAdapters).forEach(async (adapterName) => {
      const adapter = this.walletAdapters[adapterName];
      if (adapter?.type === ADAPTER_CATEGORY.EXTERNAL) {
        log.debug("init external wallet", this.cachedAdapter, adapterName, adapter.status);
        this.subscribeToAdapterEvents(adapter);
        // we are not initializing cached adapter here as it is already being initialized in initModal before.
        if (this.cachedAdapter === adapterName) {
          return;
        }
        if (adapter.status === ADAPTER_STATUS.NOT_READY) {
          await adapter
            .init({ autoConnect: this.cachedAdapter === adapterName })
            .then(() => {
              const adapterModalConfig = (this.modalConfig.adapters as Record<WALLET_ADAPTER_TYPE, ModalConfig>)[adapterName];
              adaptersConfig[adapterName] = { ...adapterModalConfig, isInjected: adapter.isInjected };
              return this.loginModal.addWalletLogins(adaptersConfig, { showExternalWalletsOnly: !!options?.showExternalWalletsOnly });
            })
            .catch((error) => log.error(error, "error while initializing adapter", adapterName));
        } else if (adapter.status === ADAPTER_STATUS.READY || adapter.status === ADAPTER_STATUS.CONNECTING) {
          // we use connecting status for wallet connect
          const adapterModalConfig = (this.modalConfig.adapters as Record<WALLET_ADAPTER_TYPE, ModalConfig>)[adapterName];
          adaptersConfig[adapterName] = { ...adapterModalConfig, isInjected: adapter.isInjected };
          this.loginModal.addWalletLogins(adaptersConfig, { showExternalWalletsOnly: !!options?.showExternalWalletsOnly });
        }
      }
    });
  }

  private initializeInAppWallet(adapterName: string): void {
    log.info("adapterInitResults", adapterName);
    if (this.walletAdapters[adapterName].type === ADAPTER_CATEGORY.IN_APP) {
      this.loginModal.addSocialLogins(
        adapterName,
        getAdapterSocialLogins(adapterName, (this.modalConfig.adapters as Record<WALLET_ADAPTER_TYPE, ModalConfig>)[adapterName]?.loginMethods),
        this.options.uiConfig?.loginMethodsOrder || AUTH_PROVIDERS,
        {
          ...this.options.uiConfig,
          loginGridCol: this.options.uiConfig?.loginGridCol || 3,
          primaryButton: this.options.uiConfig?.primaryButton || "socialLogin",
        }
      );
    }
  }

  private subscribeToLoginModalEvents(): void {
    this.loginModal.on(LOGIN_MODAL_EVENTS.LOGIN, async (params: { adapter: WALLET_ADAPTER_TYPE; loginParams: unknown }) => {
      try {
        await this.connectTo<unknown>(params.adapter, params.loginParams);
      } catch (error) {
        log.error(`Error while connecting to adapter: ${params.adapter}`, error);
      }
    });
    this.loginModal.on(LOGIN_MODAL_EVENTS.INIT_EXTERNAL_WALLETS, async (params: { externalWalletsInitialized: boolean }) => {
      await this.initExternalWalletAdapters(params.externalWalletsInitialized);
    });
    this.loginModal.on(LOGIN_MODAL_EVENTS.DISCONNECT, async () => {
      try {
        await this.logout();
      } catch (error) {
        log.error(`Error while disconnecting`, error);
      }
    });
    this.loginModal.on(LOGIN_MODAL_EVENTS.MODAL_VISIBILITY, async (visibility: boolean) => {
      log.debug("is login modal visible", visibility);
      this.emit(LOGIN_MODAL_EVENTS.MODAL_VISIBILITY, visibility);
      const adapter = this.walletAdapters[WALLET_ADAPTERS.WALLET_CONNECT_V2];
      if (adapter) {
        const walletConnectStatus = adapter?.status;
        log.debug("trying refreshing wc session", visibility, walletConnectStatus);
        if (visibility && (walletConnectStatus === ADAPTER_STATUS.READY || walletConnectStatus === ADAPTER_STATUS.CONNECTING)) {
          log.debug("refreshing wc session");

          // refreshing session for wallet connect whenever modal is opened.
          try {
            adapter.connect();
          } catch (error) {
            log.error(`Error while disconnecting to wallet connect in core`, error);
          }
        }
        if (
          !visibility &&
          this.status === ADAPTER_STATUS.CONNECTED &&
          (walletConnectStatus === ADAPTER_STATUS.READY || walletConnectStatus === ADAPTER_STATUS.CONNECTING)
        ) {
          log.debug("this stops wc adapter from trying to reconnect once proposal expires");
          adapter.status = ADAPTER_STATUS.READY;
        }
      }
    });
  }
}
