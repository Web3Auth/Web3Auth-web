<script setup lang="ts">
import { Button, Card } from "@toruslabs/vue-components";
import { CHAIN_NAMESPACES, IProvider, log, WALLET_ADAPTERS, WALLET_PLUGINS } from "@web3auth/base";
import { useWeb3Auth } from "@web3auth/modal-vue-composables";
import { NFTCheckoutPlugin } from "@web3auth/nft-checkout-plugin";
import { WalletServicesPlugin } from "@web3auth/wallet-services-plugin";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { NFT_CHECKOUT_CONTRACT_ID } from "../config";
import {
  getAccounts,
  getBalance,
  getChainId,
  sendEth,
  signEthMessage,
  signPersonalMessage,
  signTransaction as signEthTransaction,
  signTypedMessage,
} from "../services/ethHandlers";
import { signAllTransactions, signAndSendTransaction, signMessage, signTransaction as signSolTransaction } from "../services/solHandlers";
import { walletSendEth, walletSignPersonalMessage, walletSignTypedMessage } from "../services/walletServiceHandlers";
import { formDataStore } from "../store/form";

const { t } = useI18n({ useScope: "global" });

const formData = formDataStore;

const { userInfo, isConnected, provider, switchChain, addAndSwitchChain, web3Auth } = useWeb3Auth();

const connectedAdapterName = ref("");

const isDisplay = computed(() => {
  const finalConnectedAdapterName = connectedAdapterName.value || web3Auth.value?.connectedAdapterName;
  return {
    dashboard: isConnected.value,
    ethServices: formData.chainNamespace === CHAIN_NAMESPACES.EIP155,
    solServices: formData.chainNamespace === CHAIN_NAMESPACES.SOLANA,
    walletServices:
      formData.chainNamespace === CHAIN_NAMESPACES.EIP155 && formData.walletPlugin.enable && finalConnectedAdapterName === WALLET_ADAPTERS.AUTH,
    nftCheckoutServices: formData.chainNamespace === CHAIN_NAMESPACES.EIP155 && formData.nftCheckoutPlugin.enable,
  };
});

const clearConsole = () => {
  const el = document.querySelector("#console>pre");
  const h1 = document.querySelector("#console>h1");
  const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
  if (h1) {
    h1.innerHTML = "";
  }
  if (el) {
    el.innerHTML = "";
  }
  if (consoleBtn) {
    consoleBtn.style.display = "none";
  }
};

const printToConsole = (...args: unknown[]) => {
  const el = document.querySelector("#console>pre");
  const h1 = document.querySelector("#console>h1");
  const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
  if (h1) {
    h1.innerHTML = args[0] as string;
  }
  if (el) {
    el.innerHTML = JSON.stringify(args[1] || {}, null, 2);
  }
  if (consoleBtn) {
    consoleBtn.style.display = "block";
  }
};

// Wallet Services
const showWalletUI = async () => {
  const walletPlugin = web3Auth.value?.getPlugin(WALLET_PLUGINS.WALLET_SERVICES) as WalletServicesPlugin;
  await walletPlugin.showWalletUi();
};
const showCheckout = async () => {
  const walletPlugin = web3Auth.value?.getPlugin(WALLET_PLUGINS.WALLET_SERVICES) as WalletServicesPlugin;
  await walletPlugin.showCheckout();
};
const showWalletConnectScanner = async () => {
  const walletPlugin = web3Auth.value?.getPlugin(WALLET_PLUGINS.WALLET_SERVICES) as WalletServicesPlugin;
  await walletPlugin.showWalletConnectScanner();
};
const onWalletSignPersonalMessage = async () => {
  const walletPlugin = web3Auth.value?.getPlugin(WALLET_PLUGINS.WALLET_SERVICES) as WalletServicesPlugin;
  await walletSignPersonalMessage(walletPlugin.wsEmbedInstance.provider, printToConsole);
};
const onWalletSignTypedData_v4 = async () => {
  const walletPlugin = web3Auth.value?.getPlugin(WALLET_PLUGINS.WALLET_SERVICES) as WalletServicesPlugin;
  await walletSignTypedMessage(walletPlugin.wsEmbedInstance.provider, printToConsole);
};
const onWalletSendEth = async () => {
  const walletPlugin = web3Auth.value?.getPlugin(WALLET_PLUGINS.WALLET_SERVICES) as WalletServicesPlugin;
  await walletSendEth(walletPlugin.wsEmbedInstance.provider, printToConsole);
};

