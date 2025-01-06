import { LOGIN_PROVIDER, type SafeEventEmitter } from "@web3auth/auth";
import { ADAPTER_NAMES, ChainNamespaceType, cloneDeep, log, WALLET_ADAPTERS, WalletRegistry } from "@web3auth/base/src";
import deepmerge from "deepmerge";
import { createEffect, createMemo, createSignal, on } from "solid-js";

import { PAGES } from "../../constants";
import { ExternalWalletEventType, MODAL_STATUS, ModalState, SocialLoginEventType, StateEmitterEvents } from "../../interfaces";
import { Body } from "../Body";
import { Modal } from "../Modal";

export interface LoginModalProps {
  stateListener: SafeEventEmitter<StateEmitterEvents>;
  appLogo?: string;
  appName?: string;
  chainNamespace: ChainNamespaceType;
  walletRegistry?: WalletRegistry;
  handleSocialLoginClick: (params: SocialLoginEventType) => void;
  handleExternalWalletClick: (params: ExternalWalletEventType) => void;
  handleShowExternalWallets: (externalWalletsInitialized: boolean) => void;
  closeModal: () => void;
}

const LoginModal = (props: LoginModalProps) => {
  const [modalState, setModalState] = createSignal<ModalState>({
    externalWalletsVisibility: false,
    status: MODAL_STATUS.INITIALIZED,
    hasExternalWallets: false,
    externalWalletsInitialized: false,
    modalVisibility: false,
    modalVisibilityDelayed: false,
    postLoadingMessage: "",
    walletConnectUri: "",
    socialLoginsConfig: {
      loginMethods: {},
      loginMethodsOrder: [],
      adapter: "",
      uiConfig: {},
    },
    externalWalletsConfig: {},
    detailedLoaderAdapter: "",
    detailedLoaderAdapterName: "",
    showExternalWalletsOnly: false,
    currentPage: PAGES.LOGIN,
  });

  createEffect(
    on(
      () => [props.stateListener],
      () => {
        props.stateListener.emit("MOUNTED");
        props.stateListener.on("STATE_UPDATED", (newModalState: Partial<ModalState>) => {
          log.debug("state updated", newModalState);
          setModalState((prevState) => {
            const mergedState = cloneDeep(deepmerge(prevState, newModalState));
            return mergedState;
          });
        });
      }
    )
  );

  const preHandleExternalWalletClick = (params: ExternalWalletEventType) => {
    const { adapter } = params;
    setModalState((prevState) => ({
      ...prevState,
      detailedLoaderAdapter: adapter,
      detailedLoaderAdapterName: ADAPTER_NAMES[adapter],
    }));

    // Call the passed-in handler with the params
    if (props.handleExternalWalletClick) props.handleExternalWalletClick(params);
  };

  const preHandleSocialWalletClick = (params: SocialLoginEventType) => {
    const { loginParams } = params;
    setModalState((prevState) => {
      return { ...prevState, detailedLoaderAdapter: loginParams.loginProvider, detailedLoaderAdapterName: loginParams.name };
    });
    props.handleSocialLoginClick(params);
  };

  // Memo for checking if social logins are visible
  const areSocialLoginsVisible = createMemo(() => {
    if (modalState().showExternalWalletsOnly) return false;
    if (Object.keys(modalState().socialLoginsConfig?.loginMethods || {}).length === 0) return false;

    const isAnySocialLoginVisible = Object.entries(modalState().socialLoginsConfig?.loginMethods || {}).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ([k, v]) => k !== LOGIN_PROVIDER.EMAIL_PASSWORDLESS && (v as any).showOnModal !== false
    );
    return isAnySocialLoginVisible;
  });

  // Memo for checking if email passwordless login is visible
  const isEmailPasswordLessLoginVisible = createMemo(() => {
    return modalState().socialLoginsConfig?.loginMethods[LOGIN_PROVIDER.EMAIL_PASSWORDLESS]?.showOnModal;
  });

  // Memo for checking if SMS passwordless login is visible
  const isSmsPasswordLessLoginVisible = createMemo(() => {
    return modalState().socialLoginsConfig?.loginMethods[LOGIN_PROVIDER.SMS_PASSWORDLESS]?.showOnModal;
  });

  const isEmailPrimary = createMemo(() => modalState().socialLoginsConfig?.uiConfig?.primaryButton === "emailLogin");
  const isExternalPrimary = createMemo(() => modalState().socialLoginsConfig?.uiConfig?.primaryButton === "externalLogin");
  const showPasswordLessInput = createMemo(() => isEmailPasswordLessLoginVisible() || isSmsPasswordLessLoginVisible());
  const showExternalWalletButton = createMemo(() => modalState().hasExternalWallets);
  const showExternalWalletPage = createMemo(() => (areSocialLoginsVisible() || showPasswordLessInput()) && !modalState().externalWalletsVisibility);

  const handleExternalWalletBtnClick = (flag: boolean) => {
    setModalState((prevState) => {
      return {
        ...prevState,
        externalWalletsVisibility: flag,
      };
    });
    if (props.handleShowExternalWallets) props.handleShowExternalWallets(modalState().externalWalletsInitialized);
  };

  const closeModal = () => {
    setModalState((prevState) => ({
      ...prevState,
      externalWalletsVisibility: false,
      modalVisibility: false,
      currentPage: PAGES.LOGIN,
    }));
    props.closeModal();
  };

  const onCloseLoader = () => {
    if (modalState().status === MODAL_STATUS.CONNECTED) {
      setModalState({
        ...modalState(),
        modalVisibility: false,
        externalWalletsVisibility: false,
      });
    }
    if (modalState().status === MODAL_STATUS.ERRORED) {
      setModalState({
        ...modalState(),
        modalVisibility: true,
        status: MODAL_STATUS.INITIALIZED,
      });
    }
  };

  const showCloseIcon = createMemo(() => {
    return (
      modalState().status === MODAL_STATUS.INITIALIZED ||
      modalState().status === MODAL_STATUS.CONNECTED ||
      modalState().status === MODAL_STATUS.ERRORED
    );
  });

  const handleBackClick = () => {
    setModalState({
      ...modalState(),
      currentPage: PAGES.LOGIN,
    });
    log.debug("handleBackClick Body");
  };

  createEffect(
    on(
      () => [modalState().externalWalletsConfig, modalState().walletConnectUri, props.handleExternalWalletClick],
      ([config, walletConnectUri, handleExternalWalletClick]) => {
        log.debug("modalState createEffect", modalState(), typeof handleExternalWalletClick === "function");
        if (typeof config === "object") {
          const wcAvailable = (config[WALLET_ADAPTERS.WALLET_CONNECT_V2]?.showOnModal || false) !== false;
          if (wcAvailable && !walletConnectUri && typeof handleExternalWalletClick === "function") {
            handleExternalWalletClick({ adapter: WALLET_ADAPTERS.WALLET_CONNECT_V2 });
          }
        }
      }
    )
  );

  return (
    <Modal open={modalState().modalVisibility} placement="center" padding={false} showCloseIcon={showCloseIcon()} onClose={closeModal}>
      <Body
        {...props}
        showPasswordLessInput={showPasswordLessInput()}
        showExternalWalletButton={showExternalWalletButton()}
        handleSocialLoginClick={(params: SocialLoginEventType) => preHandleSocialWalletClick(params)}
        socialLoginsConfig={modalState().socialLoginsConfig}
        areSocialLoginsVisible={areSocialLoginsVisible()}
        isEmailPrimary={isEmailPrimary()}
        isExternalPrimary={isExternalPrimary()}
        showExternalWalletPage={showExternalWalletPage()}
        handleExternalWalletBtnClick={handleExternalWalletBtnClick}
        modalState={modalState()}
        preHandleExternalWalletClick={preHandleExternalWalletClick}
        setModalState={setModalState}
        onCloseLoader={onCloseLoader}
        isEmailPasswordLessLoginVisible={isEmailPasswordLessLoginVisible()}
        isSmsPasswordLessLoginVisible={isSmsPasswordLessLoginVisible()}
        handleBackClick={handleBackClick}
      />
    </Modal>
  );
};

export default LoginModal;
