import { BaseAdapterConfig, ChainNamespaceType, log, WALLET_ADAPTERS, WalletRegistry } from "@web3auth/base";
import bowser from "bowser";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ExternalButton, MODAL_STATUS, ModalStatusType } from "../interfaces";
import i18n from "../localeImport";
import ExternalWalletButton from "./ExternalWallet/ExternalWalletButton";
import ExternalWalletDetail from "./ExternalWallet/ExternalWalletDetail";
import ExternalWalletHeader from "./ExternalWallet/ExternalWalletHeader";
import Loader from "./Loader";

interface ExternalWalletsProps {
  hideExternalWallets: () => void;
  handleExternalWalletClick: (params: { adapter: string }) => void;
  closeModal: () => void;
  config: Record<string, BaseAdapterConfig>;
  walletConnectUri: string | undefined;
  showBackButton: boolean;
  modalStatus: ModalStatusType;
  chainNamespace: ChainNamespaceType;
  walletRegistry?: WalletRegistry;
}

type os = "iOS" | "Android";
type platform = "mobile" | "desktop" | "tablet";
type browser = "chrome" | "firefox" | "edge" | "brave" | "safari";

function formatIOSMobile(params: { uri: string; universalLink?: string; deepLink?: string }) {
  const encodedUri: string = encodeURIComponent(params.uri);
  if (params.universalLink) return `${params.universalLink}/wc?uri=${encodedUri}`;
  if (params.deepLink) return `${params.deepLink}wc?uri=${encodedUri}`;
  return "";
}