// NFT Checkout
const showPaidMintNFTCheckout = async () => {
  const nftCheckoutPlugin = web3Auth.value?.getPlugin(WALLET_PLUGINS.NFT_CHECKOUT) as NFTCheckoutPlugin;
  nftCheckoutPlugin.show({ contractId: NFT_CHECKOUT_CONTRACT_ID.PAID_MINT });
};
const showFreeMintNFTCheckout = async () => {
  const nftCheckoutPlugin = web3Auth.value?.getPlugin(WALLET_PLUGINS.NFT_CHECKOUT) as NFTCheckoutPlugin;
  nftCheckoutPlugin.show({ contractId: NFT_CHECKOUT_CONTRACT_ID.FREE_MINT });
};

// Ethereum Provider
const onGetUserInfo = async () => {
  printToConsole("User Info", userInfo.value);
};

const onSendEth = async () => {
  await sendEth(provider.value as IProvider, printToConsole);
};

const onSignEthMessage = async () => {
  await signEthMessage(provider.value as IProvider, printToConsole);
};

const onGetAccounts = async () => {
  await getAccounts(provider.value as IProvider, printToConsole);
};

const getConnectedChainId = async () => {
  await getChainId(provider.value as IProvider, printToConsole);
};

const onGetBalance = async () => {
  await getBalance(provider.value as IProvider, printToConsole);
};

const onSwitchChain = async () => {
  log.info("switching chain");
  try {
    await switchChain({ chainId: "0x89" });
    printToConsole("switchedChain");
  } catch (error) {
    printToConsole("switchedChain error", error);
  }
};

const onAddChain = async () => {
  try {
    await addAndSwitchChain({
      chainId: "0xaa36a7",
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      rpcTarget: "https://1rpc.io/sepolia	",
      blockExplorerUrl: "https://sepolia.etherscan.io",
      displayName: "Sepolia",
      ticker: "ETH",
      tickerName: "Ethereum",
    });
    printToConsole("added chain");
  } catch (error) {
    printToConsole("add chain error", error);
  }
};

const onSignAndSendTransaction = async () => {
  await signAndSendTransaction(provider.value as IProvider, printToConsole);
};

const onSignEthTransaction = async () => {
  await signEthTransaction(provider.value as IProvider, printToConsole);
};

const onSignSolTransaction = async () => {
  await signSolTransaction(provider.value as IProvider, printToConsole);
};

const onSignMessage = async () => {
  await signMessage(provider.value as IProvider, printToConsole);
};

const onSignAllTransactions = async () => {
  await signAllTransactions(provider.value as IProvider, printToConsole);
};

const authenticateUser = async () => {
  try {
    const idToken = await web3Auth.value?.authenticateUser();
    printToConsole("idToken", idToken);
  } catch (error) {
    log.error("authenticateUser error", error);
    printToConsole("authenticateUser error", error);
  }
};

const onSignTypedData_v4 = async () => {
  await signTypedMessage(provider.value as IProvider, printToConsole);
};

const onSignPersonalMsg = async () => {
  await signPersonalMessage(provider.value as IProvider, printToConsole);
};

onMounted(() => {
  web3Auth.value?.on("connected", (data) => {
    connectedAdapterName.value = data.adapter;
  });
});
</script>

