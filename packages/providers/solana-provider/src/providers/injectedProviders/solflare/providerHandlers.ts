import { providerErrors } from "@metamask/rpc-errors";
import { Connection } from "@solana/web3.js";
import { JRPCRequest } from "@toruslabs/openlogin-jrpc";
import { CustomChainConfig, SafeEventEmitterProvider } from "@web3auth/base";

import { IBaseWalletProvider, SolflareWallet, TransactionOrVersionedTransaction } from "../../../interface";
import { IProviderHandlers } from "../../../rpc/solanaRpcMiddlewares";
import { getBaseProviderHandlers } from "../base/providerHandlers";

export const getSolflareHandlers = (injectedProvider: SolflareWallet, getProviderEngineProxy: () => SafeEventEmitterProvider): IProviderHandlers => {
  const solflareProviderHandlers = getBaseProviderHandlers(injectedProvider as IBaseWalletProvider);
  solflareProviderHandlers.signAndSendTransaction = async (
    req: JRPCRequest<{ message: TransactionOrVersionedTransaction }>
  ): Promise<{ signature: string }> => {
    const provider = getProviderEngineProxy();
    if (!provider) throw providerErrors.custom({ message: "Provider is not initialized", code: 4902 });

    const transaction = await injectedProvider.signTransaction(req.params.message);
    const chainConfig = (await provider.request<never, CustomChainConfig>({ method: "solana_provider_config" })) as CustomChainConfig;
    const conn = new Connection(chainConfig.rpcUrls?.default?.http?.[0]);
    const res = await conn.sendRawTransaction(transaction.serialize());
    return { signature: res };
  };

  solflareProviderHandlers.signMessage = async (req: JRPCRequest<{ message: Uint8Array; display?: string }>): Promise<Uint8Array> => {
    const sigData = await injectedProvider.signMessage(req.params.message, req.params.display as "utf8" | "hex");
    return sigData;
  };
  return solflareProviderHandlers;
};
