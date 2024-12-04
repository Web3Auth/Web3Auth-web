import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LOGIN_PROVIDER, LOGIN_PROVIDER_TYPE, WhiteLabelData } from "@web3auth/auth";
import { CHAIN_NAMESPACES, ChainNamespaceType, CustomChainConfig, IAdapter, IBaseProvider, IPlugin, IProvider, WALLET_ADAPTER_TYPE, WALLET_ADAPTERS, WEB3AUTH_NETWORK, WEB3AUTH_NETWORK_TYPE } from "@web3auth/base";
import { Web3AuthContextConfig } from '@web3auth/modal-react-hooks';
import { type ModalConfig, type Web3Auth, type Web3AuthOptions } from "@web3auth/modal";
import { chainConfigs, chainNamespaceOptions, clientIds, getDefaultBundlerUrl, initWhiteLabel, languageOptions, loginProviderOptions, networkOptions, SmartAccountOptions, web3authInitialConfig } from '../config';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { WalletServicesPlugin } from '@web3auth/wallet-services-plugin';
import { CoinbaseAdapter } from "@web3auth/coinbase-adapter";
import { getInjectedAdapters as getInjectedEvmAdapters } from "@web3auth/default-evm-adapter";
import { getInjectedAdapters as getInjectedSolanaAdapters } from "@web3auth/default-solana-adapter";
import { TorusWalletAdapter } from "@web3auth/torus-evm-adapter";
import { WalletConnectV2Adapter } from "@web3auth/wallet-connect-v2-adapter";
import { SolanaWalletAdapter } from "@web3auth/torus-solana-adapter";
import { AccountAbstractionProvider, ISmartAccount, KernelSmartAccount, SafeSmartAccount, TrustSmartAccount } from '@web3auth/account-abstraction-provider';
import { BiconomySmartAccount } from '@web3auth/account-abstraction-provider';


interface AppConfigSettings {
  name: string;
  description: string;
  logoHover: string;
  logoLight: string;
  logoDark: string;
  mainOption: boolean;
  showOnModal: boolean;
  showOnDesktop: boolean;
  showOnMobile: boolean;
}

interface Option {
  name: string;
  value: string;
}

type AppContextType = {
  // values for the form
  network: WEB3AUTH_NETWORK_TYPE;
  chainNamespace: ChainNamespaceType;
  chain: string;
  whiteLabel: {
    enable?: boolean;
    config?: WhiteLabelData;
  };
  loginProviders: LOGIN_PROVIDER_TYPE[];
  adapters: string[];
  showWalletDiscovery: boolean;
  loginMethods: Record<LOGIN_PROVIDER_TYPE, AppConfigSettings>;
  walletPlugin: {
    enable?: boolean;
    logoDark?: string;
    logoLight?: string;
  };
  useAccountAbstractionProvider: boolean;
  useAAWithExternalWallet: boolean;
  smartAccountType: string;
  bundlerUrl: string;
  paymasterUrl: string;

  // setters for the form
  setNetWork: (network: WEB3AUTH_NETWORK_TYPE) => void;
  setChainNamespace: (chainNamespace: ChainNamespaceType) => void;
  setChain: (chain: string) => void;
  setWhiteLabel: (whiteLabel: { enable?: boolean; config?: WhiteLabelData }) => void;
  setLoginProviders: (loginProviders: LOGIN_PROVIDER_TYPE[]) => void;
  setAdapters: (adapters: string[]) => void;
  setLoginMethods: (loginMethods: Record<LOGIN_PROVIDER_TYPE, AppConfigSettings>) => void;
  setWalletPlugin: (walletPlugin: { enable?: boolean; logoDark?: string; logoLight?: string }) => void;
  setShowWalletDiscovery: (showWalletDiscovery: boolean) => void;
  setUseAccountAbstractionProvider: (useAccountAbstractionProvider: boolean) => void;
  setUseAAWithExternalWallet: (useAAWithExternalWallet: boolean) => void;
  setSmartAccountType: (smartAccountType: string) => void;
  setBundlerUrl: (bundlerUrl: string) => void;
  setPaymasterUrl: (paymasterUrl: string) => void;

  // Web3Auth Config
  web3authConfig: Web3AuthContextConfig;
 
  // Options for the form
  networkOptions: Option[];
  chainNamespaceOptions: Option[];
  chainOptions: Option[];
  adapterOptions: Option[];
  loginMethodOptions: Option[];
  languageOptions: Option[];
  loginProviderOptions: Option[];
  smartAccountTypeOptions: Option[];
  
};