export default function ExternalWallet(props: ExternalWalletsProps) {
  const {
    hideExternalWallets,
    handleExternalWalletClick,
    closeModal,
    config = {},
    walletConnectUri,
    showBackButton,
    modalStatus,
    chainNamespace,
    walletRegistry = {},
  } = props;
  const [externalButtons, setExternalButtons] = useState<ExternalButton[]>([]);
  const [adapterVisibilityMap, setAdapterVisibilityMap] = useState<Record<string, boolean>>({});
  const [totalExternalWallets, setTotalExternalWallets] = useState<number>(0);
  const [selectedButton, setSelectedButton] = useState<ExternalButton>(null);
  const [walletSearch, setWalletSearch] = useState<string>("");
  const [t] = useTranslation(undefined, { i18n });

  const [isWalletDiscoveryReady, isWalletDiscoveryNotReady] = useMemo(() => {
    const walletConnectSupported = Object.keys(config || {}).some((adapter) => adapter === WALLET_ADAPTERS.WALLET_CONNECT_V2);
    const walletDiscoverySupported = walletRegistry && Object.keys(walletRegistry).length > 0 && walletConnectSupported;
    return [walletDiscoverySupported && walletConnectUri, walletDiscoverySupported && !walletConnectUri];
  }, [config, walletConnectUri, walletRegistry]);

  const deviceDetails = useMemo<{ platform: platform; os: os; browser: browser }>(() => {
    const browser = bowser.getParser(window.navigator.userAgent);
    return {
      platform: browser.getPlatformType() as platform,
      os: browser.getOSName() as os,
      browser: browser.getBrowserName().toLowerCase() as browser,
    };
  }, []);

  const handleWalletSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setWalletSearch(e.target.value);
  };

  useEffect(() => {
    log.debug("loaded external wallets", config, walletConnectUri, deviceDetails.platform);
    const wcAvailable = (config[WALLET_ADAPTERS.WALLET_CONNECT_V2]?.showOnModal || false) !== false;
    if (wcAvailable && !walletConnectUri) {
      handleExternalWalletClick({ adapter: WALLET_ADAPTERS.WALLET_CONNECT_V2 });
    }

    const canShowMap: Record<string, boolean> = {};
    Object.keys(config).forEach((adapter) => {
      const adapterConfig = config[adapter];
      if (!adapterConfig.showOnModal) {
        canShowMap[adapter] = false;
        return;
      }
      if (deviceDetails.platform === "desktop" && adapterConfig.showOnDesktop) {
        canShowMap[adapter] = true;
        return;
      }
      if ((deviceDetails.platform === "mobile" || deviceDetails.platform === "tablet") && adapterConfig.showOnMobile) {
        canShowMap[adapter] = true;
        return;
      }
      canShowMap[adapter] = false;
    });
    setAdapterVisibilityMap(canShowMap);
  }, [config, handleExternalWalletClick, walletConnectUri, deviceDetails]);

  useEffect(() => {
    if (isWalletDiscoveryReady) {
      const isWalletConnectAdapterIncluded = Object.keys(config).some((adapter) => adapter === WALLET_ADAPTERS.WALLET_CONNECT_V2);
      const buttons: ExternalButton[] = Object.keys(walletRegistry).reduce((acc, wallet) => {
        if (adapterVisibilityMap[wallet] !== false) {
          const walletRegistryItem = walletRegistry[wallet];
          let href = "";
          if (deviceDetails.platform === bowser.PLATFORMS_MAP.mobile && walletConnectUri) {
            const universalLink = walletRegistryItem?.mobile?.universal;
            const deepLink = walletRegistryItem?.mobile?.native;
            href = universalLink || deepLink ? formatIOSMobile({ uri: walletConnectUri, universalLink, deepLink }) : walletConnectUri;
          }
          const button = {
            name: wallet,
            displayName: walletRegistryItem.name,
            href,
            hasInjectedWallet: config[wallet]?.isInjected || false,
            hasWalletConnect: isWalletConnectAdapterIncluded && walletRegistryItem.walletConnect?.sdks?.includes("sign_v2"),
            hasInstallLinks: Object.keys(walletRegistryItem.app || {}).length > 0,
            walletRegistryItem,
          };
          if (!button.hasInjectedWallet && !button.hasWalletConnect && !button.hasInstallLinks) return acc;
          const chainNamespaces = new Set(walletRegistryItem.chains?.map((chain) => chain.split(":")[0]));
          if (!chainNamespaces.has(chainNamespace)) return acc;
          acc.push(button);
        }
        return acc;
      }, [] as ExternalButton[]);
      setTotalExternalWallets(buttons.length);
      // prioritize wallet that has injected wallet
      buttons.sort((a, b) => {
        if (a.hasInjectedWallet && !b.hasInjectedWallet) return -1;
        if (!a.hasInjectedWallet && b.hasInjectedWallet) return 1;
        return 0;
      });
      const filteredButtons = buttons
        .filter((button) => {
          if (!walletSearch) return true;
          return button.displayName.toLowerCase().includes(walletSearch.toLowerCase());
        })
        .slice(0, 15); // show at most 15 wallets
      setExternalButtons(filteredButtons);
    } else {
      const buttons: ExternalButton[] = Object.keys(config).reduce((acc, adapter) => {
        if (![WALLET_ADAPTERS.WALLET_CONNECT_V2].includes(adapter) && adapterVisibilityMap[adapter]) {
          acc.push({
            name: adapter,
            displayName: config[adapter].label || adapter,
            hasInjectedWallet: config[adapter].isInjected,
            hasWalletConnect: false,
            hasInstallLinks: false,
          });
        }
        return acc;
      }, [] as ExternalButton[]);
      setExternalButtons(buttons);
    }
  }, [config, deviceDetails, walletConnectUri, adapterVisibilityMap, isWalletDiscoveryReady, walletRegistry, walletSearch, chainNamespace]);

  const handleWalletClick = (button: ExternalButton) => {
    if (deviceDetails.platform === "desktop") {
      // if has injected wallet, connect to injected wallet
      if (button.hasInjectedWallet) {
        handleExternalWalletClick({ adapter: button.name });
      } else {
        // else, show wallet detail
        setSelectedButton(button);
      }
    } else if (!button.href && button.hasInjectedWallet) {
      // on mobile, if href is not available, connect to injected wallet
      handleExternalWalletClick({ adapter: button.name });
    }
  };

  return (
    <div className="w3ajs-external-wallet w3a-group">
      <div className="w3a-external-container w3ajs-external-container">
        {/* Loader */}
        {isWalletDiscoveryNotReady && <Loader modalStatus={MODAL_STATUS.CONNECTING} canEmit={false} />}
        {modalStatus === MODAL_STATUS.INITIALIZED &&
          // All wallets
          (!selectedButton ? (
            <>
              {/* Header */}
              <ExternalWalletHeader
                disableBackButton={!showBackButton}
                title={t("modal.external.connect-wallet")}
                goBack={hideExternalWallets}
                closeModal={closeModal}
              />

              {/* Search */}
              {isWalletDiscoveryReady && (
                <div className="pt-4">
                  <input
                    className="w-full w3a-text-field"
                    name="passwordless-input"
                    required
                    value={walletSearch}
                    placeholder={t("modal.external.search-wallet", { count: totalExternalWallets })}
                    onFocus={(e) => {
                      e.target.placeholder = "";
                    }}
                    onBlur={(e) => {
                      e.target.placeholder = t("modal.external.search-wallet", { count: totalExternalWallets });
                    }}
                    onChange={(e) => handleWalletSearch(e)}
                  />
                </div>
              )}

              {/* Wallet List */}
              {externalButtons.length === 0 && (
                <div className="w-full text-center text-app-gray-400 dark:text-app-gray-500 py-6 mt-4 flex justify-center items-center">
                  {t("modal.external.no-wallets-found")}
                </div>
              )}
              <ul className="w3a-adapter-list w3ajs-wallet-adapters mt-4">
                {externalButtons.map((button) => {
                  return (
                    <li className="w3a-adapter-item w3a-adapter-item--full" key={button.name}>
                      {deviceDetails.platform === "desktop" ? (
                        <ExternalWalletButton button={button} adapterConfig={config[button.name]} handleWalletClick={handleWalletClick} />
                      ) : (
                        <a href={button.href} target="_blank" className="w-full" rel="noreferrer noopener">
                          <ExternalWalletButton button={button} adapterConfig={config[button.name]} handleWalletClick={handleWalletClick} />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            // Wallet Detail
            <ExternalWalletDetail
              connectButton={selectedButton}
              goBack={() => setSelectedButton(null)}
              walletConnectUri={walletConnectUri}
              closeModal={closeModal}
            />
          ))}
      </div>
    </div>
  );
}
