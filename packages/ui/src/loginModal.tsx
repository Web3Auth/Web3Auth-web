import "../css/web3auth.css";

import { SafeEventEmitter } from "@toruslabs/openlogin-jrpc";
import { applyWhiteLabelTheme, LANGUAGES } from "@toruslabs/openlogin-utils";
import {
  ADAPTER_EVENTS,
  BaseAdapterConfig,
  CONNECTED_EVENT_DATA,
  IAdapterDataEvent,
  IWalletConnectExtensionAdapter,
  log,
  LoginMethodConfig,
  WALLET_ADAPTER_TYPE,
  WALLET_ADAPTERS,
  WalletConnectV2Data,
  Web3AuthError,
} from "@web3auth/base";
import { createRoot } from "react-dom/client";

import Modal from "./components/Modal";
import { ThemedContext } from "./context/ThemeContext";
import {
  DEFAULT_LOGO_DARK,
  DEFAULT_LOGO_LIGHT,
  ExternalWalletEventType,
  LOGIN_MODAL_EVENTS,
  MODAL_STATUS,
  ModalState,
  SocialLoginEventType,
  UIConfig,
} from "./interfaces";
import i18n from "./localeImport";
import { getUserLanguage } from "./utils";

function createWrapper(parentZIndex: string): HTMLElement {
  const existingWrapper = document.getElementById("w3a-parent-container");
  if (existingWrapper) existingWrapper.remove();

  const parent = document.createElement("section");
  parent.classList.add("w3a-parent-container");
  parent.setAttribute("id", "w3a-parent-container");
  parent.style.zIndex = parentZIndex;
  parent.style.position = "relative";
  const wrapper = document.createElement("section");
  wrapper.setAttribute("id", "w3a-container");
  parent.appendChild(wrapper);
  document.body.appendChild(parent);
  return wrapper;
}

class LoginModal extends SafeEventEmitter {
  private uiConfig: UIConfig;

  private stateEmitter: SafeEventEmitter;

  constructor(uiConfig: UIConfig) {
    super();
    this.uiConfig = uiConfig;

    if (!uiConfig.logoDark) this.uiConfig.logoDark = DEFAULT_LOGO_DARK;
    if (!uiConfig.logoLight) this.uiConfig.logoLight = DEFAULT_LOGO_LIGHT;
    if (!uiConfig.mode) this.uiConfig.mode = "light";
    if (!uiConfig.modalZIndex) this.uiConfig.modalZIndex = "99998";
    if (typeof uiConfig.displayErrorsOnModal === "undefined") this.uiConfig.displayErrorsOnModal = true;
    if (!uiConfig.appName) this.uiConfig.appName = "Web3Auth";
    if (!uiConfig.loginGridCol) this.uiConfig.loginGridCol = 3;
    if (!uiConfig.primaryButton) this.uiConfig.primaryButton = "socialLogin";
    if (!uiConfig.defaultLanguage) this.uiConfig.defaultLanguage = getUserLanguage(uiConfig.defaultLanguage);

    this.stateEmitter = new SafeEventEmitter();
    this.subscribeCoreEvents(this.uiConfig.adapterListener);
  }

