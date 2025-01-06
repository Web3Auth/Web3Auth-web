import { BaseAdapterConfig, ChainNamespaceType, log, WALLET_ADAPTERS, WalletRegistry, WalletRegistryItem } from "@web3auth/base/src";
import bowser from "bowser";
import { createEffect, createMemo, createSignal, For, Show, useContext } from "solid-js";
import { MaskType, QRCodeCanvas } from "solid-qr-code";

import { CONNECT_WALLET_PAGES } from "../../constants";
import { browser, DEFAULT_LOGO_DARK, DEFAULT_LOGO_LIGHT, ExternalButton, ModalStatusType, os, platform } from "../../interfaces";
import { t } from "../../localeImport";
import { cn } from "../../utils/common";
import { Image } from "../Image";
import { WalletButton } from "../WalletButton";
import { BodyContext } from "./Body";
export interface ConnectWalletProps {
  onBackClick?: (flag: boolean) => void;
  handleExternalWalletClick: (params: { adapter: string }) => void;
  config: Record<string, BaseAdapterConfig>;
  walletConnectUri: string | undefined;
  showBackButton: boolean;
  modalStatus: ModalStatusType;
  chainNamespace: ChainNamespaceType;
  walletRegistry?: WalletRegistry;
  appLogo?: string;
}

