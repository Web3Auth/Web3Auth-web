<script setup lang="ts">
import {
  AccountAbstractionProvider,
  ISmartAccount,
  KernelSmartAccount,
  MetamaskSmartAccount,
  NexusSmartAccount,
  // LightSmartAccount,
  SafeSmartAccount,
  TrustSmartAccount,
  // SimpleSmartAccount,
} from "@web3auth/account-abstraction-provider";
import { CHAIN_NAMESPACES, ChainNamespaceType, IAdapter, IBaseProvider, IProvider, storageAvailable, WALLET_ADAPTERS } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { CoinbaseAdapter } from "@web3auth/coinbase-adapter";
import { getInjectedAdapters as getInjectedEvmAdapters } from "@web3auth/default-evm-adapter";
import { getInjectedAdapters as getInjectedSolanaAdapters } from "@web3auth/default-solana-adapter";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { type Web3AuthOptions } from "@web3auth/modal";
import { Web3AuthProvider } from "@web3auth/modal-vue-composables";
import { NFTCheckoutPlugin } from "@web3auth/nft-checkout-plugin";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { TorusWalletAdapter } from "@web3auth/torus-evm-adapter";
import { SolanaWalletAdapter } from "@web3auth/torus-solana-adapter";
import { WalletConnectV2Adapter } from "@web3auth/wallet-connect-v2-adapter";
import { WalletServicesPlugin } from "@web3auth/wallet-services-plugin";
import { computed, onBeforeMount, ref, watch } from "vue";

import AppDashboard from "./components/AppDashboard.vue";
import AppHeader from "./components/AppHeader.vue";
import AppSettings from "./components/AppSettings.vue";
import { chainConfigs, clientIds, getDefaultBundlerUrl, NFT_CHECKOUT_CLIENT_ID } from "./config";
import { formDataStore } from "./store/form";

const formData = formDataStore;

const externalAdapters = ref<IAdapter<unknown>[]>([]);

const walletPlugins = computed(() => {
  if (formData.chainNamespace !== CHAIN_NAMESPACES.EIP155) return [];
  const plugins = [];
  if (formData.nftCheckoutPlugin.enable) {
    const nftCheckoutPlugin = new NFTCheckoutPlugin({
      clientId: NFT_CHECKOUT_CLIENT_ID,
    });
    plugins.push(nftCheckoutPlugin);
  }
  if (formData.walletPlugin.enable) {
    const { logoDark, logoLight, confirmationStrategy } = formData.walletPlugin;
    const walletServicesPlugin = new WalletServicesPlugin({
      walletInitOptions: {
        whiteLabel: { showWidgetButton: true, logoDark: logoDark || "logo", logoLight: logoLight || "logo" },
        confirmationStrategy,
      },
    });
    plugins.push(walletServicesPlugin);
  }
  return plugins;
});

const chainOptions = computed(() =>
  chainConfigs[formData.chainNamespace as ChainNamespaceType].map((x) => ({
    name: `${x.chainId} ${x.tickerName}`,
    value: x.chainId,
  }))
);

// Populate the private key provider based on the chain selected
const privateKeyProvider = computed((): IBaseProvider<string> => {
  const chainConfig = chainConfigs[formData.chainNamespace as ChainNamespaceType].find((x) => x.chainId === formData.chain)!;

  switch (formData.chainNamespace) {
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
});

const showAAProviderSettings = computed(() => formData.chainNamespace === CHAIN_NAMESPACES.EIP155);

const accountAbstractionProvider = computed((): IBaseProvider<IProvider> | undefined => {
  const { useAccountAbstractionProvider } = formData;
  if (!showAAProviderSettings.value || !useAccountAbstractionProvider) return undefined;

  const chainConfig = chainConfigs[formData.chainNamespace as ChainNamespaceType].find((x) => x.chainId === formData.chain)!;
  // setup aa provider
  let smartAccountInit: ISmartAccount;
  switch (formData.smartAccountType) {
    case "nexus":
      smartAccountInit = new NexusSmartAccount();
      break;
    case "kernel":
      smartAccountInit = new KernelSmartAccount();
      break;
    case "trust":
      smartAccountInit = new TrustSmartAccount();
      break;
    case "metamask":
      smartAccountInit = new MetamaskSmartAccount();
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
      bundlerConfig: { url: formData.bundlerUrl ?? getDefaultBundlerUrl(chainConfig.chainId) },
      paymasterConfig: formData.paymasterUrl
        ? {
            url: formData.paymasterUrl,
          }
        : undefined,
      smartAccountInit,
    },
  });
});

