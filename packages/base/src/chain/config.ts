import { CHAIN_NAMESPACES, ChainNamespaceType, CustomChainConfig } from "./IChainInterface";
const getDefaultNetworkId = (chainNamespace: ChainNamespaceType): number => {
  if (chainNamespace === CHAIN_NAMESPACES.EIP155) {
    return 1;
  } else if (chainNamespace === CHAIN_NAMESPACES.SOLANA) {
    return 1;
  } else if (chainNamespace === CHAIN_NAMESPACES.XRPL) {
    return 1;
  }
  throw new Error(`Chain namespace ${chainNamespace} is not supported`);
};

export const mainnet: CustomChainConfig = {
  id: 1,
  name: "Ethereum Mainnet",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  logo: "https://images.toruswallet.io/eth.svg",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.ankr.com/eth"],
    },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://etherscan.io/",
    },
  },
  contracts: {
    ensRegistry: {
      address: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    },
    ensUniversalResolver: {
      address: "0xE4Acdd618deED4e6d2f03b9bf62dc6118FC9A4da",
      blockCreated: 16773775,
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 14353601,
    },
  },
};

export const goerli: CustomChainConfig = {
  id: 5,
  name: "Goerli",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  logo: "https://images.toruswallet.io/eth.svg",
  nativeCurrency: { name: "Goerli Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.ankr.com/eth_goerli"],
    },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://goerli.etherscan.io",
      apiUrl: "https://api-goerli.etherscan.io/api",
    },
  },
  contracts: {
    ensRegistry: {
      address: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    },
    ensUniversalResolver: {
      address: "0xfc4AC75C46C914aF5892d6d3eFFcebD7917293F1",
      blockCreated: 10_339_206,
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 6507670,
    },
  },
  testnet: true,
};

export const sepolia: CustomChainConfig = {
  id: 11_155_111,
  name: "Sepolia",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  logo: "https://images.toruswallet.io/eth.svg",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
      apiUrl: "https://api-sepolia.etherscan.io/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 751532,
    },
    ensRegistry: { address: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" },
    ensUniversalResolver: {
      address: "0xc8Af999e38273D658BE1b921b88A9Ddf005769cC",
      blockCreated: 5_317_080,
    },
  },
  testnet: true,
};

export const polygon: CustomChainConfig = {
  id: 137,
  name: "Polygon",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  logo: "https://images.toruswallet.io/polygon.svg",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://polygon-rpc.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: "https://polygonscan.com",
      apiUrl: "https://api.polygonscan.com/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 25770160,
    },
  },
};

export const polygonAmoy: CustomChainConfig = {
  id: 80_002,
  name: "Polygon Amoy",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  logo: "https://images.toruswallet.io/polygon.svg",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc-amoy.polygon.technology"],
    },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: "https://amoy.polygonscan.com",
      apiUrl: "https://api-amoy.polygonscan.com/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 3127388,
    },
  },
  testnet: true,
};

