import "./index.css";

import { applyWhiteLabelTheme, SafeEventEmitter } from "@web3auth/auth";
import {
  ADAPTER_EVENTS,
  BaseAdapterConfig,
  ChainNamespaceType,
  CONNECTED_EVENT_DATA,
  IAdapterDataEvent,
  log,
  LoginMethodConfig,
  WALLET_ADAPTER_TYPE,
  WALLET_ADAPTERS,
  WalletConnectV2Data,
  WalletRegistry,
  Web3AuthError,
  Web3AuthNoModalEvents,
} from "@web3auth/base";
import { render } from "solid-js/web";

import { LoginModal as Modal } from "./components/LoginModal";
import { ThemedContext } from "./context/ThemeContext";
import {
  DEFAULT_LOGO_DARK,
  DEFAULT_LOGO_LIGHT,
  ExternalWalletEventType,
  LOGIN_MODAL_EVENTS,
  LoginModalProps,
  MODAL_STATUS,
  ModalState,
  SocialLoginEventType,
  StateEmitterEvents,
  UIConfig,
} from "./interfaces";
import { changeLocale } from "./localeImport";
import { getUserLanguage } from "./utils/modal";

function createWrapper(parentZIndex: string) {
  const existingWrapper = document.getElementById("w3a-parent-container");
  if (existingWrapper) existingWrapper.remove();
  const parent = document.createElement("section");
  parent.classList.add("w3a-parent-container");
  parent.setAttribute("id", "w3a-parent-container");
  parent.style.zIndex = parentZIndex;
  parent.style.position = "relative";
  document.body.appendChild(parent);
}

export class LoginModal extends SafeEventEmitter {
  private uiConfig: UIConfig;

  private stateEmitter: SafeEventEmitter<StateEmitterEvents>;

  private chainNamespace: ChainNamespaceType;

  private walletRegistry: WalletRegistry;

  constructor(uiConfig: LoginModalProps) {
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

    this.stateEmitter = new SafeEventEmitter<StateEmitterEvents>();
    this.chainNamespace = uiConfig.chainNamespace;
    this.walletRegistry = uiConfig.walletRegistry;
    this.subscribeCoreEvents(this.uiConfig.adapterListener);
  }

  get isDark(): boolean {
    return this.uiConfig.mode === "dark" || (this.uiConfig.mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  initModal = async (): Promise<void> => {
    const darkState = { isDark: this.isDark };

    // Load new language resource
    changeLocale(this.uiConfig.defaultLanguage || "en");

    return new Promise((resolve) => {
      this.stateEmitter.once("MOUNTED", () => {
        log.info("rendered");
        this.setState({
          status: MODAL_STATUS.INITIALIZED,
        });
        return resolve();
      });

      createWrapper(this.uiConfig.modalZIndex);

      const root = document.getElementById("w3a-parent-container");
      if (darkState.isDark) {
        root?.classList.add("w3a--dark");
      } else {
        root?.classList.remove("w3a--dark");
      }

      if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
        throw new Error("Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?");
      }

      render(
        () => (
          <ThemedContext.Provider value={darkState}>
            <Modal
              closeModal={this.closeModal}
              stateListener={this.stateEmitter}
              handleShowExternalWallets={this.handleShowExternalWallets}
              handleExternalWalletClick={this.handleExternalWalletClick}
              handleSocialLoginClick={this.handleSocialLoginClick}
              appLogo={darkState.isDark ? this.uiConfig.logoDark : this.uiConfig.logoLight}
              appName={this.uiConfig.appName}
              chainNamespace={this.chainNamespace}
              walletRegistry={this.walletRegistry}
            />
          </ThemedContext.Provider>
        ),
        root!
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

  private setState = (newState: Partial<ModalState>) => {
    this.stateEmitter.emit("STATE_UPDATED", newState);
  };

  private updateWalletConnect = (walletConnectUri: string): void => {
    if (!walletConnectUri) return;
    this.setState({
      walletConnectUri,
    });
  };

  private handleAdapterData = (adapterData: IAdapterDataEvent) => {
    if (adapterData.adapterName === WALLET_ADAPTERS.WALLET_CONNECT_V2) {
      const walletConnectData = adapterData.data as WalletConnectV2Data;
      this.updateWalletConnect(walletConnectData.uri);
    }
  };

  private subscribeCoreEvents = (listener: SafeEventEmitter<Web3AuthNoModalEvents>) => {
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
    // TODO: send adapter name in error
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
