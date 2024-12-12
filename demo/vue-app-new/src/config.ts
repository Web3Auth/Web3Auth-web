import { LANGUAGE_TYPE, LANGUAGES, LOGIN_PROVIDER, LOGIN_PROVIDER_TYPE, WhiteLabelData } from "@web3auth/auth";
import { CHAIN_NAMESPACES, ChainNamespaceType, CustomChainConfig, WEB3AUTH_NETWORK, WEB3AUTH_NETWORK_TYPE } from "@web3auth/base";
import { SignTypedDataMessageV4 } from "@web3auth/ethereum-provider";
import { CONFIRMATION_STRATEGY, CONFIRMATION_STRATEGY_TYPE } from "@web3auth/wallet-services-plugin";

import { FormConfigSettings } from "./interfaces";

export const networkOptions = Object.values(WEB3AUTH_NETWORK).map((x) => ({ name: x, value: x }));

export const chainNamespaceOptions = Object.values(CHAIN_NAMESPACES).map((x) => ({ name: x, value: x }));

export const chainConfigs: Record<ChainNamespaceType, CustomChainConfig[]> = {
  [CHAIN_NAMESPACES.EIP155]: [
    {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      rpcTarget: "https://rpc.ankr.com/eth",
      blockExplorerUrl: "https://etherscan.io",
      logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      chainId: "0x1",
      ticker: "ETH",
      tickerName: "Ethereum",
    },
    {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      rpcTarget: "https://rpc.ankr.com/eth_sepolia",
      blockExplorerUrl: "https://sepolia.etherscan.io",
      logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      chainId: "0xaa36a7",
      ticker: "ETH",
      tickerName: "Sepolia Testnet",
    },
    {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      rpcTarget: "https://mainnet.base.org",
      blockExplorerUrl: "https://base.blockscout.com",
      chainId: "0x2105",
      displayName: "Base Mainnet",
      ticker: "ETH",
      tickerName: "Base Ethereum",
      logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    },
    {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      rpcTarget: "https://sepolia.base.org",
      blockExplorerUrl: "https://sepolia-explorer.base.org",
      chainId: "0x14A34",
      displayName: "Base Sepolia",
      ticker: "ETH",
      tickerName: "Base Sepolia Testnet",
      logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    },
    {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      rpcTarget: "https://data-seed-prebsc-2-s3.binance.org:8545",
      blockExplorerUrl: "https://testnet.bscscan.com",
      logo: "https://cryptologos.cc/logos/binance-coin-bnb-logo.png",
      chainId: "0x61",
      displayName: "Binance SmartChain Testnet",
      ticker: "BNB",
      tickerName: "BNB",
    },
    {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      chainId: "0x13882",
      rpcTarget: "https://rpc.ankr.com/polygon_amoy",
      displayName: "Polygon Amoy Testnet",
      blockExplorerUrl: "https://amoy.polygonscan.com/",
      ticker: "POL",
      tickerName: "Polygon Ecosystem Token",
    },
  ],
  [CHAIN_NAMESPACES.SOLANA]: [
    // Ref: https://namespaces.chainagnostic.org/solana/caip10
    {
      chainNamespace: CHAIN_NAMESPACES.SOLANA,
      rpcTarget: "https://api.devnet.solana.com",
      blockExplorerUrl: "https://solscan.io",
      logo: "https://cryptologos.cc/logos/solana-sol-logo.png",
      chainId: "0x3",
      ticker: "SOL",
      tickerName: "Solana Devnet",
    },
    {
      chainNamespace: CHAIN_NAMESPACES.SOLANA,
      rpcTarget: import.meta.env.VITE_SOLANA_MAINNET_RPC,
      blockExplorerUrl: "https://explorer.solana.com",
      logo: "https://cryptologos.cc/logos/solana-sol-logo.png",
      chainId: "0x1",
      ticker: "SOL",
      tickerName: "Solana Mainnet",
    },
  ],
  [CHAIN_NAMESPACES.CASPER]: [],
  [CHAIN_NAMESPACES.XRPL]: [],
  [CHAIN_NAMESPACES.OTHER]: [],
};

export const clientIds: Record<WEB3AUTH_NETWORK_TYPE, string> = {
  [WEB3AUTH_NETWORK.MAINNET]: "BJRZ6qdDTbj6Vd5YXvV994TYCqY42-PxldCetmvGTUdoq6pkCqdpuC1DIehz76zuYdaq1RJkXGHuDraHRhCQHvA",
  [WEB3AUTH_NETWORK.TESTNET]: "BHr_dKcxC0ecKn_2dZQmQeNdjPgWykMkcodEHkVvPMo71qzOV6SgtoN8KCvFdLN7bf34JOm89vWQMLFmSfIo84A",
  [WEB3AUTH_NETWORK.AQUA]: "BM34K7ZqV3QwbDt0lvJFCdr4DxS9gyn7XZ2wZUaaf0Ddr71nLjPCNNYtXuGWxxc4i7ivYdgQzFqKlIot4IWrWCE",
  [WEB3AUTH_NETWORK.CYAN]: "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk",
  [WEB3AUTH_NETWORK.SAPPHIRE_DEVNET]: "BHgArYmWwSeq21czpcarYh0EVq2WWOzflX-NTK-tY1-1pauPzHKRRLgpABkmYiIV_og9jAvoIxQ8L3Smrwe04Lw",
  [WEB3AUTH_NETWORK.SAPPHIRE_MAINNET]: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
  [WEB3AUTH_NETWORK.CELESTE]: "openlogin",
};