export const bscTestnet: CustomChainConfig = {
  id: 97,
  name: "Binance Smart Chain Testnet",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  logo: "https://images.toruswallet.io/bnb.png",
  nativeCurrency: {
    decimals: 18,
    name: "BNB",
    symbol: "tBNB",
  },
  rpcUrls: {
    default: { http: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"] },
  },
  blockExplorers: {
    default: {
      name: "BscScan",
      url: "https://testnet.bscscan.com",
      apiUrl: "https://testnet.bscscan.com/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 17422483,
    },
  },
  testnet: true,
};

export const bsc: CustomChainConfig = {
  id: 56,
  name: "BNB Smart Chain",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  logo: "https://images.toruswallet.io/bnb.png",
  nativeCurrency: {
    decimals: 18,
    name: "BNB",
    symbol: "BNB",
  },
  rpcUrls: {
    default: { http: ["https://rpc.ankr.com/bsc"] },
  },
  blockExplorers: {
    default: {
      name: "BscScan",
      url: "https://bscscan.com",
      apiUrl: "https://api.bscscan.com/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 15921452,
    },
  },
};

export const cronos: CustomChainConfig = {
  id: 25,
  name: "Cronos Mainnet",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  logo: "https://images.toruswallet.io/cro.svg",
  nativeCurrency: {
    decimals: 18,
    name: "Cronos",
    symbol: "CRO",
  },
  rpcUrls: {
    default: { http: ["https://evm.cronos.org"] },
  },
  blockExplorers: {
    default: {
      name: "Cronos Explorer",
      url: "https://explorer.cronos.org",
      apiUrl: "https://explorer-api.cronos.org/mainnet/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 1963112,
    },
  },
};

export const cronosTestnet: CustomChainConfig = {
  id: 338,
  name: "Cronos Testnet",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  logo: "https://images.toruswallet.io/cro.svg",
  nativeCurrency: {
    decimals: 18,
    name: "CRO",
    symbol: "tCRO",
  },
  rpcUrls: {
    default: { http: ["https://evm-t3.cronos.org"] },
  },
  blockExplorers: {
    default: {
      name: "Cronos Explorer",
      url: "https://cronos.org/explorer/testnet3",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 10191251,
    },
  },
  testnet: true,
};

export const klaytn: CustomChainConfig = {
  id: 8_217,
  name: "Klaytn",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  logo: "https://images.toruswallet.io/klaytn.svg",
  nativeCurrency: {
    decimals: 18,
    name: "Klaytn",
    symbol: "KLAY",
  },
  rpcUrls: {
    default: { http: ["https://public-en-cypress.klaytn.net"] },
  },
  blockExplorers: {
    default: {
      name: "KlaytnScope",
      url: "https://scope.klaytn.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 96002415,
    },
  },
};

export const solana: CustomChainConfig = {
  id: 1,
  name: "Solana Mainnet",
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  logo: "https://images.toruswallet.io/sol.svg",
  nativeCurrency: {
    decimals: 9,
    name: "Solana",
    symbol: "SOL",
  },
  blockExplorers: {
    default: {
      name: "Solana Explorer",
      url: "https://explorer.solana.com",
    },
  },
  rpcUrls: {
    default: { http: ["https://rpc.ankr.com/solana"] },
  },
};

export const solanaTestnet: CustomChainConfig = {
  id: 2,
  name: "Solana Testnet",
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  logo: "https://images.toruswallet.io/sol.svg",
  nativeCurrency: {
    decimals: 9,
    name: "Solana",
    symbol: "SOL",
  },
  blockExplorers: {
    default: {
      name: "Solana Explorer",
      url: "https://explorer.solana.com?cluster=testnet",
    },
  },
  rpcUrls: {
    default: { http: ["https://api.testnet.solana.com"] },
  },
  testnet: true,
};

export const solanaDevnet: CustomChainConfig = {
  id: 3,
  name: "Solana Devnet",
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  logo: "https://images.toruswallet.io/sol.svg",
  nativeCurrency: {
    decimals: 9,
    name: "Solana",
    symbol: "SOL",
  },
  blockExplorers: {
    default: {
      name: "Solana Explorer",
      url: "https://explorer.solana.com?cluster=devnet",
    },
  },
  rpcUrls: {
    default: { http: ["https://api.devnet.solana.com"] },
  },
  testnet: true,
};

export const xrpl: CustomChainConfig = {
  id: 1,
  name: "XRPL Mainnet",
  chainNamespace: CHAIN_NAMESPACES.XRPL,
  logo: "https://images.toruswallet.io/XRP.svg",
  nativeCurrency: {
    decimals: 15,
    name: "XRP",
    symbol: "XRP",
  },
  rpcUrls: {
    default: { http: ["https://ripple-node.tor.us"] },
  },
  blockExplorers: {
    default: {
      name: "XRPL",
      url: "https://livenet.xrpl.org",
    },
  },
};

export const xrplTestnet: CustomChainConfig = {
  id: 2,
  name: "XRPL Testnet",
  chainNamespace: CHAIN_NAMESPACES.XRPL,
  logo: "https://images.toruswallet.io/XRP.svg",
  nativeCurrency: {
    decimals: 15,
    name: "XRP",
    symbol: "XRP",
  },
  rpcUrls: {
    default: { http: ["https://testnet-ripple-node.tor.us"] },
  },
  blockExplorers: {
    default: {
      name: "XRPL Testnet",
      url: "https://testnet.xrpl.org",
    },
  },
  testnet: true,
};

export const xrplDevnet: CustomChainConfig = {
  id: 3,
  name: "XRPL Devnet",
  chainNamespace: CHAIN_NAMESPACES.XRPL,
  logo: "https://images.toruswallet.io/XRP.svg",
  nativeCurrency: {
    decimals: 15,
    name: "XRP",
    symbol: "XRP",
  },
  rpcUrls: {
    default: { http: ["https://devnet-ripple-node.tor.us"] },
  },
  blockExplorers: {
    default: {
      name: "XRPL Devnet",
      url: "https://devnet.xrpl.org",
    },
  },
  testnet: true,
};

export const getEvmChainConfig = (chainId: number): CustomChainConfig | null => {
  if (chainId === 1) return mainnet;
  if (chainId === 5) return goerli;
  if (chainId === 11155111) return sepolia;
  if (chainId === 137) return polygon;
  if (chainId === 80002) return polygonAmoy;
  if (chainId === 56) return bsc;
  if (chainId === 97) return bscTestnet;
  if (chainId === 25) return cronos;
  if (chainId === 338) return cronosTestnet;
  if (chainId === 8217) return klaytn;

  return null;
};

export const getSolanaChainConfig = (chainId: number): CustomChainConfig | null => {
  if (chainId === 1) return solana;
  if (chainId === 2) return solanaTestnet;
  if (chainId === 3) return solanaDevnet;

  return null;
};

export const getXrplChainConfig = (chainId: number): CustomChainConfig | null => {
  if (chainId === 1) return xrpl;
  if (chainId === 2) return xrplTestnet;
  if (chainId === 3) return xrplDevnet;

  return null;
};

export const getChainConfig = (chainNamespace: ChainNamespaceType, chainId?: number | string): CustomChainConfig | null => {
  if (chainNamespace === CHAIN_NAMESPACES.OTHER) return null;
  const finalChainId = chainId ? (typeof chainId === "number" ? chainId : parseInt(chainId, 16)) : getDefaultNetworkId(chainNamespace);
  if (chainNamespace === CHAIN_NAMESPACES.EIP155) {
    return getEvmChainConfig(finalChainId);
  } else if (chainNamespace === CHAIN_NAMESPACES.SOLANA) {
    return getSolanaChainConfig(finalChainId);
  } else if (chainNamespace === CHAIN_NAMESPACES.XRPL) {
    return getXrplChainConfig(finalChainId);
  }
  return null;
};