const defaultLoginMethod: Record<LOGIN_PROVIDER_TYPE, AppConfigSettings> = loginProviderOptions.reduce(
  (acc, curr) => ({
    ...acc,
    [curr.value]: {
      name: `${curr.name} login`,
      description: "",
      logoHover: "",
      logoLight: "",
      logoDark: "",
      mainOption: false,
      showOnModal: false,
      showOnDesktop: false,
      showOnMobile: false,
    },
  }),
  {} as Record<LOGIN_PROVIDER_TYPE, AppConfigSettings>
);

const AppContext = createContext<AppContextType>({
  network: WEB3AUTH_NETWORK.TESTNET,
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chain: CHAIN_NAMESPACES.EIP155,
  whiteLabel: {
    enable: false,
    config: initWhiteLabel,
  },
  loginProviders: [],
  adapters: [],
  loginMethods: defaultLoginMethod,
  walletPlugin: {
    enable: false,
    logoLight: "",
    logoDark: "",
  },
  showWalletDiscovery: true,

  useAccountAbstractionProvider: false,
  useAAWithExternalWallet: true,
  smartAccountType: "",
  bundlerUrl: "",
  paymasterUrl: "",

  web3authConfig: {} as Web3AuthContextConfig,

  setNetWork: () => {},
  setChainNamespace: () => {},
  setChain: () => {},
  setWhiteLabel: () => {},
  setLoginProviders: () => {},
  setAdapters: () => {},
  setLoginMethods: () => {},
  setWalletPlugin: () => {},
  setShowWalletDiscovery: () => {},
  setUseAccountAbstractionProvider: () => {},
  setUseAAWithExternalWallet: () => {},
  setSmartAccountType: () => {},
  setBundlerUrl: () => {},
  setPaymasterUrl: () => {},

  networkOptions: [],
  chainNamespaceOptions: [],
  chainOptions: [],
  adapterOptions: [],
  loginMethodOptions: [],
  languageOptions: [],
  loginProviderOptions: [],
  smartAccountTypeOptions: [],
});