export const initWhiteLabel: WhiteLabelData = {
  appName: "HelloDemo",
  appUrl: "http://localhost:8080",
  logoDark: "https://images.web3auth.io/example-hello.svg", // dark logo for light background
  logoLight: "https://images.web3auth.io/example-hello-light.svg", // light logo for dark background
  mode: "auto",
  defaultLanguage: "en",
  theme: {
    primary: "#5DF0EB",
    onPrimary: "black",
  },
};

export const loginProviderOptions = Object.values(LOGIN_PROVIDER)
  .filter((x) => x !== "jwt" && x !== "webauthn")
  .map((x) => ({ name: x.replaceAll("_", " "), value: x }));

export const languageOptions: { name: string; value: LANGUAGE_TYPE }[] = [
  { name: "English", value: LANGUAGES.en },
  { name: "German", value: LANGUAGES.de },
  { name: "Japanese", value: LANGUAGES.ja },
  { name: "Korean", value: LANGUAGES.ko },
  { name: "Mandarin", value: LANGUAGES.zh },
  { name: "Spanish", value: LANGUAGES.es },
  { name: "French", value: LANGUAGES.fr },
  { name: "Portuguese", value: LANGUAGES.pt },
  { name: "Dutch", value: LANGUAGES.nl },
  { name: "Turkish", value: LANGUAGES.tr },
];

export const defaultLoginMethod: Record<LOGIN_PROVIDER_TYPE, FormConfigSettings> = loginProviderOptions.reduce(
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
  {} as Record<LOGIN_PROVIDER_TYPE, FormConfigSettings>
);

export type SmartAccountType = "safe" | "kernel" | "nexus" | "trust" | "metamask";

export const SmartAccountOptions: { name: string; value: SmartAccountType }[] = [
  { name: "Safe", value: "safe" },
  { name: "Nexus", value: "nexus" },
  { name: "Kernel", value: "kernel" },
  { name: "Trust", value: "trust" },
  { name: "Metamask", value: "metamask" },
  // { name: "Light", value: "light" },
  // { name: "Simple", value: "simple" },
];

export const getDefaultBundlerUrl = (chainId: string): string => {
  return `https://api.pimlico.io/v2/${Number(chainId)}/rpc?apikey=${import.meta.env.VITE_APP_PIMLICO_API_KEY}`;
};

export type FormData = {
  // authMode: string;
  network: WEB3AUTH_NETWORK_TYPE;
  chainNamespace: ChainNamespaceType;
  chain: string;
  whiteLabel: {
    enable: boolean;
    config: WhiteLabelData;
  };
  loginProviders: LOGIN_PROVIDER_TYPE[];
  adapters: string[];
  showWalletDiscovery: boolean;
  loginMethods: Record<LOGIN_PROVIDER_TYPE, FormConfigSettings>;
  walletPlugin: {
    enable: boolean;
    logoDark: string;
    logoLight: string;
    confirmationStrategy: Exclude<CONFIRMATION_STRATEGY_TYPE, "popup">;
  };
  nftCheckoutPlugin: {
    enable: boolean;
  };
  useAccountAbstractionProvider: boolean;
  useAAWithExternalWallet?: boolean;
  smartAccountType?: SmartAccountType;
  bundlerUrl?: string;
  paymasterUrl?: string;
};

export const getV4TypedData = (chainId: string): SignTypedDataMessageV4 => ({
  types: {
    // EIP712Domain: [
    //   {
    //     name: "name",
    //     type: "string",
    //   },
    //   {
    //     name: "version",
    //     type: "string",
    //   },
    //   {
    //     name: "chainId",
    //     type: "uint256",
    //   },
    //   {
    //     name: "verifyingContract",
    //     type: "address",
    //   },
    // ],
    Person: [
      { name: "name", type: "string" },
      { name: "wallet", type: "address" },
    ],
    Mail: [
      { name: "from", type: "Person" },
      { name: "to", type: "Person" },
      { name: "contents", type: "string" },
    ],
  },
  domain: {
    name: "Ether Mail",
    version: "1",
    chainId: Number(chainId),
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  },
  message: {
    from: {
      name: "Cow",
      wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    },
    to: {
      name: "Bob",
      wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
    },
    contents: "Hello, Bob!",
  },
});

export const confirmationStrategyOptions: { name: string; value: string }[] = [
  { name: "Modal", value: CONFIRMATION_STRATEGY.MODAL },
  { name: "Auto Approve", value: CONFIRMATION_STRATEGY.AUTO_APPROVE },
  { name: "Default", value: CONFIRMATION_STRATEGY.DEFAULT },
];

export const NFT_CHECKOUT_CONTRACT_ID = {
  FREE_MINT: "b5b4de3f-0212-11ef-a08f-0242ac190003",
  PAID_MINT: "d1145a8b-98ae-44e0-ab63-2c9c8371caff",
};

export const NFT_CHECKOUT_CLIENT_ID = "BHgArYmWwSeq21czpcarYh0EVq2WWOzflX-NTK-tY1-1pauPzHKRRLgpABkmYiIV_og9jAvoIxQ8L3Smrwe04Lw";
