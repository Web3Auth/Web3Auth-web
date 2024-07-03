import { CHAIN_NAMESPACES, CustomChainConfig, getChainConfig, IAdapter, IWeb3AuthCoreOptions } from "@web3auth/base";

export const getDefaultExternalAdapters = async (params: { options: IWeb3AuthCoreOptions }): Promise<IAdapter<unknown>[]> => {
  const { options } = params;
  const { clientId, chainConfig, sessionTime, web3AuthNetwork, useCoreKitKey } = options;
  if (!Object.values(CHAIN_NAMESPACES).includes(chainConfig.chainNamespace)) throw new Error(`Invalid chainNamespace: ${chainConfig.chainNamespace}`);
  const finalChainConfig = {
    ...(getChainConfig(chainConfig.chainNamespace, chainConfig?.id) as CustomChainConfig),
    ...(chainConfig || {}),
  };
  const [{ SolanaWalletAdapter }, { PhantomAdapter }] = await Promise.all([
    import("@web3auth/torus-solana-adapter"),
    import("@web3auth/phantom-adapter"),
  ]);
  const solanaWalletAdapter = new SolanaWalletAdapter({ chainConfig: finalChainConfig, clientId, sessionTime, web3AuthNetwork, useCoreKitKey });

  const phantomAdapter = new PhantomAdapter({ chainConfig: finalChainConfig, clientId, sessionTime, web3AuthNetwork, useCoreKitKey });

  return [solanaWalletAdapter, phantomAdapter];
};