export const AppProvider: React.FC<{ children: React.ReactNode}> = ({ children }) => {

  // General tab
  const [network, setNetWork] = useState<WEB3AUTH_NETWORK_TYPE>(WEB3AUTH_NETWORK.TESTNET);
  const [chainNamespace, setChainNamespace] = useState<ChainNamespaceType>(CHAIN_NAMESPACES.EIP155);
  const [chain, setChain] = useState<string>("0x1");
  const [adapters, setAdapters] = useState<string[]>([]);
  const [showWalletDiscovery, setShowWalletDiscovery] = useState<boolean>(true);

  // Whitelabel tab
  const [whiteLabel, setWhiteLabel] = useState<{ enable?: boolean; config?: WhiteLabelData }>({
    enable: false,
    config: initWhiteLabel,
  });

  // Login Providers tab
  const [loginProviders, setLoginProviders] = useState<LOGIN_PROVIDER_TYPE[]>([]);
  const [loginMethods, setLoginMethods] = useState<Record<LOGIN_PROVIDER_TYPE, AppConfigSettings>>(defaultLoginMethod);

  // Wallet Plugin tab
  const [walletPlugin, setWalletPlugin] = useState<{ enable?: boolean; logoDark?: string; logoLight?: string }>({
    enable: false,
    logoDark: "",
    logoLight: "",
  });

  // Account Abstraction tab
  const [useAccountAbstractionProvider, setUseAccountAbstractionProvider] = useState<boolean>(false);
  const [useAAWithExternalWallet, setUseAAWithExternalWallet] = useState<boolean>(true);
  const [smartAccountType, setSmartAccountType] = useState<string>("biconomy");
  const [bundlerUrl, setBundlerUrl] = useState<string>("");
  const [paymasterUrl, setPaymasterUrl] = useState<string>("");

  // External Adapters manipulation
  const [externalAdapters, setExternalAdapters] = useState<IAdapter<unknown>[]>([]);
  useEffect(() => {
    const fetchAdapters = async () => {
      let newAdapters: IAdapter<unknown>[] = [];
      for (let i = 0; i < adapters.length; i += 1) {
        newAdapters = newAdapters.concat(await getExternalAdapterByName(adapters[i]));
      }
      setExternalAdapters(newAdapters);
    };
    fetchAdapters();
  }, [adapters]);


  // Wallet Plugins manipulation  
  const walletPlugins = useMemo<IPlugin[]>(() => {
    if (chainNamespace !== CHAIN_NAMESPACES.EIP155 || !walletPlugin?.enable) return [];
    const { logoDark, logoLight } = walletPlugin;
    const walletServicesPlugin = new WalletServicesPlugin({
      walletInitOptions: { whiteLabel: { showWidgetButton: true, logoDark: logoDark || "logo", logoLight: logoLight || "logo" } },
    });
    return [walletServicesPlugin];
  }, [walletPlugin, chainNamespace]);
  
  // Modal Params manipulation
  const loginMethodsConfig = useMemo(() => {
    if (loginProviders.length === 0) return undefined;
  
    if (!Object.values(loginMethods).some((x) => x.showOnModal)) {
      return undefined;
    }
  
    const loginMethodsConfig = JSON.parse(JSON.stringify(loginMethods));
    return loginMethodsConfig;
  }, [loginProviders]);
  
  const modalParams = useMemo(() => {
    const modalConfig = {
      [WALLET_ADAPTERS.AUTH]: {
        label: "auth",
        loginMethods: loginMethodsConfig,
      },
    };
    return modalConfig;
  }, [loginMethodsConfig]);


  const chainConfig = useMemo(() => chainConfigs[chainNamespace as ChainNamespaceType].find((x) => x.chainId === chain) || chainConfigs[chainNamespace as ChainNamespaceType][0], [chainNamespace, chain]);

  // Populate the private key provider based on the chain selected
  const privateKeyProvider = useMemo<IBaseProvider<string>>(() => {
    switch (chainNamespace) {
      case CHAIN_NAMESPACES.EIP155:
        return new EthereumPrivateKeyProvider({
          config: {
            chainConfig,
          },
        });
      case CHAIN_NAMESPACES.SOLANA:
        return new SolanaPrivateKeyProvider({
          config: {
            chainConfig,
          },
        });
      default:
        return new CommonPrivateKeyProvider({
          config: {
            chainConfig,
          },
        });
      }
  }, [chainNamespace, chainConfig]);

  // Account Abstraction Provider
  const showAAProviderSettings = useMemo(() => chainNamespace === CHAIN_NAMESPACES.EIP155, [chainNamespace]);
  const accountAbstractionProvider = useMemo((): IBaseProvider<IProvider> | undefined => {
    if (!showAAProviderSettings || !useAccountAbstractionProvider) return undefined;
  
    const chainConfig = chainConfigs[chainNamespace as ChainNamespaceType].find((x) => x.chainId === chain)!;
    // setup aa provider
    let smartAccountInit: ISmartAccount;
    switch (smartAccountType) {
      case "biconomy":
        smartAccountInit = new BiconomySmartAccount();
        break;
      case "kernel":
        smartAccountInit = new KernelSmartAccount();
        break;
      case "trust":
        smartAccountInit = new TrustSmartAccount();
        break;
      // case "light":
      //   smartAccountInit = new LightSmartAccount();
      //   break;
      // case "simple":
      //   smartAccountInit = new SimpleSmartAccount();
      //   break;
      case "safe":
      default:
        smartAccountInit = new SafeSmartAccount();
        break;
    }
  
    return new AccountAbstractionProvider({
      config: {
        chainConfig,
        bundlerConfig: { url: bundlerUrl ?? getDefaultBundlerUrl(chainConfig.chainId) },
        paymasterConfig: paymasterUrl
          ? {
              url: paymasterUrl,
            }
          : undefined,
        smartAccountInit,
      },
    });
  }, [chainNamespace, chain, useAAWithExternalWallet, useAccountAbstractionProvider]);

  // Web3Auth Options
  const web3authOptions = useMemo<Web3AuthOptions>(() => {
    return {
      clientId: clientIds[network],
      privateKeyProvider: privateKeyProvider,
      web3AuthNetwork: network,
      uiConfig: whiteLabel?.enable ? { ...whiteLabel.config } : undefined,
      accountAbstractionProvider: accountAbstractionProvider,
      useAAWithExternalWallet: useAAWithExternalWallet,
      // TODO: Add more options
      // chainConfig?: CustomChainConfig;
      // enableLogging?: boolean;
      // storageKey?: "session" | "local";
      // sessionTime?: number;
      // useCoreKitKey?: boolean;
      enableLogging: false,
    };
  },[network, privateKeyProvider, whiteLabel, useAAWithExternalWallet, accountAbstractionProvider]);

  // Web3Auth Config
  const web3authConfig = useMemo<Web3AuthContextConfig>(() => ({
    adapters: externalAdapters,
    plugins: walletPlugins,
    modalConfig: modalParams,
    web3AuthOptions: web3authOptions,
    hideWalletDiscovery: !showWalletDiscovery,
  }), [externalAdapters, walletPlugins, modalParams, web3authOptions, showWalletDiscovery]); 

  const getExternalAdapterByName = async (name: string): Promise<IAdapter<unknown>[]> => {
    switch (name) {
      case "coinbase":
        return [new CoinbaseAdapter() as IAdapter<unknown>];
      // case "auth":
      //   return new AuthAdapter();
      case "torus-evm":
        return [new TorusWalletAdapter()];
      case "torus-solana":
        return [new SolanaWalletAdapter() as IAdapter<unknown>];
      case "wallet-connect-v2":
        return [new WalletConnectV2Adapter({ adapterSettings: { walletConnectInitOptions: { projectId: "d3c63f19f9582f8ba48e982057eb096b" } } }) as IAdapter<unknown>];
      case "injected-evm":
        return getInjectedEvmAdapters({ options: web3authOptions });
      case "injected-solana":
        return getInjectedSolanaAdapters({ options: web3authOptions });
      default:
        return [];
    }
  };

  const chainOptions = useMemo(() => chainConfigs[chainNamespace as ChainNamespaceType].map((x) => ({ name: `${x.chainId} ${x.tickerName}`, value: x.chainId })), [chainNamespace]);

  const adapterOptions = useMemo(() => chainNamespace === CHAIN_NAMESPACES.EIP155 ? [
    { name: "coinbase-adapter", value: "coinbase" },
    { name: "torus-evm-adapter", value: "torus-evm" },
    { name: "wallet-connect-v2-adapter", value: "wallet-connect-v2" },
    { name: "injected-adapters", value: "injected-evm" },
  ] : [
    { name: "torus-solana-adapter", value: "torus-solana" },
    { name: "injected-adapters", value: "injected-solana" },
  ], [chainNamespace]);

  return (
    <AppContext.Provider value={{ 
      web3authConfig,

      network,
      chainNamespace,
      chain,
      whiteLabel,
      loginProviders,
      adapters,
      loginMethods,
      walletPlugin,
      showWalletDiscovery,
      useAccountAbstractionProvider,
      useAAWithExternalWallet,
      smartAccountType,
      bundlerUrl,
      paymasterUrl,

      setNetWork,
      setChainNamespace,
      setChain,
      setWhiteLabel,
      setLoginProviders,
      setAdapters,
      setLoginMethods,
      setWalletPlugin,
      setShowWalletDiscovery,
      setUseAccountAbstractionProvider,
      setUseAAWithExternalWallet,
      setSmartAccountType,
      setBundlerUrl,
      setPaymasterUrl,

      networkOptions,
      chainNamespaceOptions,
      chainOptions,
      adapterOptions,
      loginProviderOptions,
      loginMethodOptions: loginProviderOptions,
      languageOptions: languageOptions,
      smartAccountTypeOptions: SmartAccountOptions,

    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppProvider');
  }
  return context;
};