<template>
  <div v-if="isDisplay.dashboard" class="w-full h-full px-10">
    <div class="grid h-full grid-cols-1 md:grid-cols-4 lg:grid-cols-6">
      <Card class="px-4 py-4 grid col-span-1 lg:col-span-2 h-full !rounded-3xl md:!rounded-r-none !shadow-none">
        <div class="mb-2">
          <Button block size="xs" pill variant="tertiary" data-testid="btnClearConsole" @click="clearConsole">
            {{ $t("app.buttons.btnClearConsole") }}
          </Button>
        </div>
        <div class="mb-2">
          <Button block size="xs" pill @click="onGetUserInfo">
            {{ $t("app.buttons.btnGetUserInfo") }}
          </Button>
        </div>
        <Card v-if="isDisplay.walletServices" class="!h-auto lg:!h-[calc(100dvh_-_240px)] gap-4 px-4 py-4 mb-2" :shadow="false">
          <div class="mb-2 text-xl font-bold leading-tight text-left">Wallet Service</div>
          <Button block size="xs" pill class="mb-2" @click="showWalletUI">
            {{ $t("app.buttons.btnShowWalletUI") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="showWalletConnectScanner">
            {{ $t("app.buttons.btnShowWalletConnectScanner") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="showCheckout">
            {{ $t("app.buttons.btnShowCheckout") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="onWalletSignPersonalMessage">
            {{ t("app.buttons.btnSignPersonalMsg") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="onWalletSignTypedData_v4">
            {{ t("app.buttons.btnSignTypedData_v4") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="onWalletSendEth">{{ t("app.buttons.btnSendEth") }}</Button>
        </Card>
        <Card v-if="isDisplay.nftCheckoutServices" class="!h-auto lg:!h-[calc(100dvh_-_240px)] gap-4 px-4 py-4 mb-2" :shadow="false">
          <div class="mb-2 text-xl font-bold leading-tight text-left">NFT Checkout Service</div>
          <Button block size="xs" pill class="mb-2" @click="showFreeMintNFTCheckout">
            {{ $t("app.buttons.btnShowFreeMintNFTCheckout") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="showPaidMintNFTCheckout">
            {{ $t("app.buttons.btnShowPaidMintNFTCheckout") }}
          </Button>
        </Card>
        <Card v-if="isDisplay.ethServices" class="px-4 py-4 gap-4 !h-auto lg:!h-[calc(100dvh_-_240px)]" :shadow="false">
          <div class="mb-2 text-xl font-bold leading-tight text-left">Sample Transaction</div>
          <Button block size="xs" pill class="mb-2" @click="onGetAccounts">
            {{ t("app.buttons.btnGetAccounts") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="onGetBalance">
            {{ t("app.buttons.btnGetBalance") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="onSendEth">{{ t("app.buttons.btnSendEth") }}</Button>
          <Button block size="xs" pill class="mb-2" @click="onSignEthTransaction">
            {{ t("app.buttons.btnSignTransaction") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="onSignEthMessage">{{ t("app.buttons.btnSignEthMessage") }}</Button>
          <Button block size="xs" pill class="mb-2" @click="getConnectedChainId">
            {{ t("app.buttons.btnGetConnectedChainId") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="onSignTypedData_v4">
            {{ t("app.buttons.btnSignTypedData_v4") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="onSignPersonalMsg">
            {{ t("app.buttons.btnSignPersonalMsg") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="authenticateUser">Get id token</Button>
        </Card>
        <Card v-if="isDisplay.solServices" class="h-auto gap-4 px-4 py-4 mb-2" :shadow="false">
          <div class="mb-2 text-xl font-bold leading-tight text-left">Sample Transaction</div>
          <Button block size="xs" pill class="mb-2" @click="onAddChain">{{ t("app.buttons.btnAddChain") }}</Button>
          <Button block size="xs" pill class="mb-2" @click="onSwitchChain">{{ t("app.buttons.btnSwitchChain") }}</Button>
          <Button block size="xs" pill class="mb-2" @click="onSignAndSendTransaction">
            {{ t("app.buttons.btnSignAndSendTransaction") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="onSignSolTransaction">
            {{ t("app.buttons.btnSignTransaction") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="onSignMessage">{{ t("app.buttons.btnSignMessage") }}</Button>
          <Button block size="xs" pill class="mb-2" @click="onSignAllTransactions">
            {{ t("app.buttons.btnSignAllTransactions") }}
          </Button>
          <Button block size="xs" pill class="mb-2" @click="authenticateUser">Get id token</Button>
        </Card>
      </Card>
      <Card
        id="console"
        class="px-4 py-4 col-span-1 md:col-span-3 lg:col-span-4 overflow-y-auto h-full !rounded-3xl md:!rounded-l-none md:!border-l-0 !shadow-none"
      >
        <pre class="max-h-screen overflow-x-auto overflow-y-auto text-base font-normal leading-6 text-black break-words whitespace-pre-line"></pre>
      </Card>
    </div>
  </div>
</template>