const ConnectWallet = (props: ConnectWalletProps) => {
  const { bodyState, setBodyState } = useContext(BodyContext);

  const [currentPage, setCurrentPage] = createSignal(CONNECT_WALLET_PAGES.CONNECT_WALLET);
  const [selectedWallet, setSelectedWallet] = createSignal(false);
  const [externalButtons, setExternalButtons] = createSignal<ExternalButton[]>([]);
  const [totalExternalWallets, setTotalExternalWallets] = createSignal<number>(0);
  const [selectedButton, setSelectedButton] = createSignal<ExternalButton>(null);
  const [walletSearch, setWalletSearch] = createSignal<string>("");
  const [isLoading, setIsLoading] = createSignal<boolean>(true);

  const handleBack = () => {
    log.debug("handleBack", selectedWallet(), currentPage());
    if (!selectedWallet() && currentPage() === CONNECT_WALLET_PAGES.CONNECT_WALLET && props.onBackClick) {
      log.debug("handleBack IF");
      props.onBackClick(false);
    }

    if (selectedWallet()) {
      setCurrentPage(CONNECT_WALLET_PAGES.CONNECT_WALLET);
      setSelectedWallet(false);
    }
  };

  const walletDiscoverySupported = createMemo(() => {
    const supported =
      props.walletRegistry && Object.keys(props.walletRegistry.default || {}).length > 0 && Object.keys(props.walletRegistry.others || {}).length > 0;
    return supported;
  });

  const deviceDetails = createMemo<{ platform: platform; os: os; browser: browser }>(() => {
    const browserData = bowser.getParser(window.navigator.userAgent);
    return {
      platform: browserData.getPlatformType() as platform,
      os: browserData.getOSName() as os,
      browser: browserData.getBrowserName().toLowerCase() as browser,
    };
  });

  const adapterVisibilityMap = createMemo(() => {
    const canShowMap: Record<string, boolean> = {};

    Object.keys(props.config).forEach((adapter) => {
      const adapterConfig = props.config[adapter];

      if (!adapterConfig.showOnModal) {
        canShowMap[adapter] = false;
        return;
      }

      if (deviceDetails().platform === "desktop" && adapterConfig.showOnDesktop) {
        canShowMap[adapter] = true;
        return;
      }

      if ((deviceDetails().platform === "mobile" || deviceDetails().platform === "tablet") && adapterConfig.showOnMobile) {
        canShowMap[adapter] = true;
        return;
      }

      canShowMap[adapter] = false;
    });

    log.debug("adapter visibility map", canShowMap);
    return canShowMap;
  });

  const isWalletConnectAdapterIncluded = createMemo(() => Object.keys(props.config).some((adapter) => adapter === WALLET_ADAPTERS.WALLET_CONNECT_V2));
  const adapterVisibility = createMemo(() => adapterVisibilityMap());
  const defaultButtonKeys = createMemo(() => new Set(Object.keys(props.walletRegistry.default)));

  const generateWalletButtons = (wallets: Record<string, WalletRegistryItem>): ExternalButton[] => {
    // eslint-disable-next-line solid/reactivity
    return Object.keys(wallets).reduce((acc, wallet) => {
      if (adapterVisibility()[wallet] === false) return acc;

      const walletRegistryItem: WalletRegistryItem = wallets[wallet];
      let href = "";
      if (deviceDetails().platform === bowser.PLATFORMS_MAP.mobile) {
        const universalLink = walletRegistryItem?.mobile?.universal;
        const deepLink = walletRegistryItem?.mobile?.native;
        href = universalLink || deepLink;
      }

      const button: ExternalButton = {
        name: wallet,
        displayName: walletRegistryItem.name,
        href,
        hasInjectedWallet: props.config[wallet]?.isInjected || false,
        hasWalletConnect: isWalletConnectAdapterIncluded && walletRegistryItem.walletConnect?.sdks?.includes("sign_v2"),
        hasInstallLinks: Object.keys(walletRegistryItem.app || {}).length > 0,
        walletRegistryItem,
        imgExtension: walletRegistryItem.imgExtension || "svg",
      };

      if (!button.hasInjectedWallet && !button.hasWalletConnect && !button.hasInstallLinks) return acc;

      const chainNamespaces = new Set(walletRegistryItem.chains?.map((chain) => chain.split(":")[0]));
      const injectedChainNamespaces = new Set(walletRegistryItem.injected?.map((injected) => injected.namespace));
      if (!chainNamespaces.has(props.chainNamespace) && !injectedChainNamespaces.has(props.chainNamespace)) return acc;

      acc.push(button);
      return acc;
    }, [] as ExternalButton[]);
  };

  const customAdapterButtons = createMemo(() => {
    // eslint-disable-next-line solid/reactivity
    return Object.keys(props.config).reduce((acc, adapter) => {
      if (![WALLET_ADAPTERS.WALLET_CONNECT_V2].includes(adapter) && !props.config[adapter].isInjected && adapterVisibilityMap()[adapter]) {
        acc.push({
          name: adapter,
          displayName: props.config[adapter].label || adapter,
          hasInjectedWallet: false,
          hasWalletConnect: false,
          hasInstallLinks: false,
        });
      }
      return acc;
    }, [] as ExternalButton[]);
  });

  const allButtons = createMemo(() => {
    return [...generateWalletButtons(props.walletRegistry.default), ...generateWalletButtons(props.walletRegistry.others)];
  });

  const filteredButtons = (searchValue: string) => {
    return allButtons()
      .concat(customAdapterButtons())
      .filter((button) => button.name.toLowerCase().includes(searchValue.toLowerCase()));
  };

  const sortedButtons = createMemo(() => {
    log.debug("sortedButtons", allButtons());
    return [
      ...allButtons().filter((button) => button.hasInjectedWallet && defaultButtonKeys().has(button.name)),
      ...customAdapterButtons(),
      ...allButtons().filter((button) => !button.hasInjectedWallet && defaultButtonKeys().has(button.name)),
    ];
  });

  const totalExternalWalletsLength = createMemo(() => {
    return allButtons().length + customAdapterButtons().length;
  });

  const visibleButtons = createMemo(() => {
    const visibilityMap = adapterVisibilityMap();
    // eslint-disable-next-line solid/reactivity
    return Object.keys(props.config).reduce((acc, adapter) => {
      if (![WALLET_ADAPTERS.WALLET_CONNECT_V2].includes(adapter) && visibilityMap[adapter]) {
        acc.push({
          name: adapter,
          displayName: props.config[adapter].label || adapter,
          hasInjectedWallet: props.config[adapter].isInjected,
          hasWalletConnect: false,
          hasInstallLinks: false,
        });
      }
      return acc;
    }, [] as ExternalButton[]);
  });

  const handleWalletSearch = (e: InputEvent) => {
    const searchValue = (e.target as HTMLInputElement).value;
    log.debug("handleWalletSearch", searchValue);
    setWalletSearch(searchValue);
    if (searchValue) {
      setExternalButtons(filteredButtons(searchValue));
    } else {
      setExternalButtons(sortedButtons());
    }
  };

  createEffect(() => {
    if (walletDiscoverySupported()) {
      setExternalButtons(sortedButtons());
      setTotalExternalWallets(totalExternalWalletsLength());
    } else {
      setExternalButtons(visibleButtons());
      setTotalExternalWallets(visibleButtons().length);
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  });

  const handleWalletClick = (button: ExternalButton) => {
    // if has injected wallet, connect to injected wallet
    // if doesn't have wallet connect & doesn't have install links, must be a custom adapter
    if (button.hasInjectedWallet || (!button.hasWalletConnect && !button.hasInstallLinks)) {
      props.handleExternalWalletClick({ adapter: button.name });
    } else if (button.hasWalletConnect) {
      setSelectedButton(button);
      setSelectedWallet(true);
      setCurrentPage(CONNECT_WALLET_PAGES.SELECTED_WALLET);
    } else {
      setBodyState({
        ...bodyState,
        showWalletDetails: true,
        walletDetails: button,
      });
    }
  };

  const headerLogo = createMemo(() => ([DEFAULT_LOGO_DARK, DEFAULT_LOGO_LIGHT].includes(props.appLogo) ? "" : props.appLogo));

  return (
    <div class="w3a--flex w3a--flex-col w3a--gap-y-4 w3a--flex-1 w3a--relative">
      <div class="w3a--flex w3a--items-center w3a--justify-between">
        <figure
          class="w3a--w-5 w3a--h-5 w3a--rounded-full w3a--cursor-pointer w3a--flex w3a--items-center w3a--justify-center w3a--z-20"
          onClick={handleBack}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" class="w3a--text-app-gray-900 dark:w3a--text-app-white">
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M9.707 16.707a1 1 0 0 1-1.414 0l-6-6a1 1 0 0 1 0-1.414l6-6a1 1 0 0 1 1.414 1.414L5.414 9H17a1 1 0 1 1 0 2H5.414l4.293 4.293a1 1 0 0 1 0 1.414"
              clip-rule="evenodd"
            />
          </svg>
        </figure>
        <p class="w3a--text-base w3a--font-medium w3a--text-app-gray-900">
          {currentPage() === CONNECT_WALLET_PAGES.SELECTED_WALLET ? selectedButton()?.displayName : currentPage()}
        </p>
        <div class="w3a--w-5 w3a--h-5 w3a--z-[-1]" />
      </div>

      <Show
        when={selectedWallet()}
        fallback={
          <div class="w3a--contents">
            <Show
              when={totalExternalWallets() > 15 && !isLoading()}
              fallback={<div class="w3a--w-full w3a--h-[46px] w3a--animate-pulse w3a--rounded-full w3a--bg-app-gray-200 dark:w3a--bg-app-gray-700" />}
            >
              <input
                type="text"
                value={walletSearch()}
                onInput={handleWalletSearch}
                onFocus={(e) => {
                  e.target.placeholder = "";
                }}
                onBlur={(e) => {
                  e.target.placeholder = t("modal.external.search-wallet", { count: `${totalExternalWallets()}` });
                }}
                placeholder={
                  isLoading() ? t("modal.external.search-wallet-loading") : t("modal.external.search-wallet", { count: `${totalExternalWallets()}` })
                }
                disabled={isLoading()}
                class="w3a--appearance-none w3a--px-4 w3a--py-2.5 w3a--border w3a--text-app-gray-900 w3a--border-app-gray-300 w3a--bg-app-gray-50 dark:w3a--bg-app-gray-700 dark:w3a--border-app-gray-600 dark:w3a--text-app-white placeholder:w3a--text-app-gray-500 dark:placeholder:w3a--text-app-gray-400 placeholder:w3a--text-sm placeholder:w3a--font-normal w3a--rounded-full w3a--outline-none focus:w3a--outline-none active:w3a--outline-none"
              />
            </Show>
            <ul
              class={cn("w3a--overflow-y-auto w3a--flex w3a--flex-col", {
                "w3a--h-[calc(100dvh_-_400px)]": headerLogo(),
                "w3a--h-[calc(100dvh_-_460px)]": !headerLogo(),
              })}
            >
              <Show
                when={externalButtons().length > 0}
                fallback={
                  <div class="w3a--w-full w3a--text-center w3a--text-app-gray-400 dark:w3a--text-app-gray-500 w3a--py-6 w3a--flex w3a--justify-center w3a--items-center">
                    {t("modal.external.no-wallets-found")}
                  </div>
                }
              >
                <Show
                  when={!isLoading()}
                  fallback={
                    <div class="w3a--flex w3a--flex-col w3a--gap-y-2 w3a--pr-1.5">
                      <For each={Array(6).fill(0)}>
                        {(_) => (
                          <div class="w3a--w-full w3a--h-[54px] w3a--animate-pulse w3a--rounded-lg w3a--bg-app-gray-200 dark:w3a--bg-app-gray-700" />
                        )}
                      </For>
                    </div>
                  }
                >
                  <div class="w3a--flex w3a--flex-col w3a--gap-y-2 w3a--pr-1.5">
                    <For each={externalButtons()}>
                      {(button) => (
                        <WalletButton
                          label={button.displayName}
                          onClick={() => handleWalletClick(button)}
                          button={button}
                          deviceDetails={deviceDetails()}
                          walletConnectUri={props.walletConnectUri}
                        />
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </ul>
          </div>
        }
      >
        <div class="w3a--contents">
          <Show
            when={props.walletConnectUri}
            fallback={
              <div class="w3a--bg-app-gray-200 dark:w3a--bg-app-gray-700 w3a--animate-pulse w3a--rounded-lg w3a--h-[300px] w3a--w-[300px] w3a--mx-auto w3a--p-2 w3a--flex w3a--items-center w3a--justify-center">
                <Image
                  imageId={`login-${selectedButton().name}`}
                  hoverImageId={`login-${selectedButton().name}`}
                  fallbackImageId="wallet"
                  height="30"
                  width="30"
                  isButton
                  extension={selectedButton().imgExtension}
                />
              </div>
            }
          >
            <div class="w3a--relative w3a--bg-app-gray-50 w3a--rounded-lg w3a--h-[300px] w3a--w-[300px] w3a--mx-auto w3a--flex w3a--items-center w3a--justify-center">
              <QRCodeCanvas
                value={props.walletConnectUri || ""}
                level="low"
                backgroundColor="transparent"
                backgroundAlpha={0}
                foregroundColor="#000000"
                foregroundAlpha={1}
                width={300}
                height={300}
                x={0}
                y={0}
                maskType={MaskType.FLOWER_IN_SQAURE}
              />
              <div class="w3a--absolute w3a--top-[43%] w3a--left-[43%] w3a--transform -translate-y-1/2 w3a--w-10 w3a--h-10 w3a--bg-app-white w3a--rounded-full w3a--flex w3a--items-center w3a--justify-center">
                <Image
                  imageId={`login-${selectedButton().name}`}
                  hoverImageId={`login-${selectedButton().name}`}
                  fallbackImageId="wallet"
                  height="20"
                  width="20"
                  isButton
                  extension={selectedButton().imgExtension}
                />
              </div>
            </div>
          </Show>

          <p class="w3a--text-center w3a--text-sm w3a--text-app-gray-500 dark:w3a--text-app-gray-400 w3a--font-normal">
            {t("modal.external.walletconnect-copy")}
          </p>
          <div
            class="w3a--flex w3a--items-center w3a--justify-between w3a--w-full w3a--mt-auto w3a--border w3a--text-app-gray-900 w3a--border-app-gray-300 w3a--bg-app-gray-50 
      dark:w3a--bg-app-gray-700 dark:w3a--border-app-gray-600 dark:w3a--text-app-white w3a--rounded-xl w3a--p-3"
          >
            <p class="w3a--text-sm w3a--text-app-gray-900 dark:w3a--text-app-white">
              {t("modal.external.dont-have")} <span>{selectedButton()?.displayName}</span>?
            </p>
            <button
              class="w3a--appearance-none w3a--border w3a--border-app-gray-900 w3a--text-xs w3a--text-app-gray-900 dark:w3a--text-app-white dark:w3a--border-app-white w3a--rounded-full w3a--px-2 w3a--py-2"
              onClick={() => {
                setBodyState({
                  ...bodyState,
                  showWalletDetails: true,
                  walletDetails: selectedButton(),
                });
              }}
            >
              {t("modal.external.get-wallet")}
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ConnectWallet;
