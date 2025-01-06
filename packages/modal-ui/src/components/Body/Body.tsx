import { type SafeEventEmitter } from "@web3auth/auth";
import { ChainNamespaceType, WalletRegistry } from "@web3auth/base/src";
import Bowser from "bowser";
import { createContext, createMemo, Match, Show, Suspense, Switch } from "solid-js";
import { createStore } from "solid-js/store";

import { PAGES } from "../../constants";
import {
  browser,
  ExternalButton,
  ExternalWalletEventType,
  mobileOs,
  MODAL_STATUS,
  ModalState,
  platform,
  SocialLoginEventType,
  SocialLoginsConfig,
  StateEmitterEvents,
} from "../../interfaces";
import { t } from "../../localeImport";
import { getBrowserExtensionUrl, getBrowserName, getMobileInstallLink, getOsName } from "../../utils/common";
import Footer from "../Footer/Footer";
import { Image } from "../Image";
import { Loader } from "../Loader";
import ConnectWallet from "./ConnectWallet";
import Login from "./Login";

export interface BodyProps {
  stateListener: SafeEventEmitter<StateEmitterEvents>;
  appLogo?: string;
  appName?: string;
  chainNamespace: ChainNamespaceType;
  walletRegistry?: WalletRegistry;
  handleSocialLoginClick: (params: SocialLoginEventType) => void;
  handleExternalWalletClick: (params: ExternalWalletEventType) => void;
  handleShowExternalWallets: (externalWalletsInitialized: boolean) => void;
  showPasswordLessInput: boolean;
  showExternalWalletButton: boolean;
  socialLoginsConfig: SocialLoginsConfig;
  areSocialLoginsVisible: boolean;
  isEmailPrimary: boolean;
  isExternalPrimary: boolean;
  showExternalWalletPage: boolean;
  handleExternalWalletBtnClick?: (flag: boolean) => void;
  modalState: ModalState;
  preHandleExternalWalletClick: (params: { adapter: string }) => void;
  setModalState: (state: ModalState) => void;
  onCloseLoader: () => void;
  isEmailPasswordLessLoginVisible: boolean;
  isSmsPasswordLessLoginVisible: boolean;
  handleBackClick: () => void;
}

interface BodyContextType {
  bodyState: {
    showWalletDetails: boolean;
    walletDetails: ExternalButton;
  };
  setBodyState: (state: { showWalletDetails: boolean; walletDetails: ExternalButton }) => void;
}

export const BodyContext = createContext<BodyContextType>({} as BodyContextType);

