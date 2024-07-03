import { providerErrors, rpcErrors } from "@metamask/rpc-errors";
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { JRPCRequest } from "@toruslabs/openlogin-jrpc";
import { CustomChainConfig, SafeEventEmitterProvider } from "@web3auth/base";
import bs58 from "bs58";

import { ISlopeProvider, TransactionOrVersionedTransaction } from "../../../interface";
import { IProviderHandlers } from "../../../rpc/solanaRpcMiddlewares";

const isVersionTransction = (transaction: TransactionOrVersionedTransaction) =>
  (transaction as VersionedTransaction).version !== undefined || transaction instanceof VersionedTransaction;

export const getSlopeHandlers = (injectedProvider: ISlopeProvider, getProviderEngineProxy: () => SafeEventEmitterProvider): IProviderHandlers => {
  const providerHandlers: IProviderHandlers = {
    requestAccounts: async () => {
      const { data } = await injectedProvider.connect();
      return [data.publicKey];
    },
    getAccounts: async () => {
      const { data } = await injectedProvider.connect();
      return [data.publicKey];
    },
    getPrivateKey: async () => {
      throw rpcErrors.methodNotSupported();
    },
    getSecretKey: async () => {
      throw rpcErrors.methodNotSupported();
    },
    signTransaction: async (req: JRPCRequest<{ message: TransactionOrVersionedTransaction }>): Promise<TransactionOrVersionedTransaction> => {
      const txMessage = req.params.message;
      if (!txMessage) throw rpcErrors.invalidRequest({ message: "Invalid transaction message" });

      const message = isVersionTransction(txMessage)
        ? (txMessage as VersionedTransaction).message.serialize()
        : (txMessage as Transaction).serializeMessage();
      const { data } = await injectedProvider.signTransaction(bs58.encode(message));
      if (!data.publicKey || !data.signature) throw new Error("Invalid signature from slope wallet");

      const publicKey = new PublicKey(data.publicKey);
      const signature = bs58.decode(data.signature);
      txMessage.addSignature(publicKey, Buffer.from(signature));
      return txMessage;
    },
    signMessage: async (req: JRPCRequest<{ message: Uint8Array }>): Promise<Uint8Array> => {
      const response = await injectedProvider.signMessage(req.params.message);
      return bs58.decode(response.data.signature);
    },
    signAndSendTransaction: async (req: JRPCRequest<{ message: TransactionOrVersionedTransaction }>): Promise<{ signature: string }> => {
      const provider = getProviderEngineProxy();
      if (!provider) throw providerErrors.custom({ message: "Provider is not initialized", code: 4902 });
      const txMessage = req.params.message;
      if (!txMessage) throw rpcErrors.invalidRequest({ message: "Invalid transaction message" });

      const message = isVersionTransction(txMessage)
        ? (txMessage as VersionedTransaction).message.serialize()
        : (txMessage as Transaction).serializeMessage();
      const { data } = await injectedProvider.signTransaction(bs58.encode(message));
      if (!data.publicKey || !data.signature) throw new Error("Invalid signature from slope wallet");
      const publicKey = new PublicKey(data.publicKey);
      const signature = bs58.decode(data.signature);
      txMessage.addSignature(publicKey, Buffer.from(signature));
      const chainConfig = (await provider.request<never, CustomChainConfig>({ method: "solana_provider_config" })) as CustomChainConfig;
      const conn = new Connection(chainConfig.rpcUrls?.default?.http?.[0]);
      const res = await conn.sendRawTransaction(txMessage.serialize());
      return { signature: res };
    },
    signAllTransactions: async (req: JRPCRequest<{ message: TransactionOrVersionedTransaction[] }>): Promise<TransactionOrVersionedTransaction[]> => {
      if (!req.params?.message || !req.params?.message.length) {
        throw rpcErrors.invalidParams("message");
      }

      const allTxns = req.params.message;
      const { length } = allTxns;

      const unsignedTx = [];

      for (let i = 0; i < length; i++) {
        const item = allTxns[i];
        const message = isVersionTransction(item) ? (item as VersionedTransaction).message.serialize() : (item as Transaction).serializeMessage();
        unsignedTx.push(bs58.encode(message));
      }
      const { msg, data } = await injectedProvider.signAllTransactions(unsignedTx);

      if (!data.publicKey || data.signatures?.length !== length) throw new Error(msg);

      const publicKey = new PublicKey(data.publicKey);

      for (let i = 0; i < length; i++) {
        const signature = bs58.decode(data.signatures[i]);
        allTxns[i].addSignature(publicKey, Buffer.from(signature));
      }

      return allTxns;
    },
  };
  return providerHandlers;
};
