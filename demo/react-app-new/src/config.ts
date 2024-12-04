import { SignTypedDataMessageV4 } from "@toruslabs/ethereum-controllers";
import { LANGUAGE_TYPE, LANGUAGES, LOGIN_PROVIDER, LOGIN_PROVIDER_TYPE, WhiteLabelData } from "@web3auth/auth";
import { CHAIN_NAMESPACES, ChainNamespaceType, CustomChainConfig, IAdapter, IBaseProvider, WALLET_ADAPTERS, WEB3AUTH_NETWORK, WEB3AUTH_NETWORK_TYPE } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { WalletServicesPlugin } from "@web3auth/wallet-services-plugin";

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

export const getV4TypedData = (chainId: string): SignTypedDataMessageV4 => ({
  types: {
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


export const networkOptions = Object.values(WEB3AUTH_NETWORK).map((x) => ({ name: x, value: x }));

export const clientIds: Record<WEB3AUTH_NETWORK_TYPE, string> = {
  [WEB3AUTH_NETWORK.MAINNET]: "BJRZ6qdDTbj6Vd5YXvV994TYCqY42-PxldCetmvGTUdoq6pkCqdpuC1DIehz76zuYdaq1RJkXGHuDraHRhCQHvA",
  [WEB3AUTH_NETWORK.TESTNET]: "BHr_dKcxC0ecKn_2dZQmQeNdjPgWykMkcodEHkVvPMo71qzOV6SgtoN8KCvFdLN7bf34JOm89vWQMLFmSfIo84A",
  [WEB3AUTH_NETWORK.AQUA]: "BM34K7ZqV3QwbDt0lvJFCdr4DxS9gyn7XZ2wZUaaf0Ddr71nLjPCNNYtXuGWxxc4i7ivYdgQzFqKlIot4IWrWCE",
  [WEB3AUTH_NETWORK.CYAN]: "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk",
  [WEB3AUTH_NETWORK.SAPPHIRE_DEVNET]: "BHgArYmWwSeq21czpcarYh0EVq2WWOzflX-NTK-tY1-1pauPzHKRRLgpABkmYiIV_og9jAvoIxQ8L3Smrwe04Lw",
  [WEB3AUTH_NETWORK.SAPPHIRE_MAINNET]: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
  [WEB3AUTH_NETWORK.CELESTE]: "openlogin",
};

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
      rpcTarget: "https://api.devnet.solana.com",
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


export const chainNamespaceOptions = Object.values(CHAIN_NAMESPACES).filter(x => chainConfigs[x].length > 0).map((x) => ({ name: x, value: x }));

export const loginProviderOptions = Object.values(LOGIN_PROVIDER)
  .filter((x) => x !== "jwt" && x !== "webauthn")
  .map((x) => ({ name: x.replaceAll("_", " "), value: x }));

const intialNetwork = WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;
const initalChainId = "0x1";
const initialChainNamespace = CHAIN_NAMESPACES.EIP155;
const initialPrivateKeyProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig: chainConfigs[initialChainNamespace].find((x) => x.chainId === initalChainId) as CustomChainConfig,
  }
})
const initialWalletServicesPlugin = new WalletServicesPlugin({
  walletInitOptions: { whiteLabel: { showWidgetButton: true, logoDark: "templogo", logoLight: "templogo" } },
});

const initialOptions = {
  clientId: clientIds[intialNetwork],
  privateKeyProvider: initialPrivateKeyProvider as IBaseProvider<string>,
  web3AuthNetwork: intialNetwork,
  // uiConfig: undefined,
  // TODO: Add more options
  // chainConfig?: CustomChainConfig;
  // enableLogging?: boolean;
  // storageKey?: "session" | "local";
  // sessionTime?: number;
  // useCoreKitKey?: boolean;
  enableLogging: true,
}

export const web3authInitialConfig = {
  adapters: [] as IAdapter<unknown>[],
  web3AuthOptions: initialOptions,
  plugins: [initialWalletServicesPlugin],
  modalConfig: {
    [WALLET_ADAPTERS.AUTH]: {
      label: "auth",
      loginMethods: undefined,
    },
  },

}

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

export const getDefaultBundlerUrl = (chainId: string): string => {
  return `https://api.pimlico.io/v2/${Number(chainId)}/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
};

export type SmartAccountType = "safe" | "kernel" | "biconomy" | "trust";

export const SmartAccountOptions: { name: string; value: SmartAccountType }[] = [
  { name: "Safe", value: "safe" },
  { name: "Biconomy", value: "biconomy" },
  { name: "Kernel", value: "kernel" },
  { name: "Trust", value: "trust" },
  // { name: "Light", value: "light" },
  // { name: "Simple", value: "simple" },
];