  get isDark(): boolean {
    return this.uiConfig.mode === "dark" || (this.uiConfig.mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  initModal = async (): Promise<void> => {
    const darkState = { isDark: this.isDark };

    const useLang = this.uiConfig.defaultLanguage || LANGUAGES.en;
    // Load new language resource

    if (useLang === LANGUAGES.de) {
      import("./i18n/german.json")
        .then((messages) => {
          i18n.addResourceBundle(useLang as string, "translation", messages.default);
          return i18n.changeLanguage(useLang);
        })
        .catch((error) => {
          log.error(error);
        });
    } else if (useLang === LANGUAGES.ja) {
      import(`./i18n/japanese.json`)
        .then((messages) => {
          i18n.addResourceBundle(useLang as string, "translation", messages.default);
          return i18n.changeLanguage(useLang);
        })
        .catch((error) => {
          log.error(error);
        });
    } else if (useLang === LANGUAGES.ko) {
      import(`./i18n/korean.json`)
        .then((messages) => {
          i18n.addResourceBundle(useLang as string, "translation", messages.default);
          return i18n.changeLanguage(useLang);
        })
        .catch((error) => {
          log.error(error);
        });
    } else if (useLang === LANGUAGES.zh) {
      import(`./i18n/mandarin.json`)
        .then((messages) => {
          i18n.addResourceBundle(useLang as string, "translation", messages.default);
          return i18n.changeLanguage(useLang);
        })
        .catch((error) => {
          log.error(error);
        });
    } else if (useLang === LANGUAGES.es) {
      import(`./i18n/spanish.json`)
        .then((messages) => {
          i18n.addResourceBundle(useLang as string, "translation", messages.default);
          return i18n.changeLanguage(useLang);
        })
        .catch((error) => {
          log.error(error);
        });
    } else if (useLang === LANGUAGES.fr) {
      import(`./i18n/french.json`)
        .then((messages) => {
          i18n.addResourceBundle(useLang as string, "translation", messages.default);
          return i18n.changeLanguage(useLang);
        })
        .catch((error) => {
          log.error(error);
        });
    } else if (useLang === LANGUAGES.pt) {
      import(`./i18n/portuguese.json`)
        .then((messages) => {
          i18n.addResourceBundle(useLang as string, "translation", messages.default);
          return i18n.changeLanguage(useLang);
        })
        .catch((error) => {
          log.error(error);
        });
    } else if (useLang === LANGUAGES.nl) {
      import(`./i18n/dutch.json`)
        .then((messages) => {
          i18n.addResourceBundle(useLang as string, "translation", messages.default);
          return i18n.changeLanguage(useLang);
        })
        .catch((error) => {
          log.error(error);
        });
    } else if (useLang === LANGUAGES.tr) {
      import(`./i18n/turkish.json`)
        .then((messages) => {
          i18n.addResourceBundle(useLang as string, "translation", messages.default);
          return i18n.changeLanguage(useLang);
        })
        .catch((error) => {
          log.error(error);
        });
    }

    return new Promise((resolve) => {
      this.stateEmitter.once("MOUNTED", () => {
        log.info("rendered");
        this.setState({
          status: MODAL_STATUS.INITIALIZED,
        });
        return resolve();
      });
      const container = createWrapper(this.uiConfig.modalZIndex);
      if (darkState.isDark) {
        container.classList.add("dark");
      } else {
        container.classList.remove("dark");
      }

      const root = createRoot(container);
      root.render(
        <ThemedContext.Provider value={darkState}>
          <Modal
            closeModal={this.closeModal}
            stateListener={this.stateEmitter}
            handleShowExternalWallets={this.handleShowExternalWallets}
            handleExternalWalletClick={this.handleExternalWalletClick}
            handleSocialLoginClick={this.handleSocialLoginClick}
            handlePasskeyLogin={this.handlePasskeyLogin}
            appLogo={darkState.isDark ? this.uiConfig.logoDark : this.uiConfig.logoLight}
            appName={this.uiConfig.appName}
          />
        </ThemedContext.Provider>
      );

      if (this.uiConfig?.theme) {
        const rootElement = document.getElementById("w3a-parent-container") as HTMLElement;
        applyWhiteLabelTheme(rootElement, this.uiConfig.theme);
      }
    });
  };

  addSocialLogins = (
    adapter: WALLET_ADAPTER_TYPE,
    loginMethods: LoginMethodConfig,
    loginMethodsOrder: string[],
    uiConfig: Omit<UIConfig, "adapterListener">
  ): void => {
    this.setState({
      socialLoginsConfig: {
        adapter,
        loginMethods,
        loginMethodsOrder,
        uiConfig,
      },
    });
    log.info("addSocialLogins", adapter, loginMethods, loginMethodsOrder, uiConfig);
  };

  setPasskeyPluginVisibility = (value: boolean = false) => {
    this.setState({
      hasPasskeyEnabled: value,
    });
  };

  addWalletLogins = (externalWalletsConfig: Record<string, BaseAdapterConfig>, options: { showExternalWalletsOnly: boolean }): void => {
    this.setState({
      externalWalletsConfig,
      externalWalletsInitialized: true,
      showExternalWalletsOnly: !!options?.showExternalWalletsOnly,
      externalWalletsVisibility: true,
    });
  };

  open = () => {
    this.setState({
      modalVisibility: true,
    });
    this.emit(LOGIN_MODAL_EVENTS.MODAL_VISIBILITY, true);
  };

  closeModal = () => {
    this.setState({
      modalVisibility: false,
      externalWalletsVisibility: false,
    });
    this.emit(LOGIN_MODAL_EVENTS.MODAL_VISIBILITY, false);
  };

  initExternalWalletContainer = () => {
    this.setState({
      hasExternalWallets: true,
    });
  };

  private handleShowExternalWallets = (status: boolean) => {
    this.emit(LOGIN_MODAL_EVENTS.INIT_EXTERNAL_WALLETS, { externalWalletsInitialized: status });
  };

  private handleExternalWalletClick = (params: ExternalWalletEventType) => {
    log.info("external wallet clicked", params);
    const { adapter } = params;
    this.emit(LOGIN_MODAL_EVENTS.LOGIN, {
      adapter,
    });
  };

  private handleSocialLoginClick = (params: SocialLoginEventType) => {
    log.info("social login clicked", params);
    const { adapter, loginParams } = params;
    this.emit(LOGIN_MODAL_EVENTS.LOGIN, {
      adapter,
      loginParams: { loginProvider: loginParams.loginProvider, login_hint: loginParams.login_hint, name: loginParams.name },
    });
  };

  private handlePasskeyLogin = () => {
    this.emit(LOGIN_MODAL_EVENTS.PASSKEY_LOGIN);
  };

  private setState = (newState: Partial<ModalState>) => {
    this.stateEmitter.emit("STATE_UPDATED", newState);
  };

  private updateWalletConnect = (walletConnectUri: string, wcAdapters: IWalletConnectExtensionAdapter[]): void => {
    if (!walletConnectUri) return;
    this.setState({
      walletConnectUri,
      wcAdapters,
    });
  };

  private handleAdapterData = (adapterData: IAdapterDataEvent) => {
    if (adapterData.adapterName === WALLET_ADAPTERS.WALLET_CONNECT_V2) {
      const walletConnectData = adapterData.data as WalletConnectV2Data;
      this.updateWalletConnect(walletConnectData.uri, walletConnectData.extensionAdapters);
    }
  };

  private subscribeCoreEvents = (listener: SafeEventEmitter) => {
    listener.on(ADAPTER_EVENTS.CONNECTING, (data) => {
      log.info("connecting with adapter", data);
      // don't show loader in case of wallet connect, because currently it listens for incoming for incoming
      // connections without any user interaction.
      if (data?.adapter !== WALLET_ADAPTERS.WALLET_CONNECT_V2) {
        // const provider = data?.loginProvider || "";

        this.setState({ status: MODAL_STATUS.CONNECTING });
      }
    });
    listener.on(ADAPTER_EVENTS.CONNECTED, (data: CONNECTED_EVENT_DATA) => {
      log.debug("connected with adapter", data);
      // only show success if not being reconnected again.
      if (!data.reconnected) {
        this.setState({
          status: MODAL_STATUS.CONNECTED,
          modalVisibility: true,
          postLoadingMessage: "modal.post-loading.connected",
        });
      } else {
        this.setState({
          status: MODAL_STATUS.CONNECTED,
        });
      }
    });
    listener.on(ADAPTER_EVENTS.ERRORED, (error: Web3AuthError) => {
      log.error("error", error, error.message);
      if (error.code === 5000) {
        if (this.uiConfig.displayErrorsOnModal)
          this.setState({
            modalVisibility: true,
            postLoadingMessage: error.message || "modal.post-loading.something-wrong",
            status: MODAL_STATUS.ERRORED,
          });
        else
          this.setState({
            modalVisibility: false,
          });
      } else {
        this.setState({
          modalVisibility: true,
          status: MODAL_STATUS.INITIALIZED,
        });
      }
    });
    listener.on(ADAPTER_EVENTS.DISCONNECTED, () => {
      this.setState({ status: MODAL_STATUS.INITIALIZED, externalWalletsVisibility: false });
      // this.toggleMessage("");
    });
    listener.on(ADAPTER_EVENTS.ADAPTER_DATA_UPDATED, (adapterData: IAdapterDataEvent) => {
      this.handleAdapterData(adapterData);
    });
  };
}

export default LoginModal;