// Options for reinitializing the web3Auth object
const options = computed((): Web3AuthOptions => {
  const {
    whiteLabel: { config: whiteLabel, enable: enabledWhiteLabel },
  } = formData;
  return {
    clientId: clientIds[formData.network],
    privateKeyProvider: privateKeyProvider.value as IBaseProvider<string>,
    web3AuthNetwork: formData.network,
    uiConfig: enabledWhiteLabel ? { ...whiteLabel } : undefined,
    accountAbstractionProvider: accountAbstractionProvider.value,
    useAAWithExternalWallet: formData.useAAWithExternalWallet,
    // TODO: Add more options
    // chainConfig?: CustomChainConfig;
    // enableLogging?: boolean;
    // storageKey?: "session" | "local";
    // sessionTime?: number;
    // useCoreKitKey?: boolean;
    enableLogging: true,
  };
});

const loginMethodsConfig = computed(() => {
  if (formData.loginProviders.length === 0) return undefined;

  if (!Object.values(formData.loginMethods).some((x) => x.showOnModal)) {
    return undefined;
  }

  const loginMethods = JSON.parse(JSON.stringify(formData.loginMethods));
  return loginMethods;
});

const modalParams = computed(() => {
  const modalConfig = {
    [WALLET_ADAPTERS.AUTH]: {
      label: "auth",
      loginMethods: loginMethodsConfig.value,
    },
  };
  return modalConfig;
});

const getExternalAdapterByName = (name: string): IAdapter<unknown>[] => {
  switch (name) {
    case "coinbase":
      return [new CoinbaseAdapter()];
    // case "auth":
    //   return new AuthAdapter();
    case "torus-evm":
      return [new TorusWalletAdapter()];
    case "torus-solana":
      return [new SolanaWalletAdapter()];
    case "wallet-connect-v2":
      return [new WalletConnectV2Adapter({ adapterSettings: { walletConnectInitOptions: { projectId: "d3c63f19f9582f8ba48e982057eb096b" } } })];
    case "injected-evm":
      return getInjectedEvmAdapters({ options: options.value });
    case "injected-solana":
      return getInjectedSolanaAdapters({ options: options.value });
    default:
      return [];
  }
};

onBeforeMount(() => {
  if (storageAvailable("sessionStorage")) {
    const storedValue = sessionStorage.getItem("state");
    try {
      if (storedValue) {
        // console.log("storedValue", storedValue);
        const json = JSON.parse(storedValue);
        formData.adapters = json.adapters;
        formData.chain = json.chain;
        formData.chainNamespace = json.chainNamespace;
        formData.loginProviders = json.loginProviders;
        formData.showWalletDiscovery = json.showWalletDiscovery;
        formData.network = json.network;
        formData.whiteLabel = json.whiteLabel;
        formData.walletPlugin = json.walletPlugin;
        formData.nftCheckoutPlugin = json.nftCheckoutPlugin || {};
        formData.useAccountAbstractionProvider = json.useAccountAbstractionProvider;
        formData.smartAccountType = json.smartAccountType;
        formData.bundlerUrl = json.bundlerUrl;
        formData.paymasterUrl = json.paymasterUrl;
      }
    } catch (error) {}
  }
  if (!chainOptions.value.find((option) => option.value === formData.chain)) formData.chain = chainOptions.value[0]?.value;
});

watch(formData, () => {
  if (storageAvailable("sessionStorage")) sessionStorage.setItem("state", JSON.stringify(formData));
});

// Every time the form data changes, reinitialize the web3Auth object
watch(
  () => formData.adapters,
  async () => {
    let adapters: IAdapter<unknown>[] = [];
    for (let i = 0; i <= formData.adapters.length; i += 1) {
      adapters = adapters.concat(getExternalAdapterByName(formData.adapters[i]));
    }
    externalAdapters.value = adapters;
  }
);

const configs = computed(() => {
  return {
    adapters: externalAdapters.value,
    web3AuthOptions: options.value,
    plugins: walletPlugins.value,
    modalConfig: modalParams.value,
    hideWalletDiscovery: !formData.showWalletDiscovery,
  };
});
</script>

<template>
  <Web3AuthProvider :config="configs">
    <AppHeader />
    <main class="relative flex flex-col lg:h-[calc(100dvh_-_110px)]">
      <AppSettings />
      <AppDashboard />
    </main>
  </Web3AuthProvider>
</template>