const Body = (props: BodyProps) => {
  const [bodyState, setBodyState] = createStore<{
    showWalletDetails: boolean;
    walletDetails: ExternalButton;
  }>({
    showWalletDetails: false,
    walletDetails: null,
  });

  const handleExternalWalletBtnClick = (flag: boolean) => {
    props.setModalState({
      ...props.modalState,
      currentPage: PAGES.CONNECT_WALLET,
    });
    if (props.handleExternalWalletBtnClick) props.handleExternalWalletBtnClick(flag);
  };

  const handleBackClick = (flag: boolean) => {
    props.setModalState({
      ...props.modalState,
      currentPage: PAGES.LOGIN,
    });
    if (props.handleExternalWalletBtnClick) props.handleExternalWalletBtnClick(flag);
  };

  // Wallet Details
  const deviceDetails = createMemo<{ platform: platform; browser: browser; os: mobileOs }>(() => {
    const browserData = Bowser.getParser(window.navigator.userAgent);
    return {
      platform: browserData.getPlatformType() as platform,
      browser: browserData.getBrowserName().toLowerCase() as browser,
      os: browserData.getOSName() as mobileOs,
    };
  });

  const mobileInstallLinks = () => {
    const installConfig = bodyState.walletDetails.walletRegistryItem.app || {};
    const installLinks = Object.keys(installConfig).reduce((acc, os) => {
      if (!["android", "ios"].includes(os)) return acc;
      const appId = installConfig[os as mobileOs];
      if (!appId) return acc;
      const appUrl = getMobileInstallLink(os as mobileOs, appId);
      if (!appUrl) return acc;
      const logoLight = `${os}-light`;
      const logoDark = `${os}-dark`;
      acc.push(
        <li class="w3a--w-full">
          <a href={appUrl} rel="noopener noreferrer" target="_blank">
            <button type="button" class="w3a--flex w3a--items-center w3a--gap-x-2 w3a--w-full w3a--t-btn w3a--px-4 w3a--py-2 w3a--rounded-full">
              <Image
                imageId={logoLight}
                darkImageId={logoDark}
                hoverImageId={logoLight}
                darkHoverImageId={logoDark}
                height="28"
                width="28"
                isButton
              />
              <span class="w3a--text-sm w3a--font-medium">{t("modal.external.install-mobile-app", { os: getOsName(os as mobileOs) })}</span>
            </button>
          </a>
        </li>
      );
      return acc;
    }, []);
    return installLinks;
  };

  const desktopInstallLinks = () => {
    // if browser is brave, use chrome extension
    const browserType = deviceDetails().browser === "brave" ? "chrome" : deviceDetails().browser;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const browserExtensionConfig: any = bodyState.walletDetails.walletRegistryItem.app || {};
    const extensionForCurrentBrowser =
      browserExtensionConfig.browser && browserExtensionConfig.browser.includes(browserType) ? browserExtensionConfig.browser : undefined;
    const browserExtensionId = browserExtensionConfig[browserType] || extensionForCurrentBrowser;
    const browserExtensionUrl = browserExtensionId ? getBrowserExtensionUrl(browserType, browserExtensionId) : null;
    const installLink = browserExtensionUrl ? (
      <li>
        <a href={browserExtensionUrl} rel="noopener noreferrer" target="_blank">
          <button type="button" class="w3a--flex w3a--items-center w3a--gap-x-2 w3a--w-full w3a--t-btn w3a--px-4 w3a--py-2 w3a--rounded-full">
            <Image
              imageId={deviceDetails().browser}
              darkImageId={deviceDetails().browser}
              hoverImageId={deviceDetails().browser}
              darkHoverImageId={deviceDetails().browser}
              height="30"
              width="30"
              isButton
            />
            <span class="w3a--text-sm w3a--font-medium w3a--text-app-gray-900 dark:w3a--text-app-white">
              {t("modal.external.install-browser-extension", { browser: getBrowserName(deviceDetails().browser) })}
            </span>
          </button>
        </a>
      </li>
    ) : null;
    return [installLink, ...mobileInstallLinks()];
  };

  return (
    <BodyContext.Provider value={{ bodyState, setBodyState }}>
      <div class="w3a--h-auto w3a--p-6 w3a--flex w3a--flex-col w3a--flex-1 w3a--relative">
        {/* Content */}
        <Show
          when={props.modalState.status !== MODAL_STATUS.INITIALIZED}
          fallback={
            <Suspense>
              <Switch>
                <Match
                  when={
                    props.modalState.currentPage === PAGES.LOGIN &&
                    props.showExternalWalletPage &&
                    props.modalState.status === MODAL_STATUS.INITIALIZED
                  }
                >
                  <Login
                    {...props}
                    showPasswordLessInput={props.showPasswordLessInput}
                    showExternalWalletButton={props.showExternalWalletButton}
                    handleSocialLoginClick={props.handleSocialLoginClick}
                    socialLoginsConfig={props.socialLoginsConfig}
                    areSocialLoginsVisible={props.areSocialLoginsVisible}
                    isEmailPrimary={props.isEmailPrimary}
                    isExternalPrimary={props.isExternalPrimary}
                    handleExternalWalletBtnClick={handleExternalWalletBtnClick}
                    isEmailPasswordLessLoginVisible={props.isEmailPasswordLessLoginVisible}
                    isSmsPasswordLessLoginVisible={props.isSmsPasswordLessLoginVisible}
                  />
                </Match>
                <Match
                  when={
                    props.modalState.currentPage === PAGES.CONNECT_WALLET &&
                    !props.showExternalWalletPage &&
                    props.modalState.status === MODAL_STATUS.INITIALIZED
                  }
                >
                  <ConnectWallet
                    onBackClick={handleBackClick}
                    modalStatus={props.modalState.status}
                    showBackButton={props.areSocialLoginsVisible || props.showPasswordLessInput}
                    handleExternalWalletClick={props.preHandleExternalWalletClick}
                    chainNamespace={props.chainNamespace}
                    walletConnectUri={props.modalState.walletConnectUri}
                    config={props.modalState.externalWalletsConfig}
                    walletRegistry={props.walletRegistry}
                    appLogo={props.appLogo}
                  />
                </Match>
              </Switch>
            </Suspense>
          }
        >
          <Loader
            adapter={props.modalState.detailedLoaderAdapter}
            adapterName={props.modalState.detailedLoaderAdapter}
            modalStatus={props.modalState.status}
            onClose={props.onCloseLoader}
            appLogo={props.appLogo}
          />
        </Show>

        {/* Footer */}
        <Footer />

        {/* Wallet Details */}
        <Show when={bodyState.showWalletDetails}>
          <div
            class="w3a--absolute w3a--h-full w3a--w-full w3a--top-0 w3a--left-0 w3a--bottom-sheet-bg w3a--rounded-3xl"
            onClick={() => setBodyState({ showWalletDetails: false })}
          />
          <div
            class="w3a--absolute w3a--bottom w3a--left-0 w3a--bg-app-light-surface-main dark:w3a--bg-app-dark-surface-main w3a--rounded-3xl w3a--p-4 w3a--bottom-sheet-width w3a--flex w3a--flex-col 
            w3a--gap-y-2 w3a--shadow-sm w3a--border w3a--border-app-gray-100 dark:w3a--border-app-gray-600"
          >
            <div
              class="w3a--h-1 w3a--w-16 w3a--bg-app-gray-200 dark:w3a--bg-app-gray-700 w3a--mx-auto w3a--rounded-full w3a--cursor-pointer"
              onClick={() => setBodyState({ showWalletDetails: false })}
              aria-hidden="true"
              role="button"
            />
            <div class="w3a--flex w3a--justify-center w3a--my-4">
              <Image
                imageId={`login-${bodyState.walletDetails.name}`}
                hoverImageId={`login-${bodyState.walletDetails.name}`}
                fallbackImageId="wallet"
                height="80"
                width="80"
                isButton
                extension={bodyState.walletDetails.imgExtension}
              />
            </div>
            <ul class="w3a--flex w3a--flex-col w3a--gap-y-2">
              {deviceDetails().platform === "desktop" ? desktopInstallLinks() : mobileInstallLinks()}
            </ul>
          </div>
        </Show>
      </div>
    </BodyContext.Provider>
  );
};

export default Body;
