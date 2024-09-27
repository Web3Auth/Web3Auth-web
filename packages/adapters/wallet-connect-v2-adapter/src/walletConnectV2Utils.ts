import type { ISignClient, SessionTypes } from "@walletconnect/types";
import { getAccountsFromNamespaces, parseAccountId } from "@walletconnect/utils";
import { type JRPCRequest, providerErrors, rpcErrors } from "@web3auth/auth";
import { WalletLoginError } from "@web3auth/base";
import type {
  AddEthereumChainParameter,
  IProviderHandlers as EthProviderHandlers,
  MessageParams,
  TransactionParams,
  TypedMessageParams,
} from "@web3auth/ethereum-provider";
import type { IProviderHandlers as SolProviderHandlers, TransactionOrVersionedTransaction } from "@web3auth/solana-provider";
import base58 from "bs58";

import { SOLANA_CAIP_CHAIN_MAP } from "./config";

async function getLastActiveSession(signClient: ISignClient): Promise<SessionTypes.Struct | null> {
  if (signClient.session.length) {
    const lastKeyIndex = signClient.session.keys.length - 1;
    return signClient.session.get(signClient.session.keys[lastKeyIndex]);
  }
  return null;
}

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent);
}

function isSolanaChain(chainId: string) {
  return chainId.startsWith("solana:");
}

export async function sendJrpcRequest<T, U>(signClient: ISignClient, chainId: string, method: string, params: U): Promise<T> {
  const session = await getLastActiveSession(signClient);
  if (!session) {
    throw providerErrors.disconnected();
  }

  if (typeof window !== "undefined" && isMobileDevice()) {
    if (session.peer.metadata.redirect && session.peer.metadata.redirect.native) {
      window.open(session.peer.metadata.redirect.native, "_blank");
    }
  }

  return signClient.request<T>({
    topic: session.topic,
    chainId,
    request: {
      method,
      params: isSolanaChain(chainId)
        ? {
            ...params,
            pubkey: session.self.publicKey,
          }
        : params,
    },
  });
}

export async function getAccounts(signClient: ISignClient): Promise<string[]> {
  const session = await getLastActiveSession(signClient);
  if (!session) {
    throw providerErrors.disconnected();
  }
  const accounts = getAccountsFromNamespaces(session.namespaces);
  if (accounts && accounts.length) {
    return [
      ...new Set(
        accounts.map((add) => {
          return parseAccountId(add).address;
        })
      ),
    ];
  }
  throw WalletLoginError.connectionError("Failed to get accounts");
}

export function getEthProviderHandlers({ connector, chainId }: { connector: ISignClient; chainId: number }): EthProviderHandlers {
  return {
    getPrivateKey: async () => {
      throw rpcErrors.methodNotSupported();
    },
    getPublicKey: async () => {
      throw rpcErrors.methodNotSupported();
    },
    getAccounts: async (_: JRPCRequest<unknown>) => {
      return getAccounts(connector);
    },
    processTransaction: async (txParams: TransactionParams, _: JRPCRequest<unknown>): Promise<string> => {
      const methodRes = await sendJrpcRequest<string, TransactionParams[]>(connector, `eip155:${chainId}`, "eth_sendTransaction", [txParams]);
      return methodRes;
    },
    processSignTransaction: async (txParams: TransactionParams, _: JRPCRequest<unknown>): Promise<string> => {
      const methodRes = await sendJrpcRequest<string, TransactionParams[]>(connector, `eip155:${chainId}`, "eth_signTransaction", [txParams]);
      return methodRes;
    },
    processEthSignMessage: async (msgParams: MessageParams<string>, _: JRPCRequest<unknown>): Promise<string> => {
      const methodRes = await sendJrpcRequest<string, string[]>(connector, `eip155:${chainId}`, "eth_sign", [msgParams.from, msgParams.data]);
      return methodRes;
    },
    processPersonalMessage: async (msgParams: MessageParams<string>, _: JRPCRequest<unknown>): Promise<string> => {
      const methodRes = await sendJrpcRequest<string, string[]>(connector, `eip155:${chainId}`, "personal_sign", [msgParams.data, msgParams.from]);
      return methodRes;
    },
    processTypedMessageV4: async (msgParams: TypedMessageParams): Promise<string> => {
      const methodRes = await sendJrpcRequest<string, unknown[]>(connector, `eip155:${chainId}`, "eth_signTypedData_v4", [
        msgParams.from,
        msgParams.data,
      ]);
      return methodRes;
    },
  };
}

export function getSolProviderHandlers({ connector, chainId }: { connector: ISignClient; chainId: string }): SolProviderHandlers {
  return {
    requestAccounts: async (_: JRPCRequest<unknown>) => {
      return getAccounts(connector);
    },
    getPrivateKey: async () => {
      throw rpcErrors.methodNotSupported();
    },
    getSecretKey: async () => {
      throw rpcErrors.methodNotSupported();
    },
    getPublicKey: async () => {
      throw rpcErrors.methodNotSupported();
    },
    getAccounts: async (_: JRPCRequest<unknown>) => {
      return getAccounts(connector);
    },
    signAllTransactions: async (_: JRPCRequest<unknown>) => {
      throw rpcErrors.methodNotSupported();
    },
    signAndSendTransaction: async (_: JRPCRequest<unknown>) => {
      throw rpcErrors.methodNotSupported();
    },
    signMessage: async (req: JRPCRequest<{ message: Uint8Array }>): Promise<Uint8Array> => {
      const methodRes = await sendJrpcRequest<{ signature: string }, { message: string }>(
        connector,
        `solana:${SOLANA_CAIP_CHAIN_MAP[chainId]}`,
        "solana_signMessage",
        {
          message: base58.encode(req.params.message),
        }
      );
      return base58.decode(methodRes.signature);
    },
    signTransaction: async (req: JRPCRequest<{ message: TransactionOrVersionedTransaction }>): Promise<TransactionOrVersionedTransaction> => {
      const [{ PublicKey }, accounts] = await Promise.all([import("@solana/web3.js"), getAccounts(connector)]);
      if (accounts.length === 0) {
        throw providerErrors.disconnected();
      }
      const methodRes = await sendJrpcRequest<{ signature: string }, { transaction: string }>(
        connector,
        `solana:${SOLANA_CAIP_CHAIN_MAP[chainId]}`,
        "solana_signTransaction",
        { transaction: req.params.message.serialize({ requireAllSignatures: false }).toString("base64") }
      );
      const finalTransaction = req.params.message;
      finalTransaction.addSignature(new PublicKey(accounts[0]), Buffer.from(base58.decode(methodRes.signature)));
      return finalTransaction;
    },
  };
}

export async function switchChain({
  connector,
  chainId,
  newChainId,
}: {
  connector: ISignClient;
  chainId: number;
  newChainId: string;
}): Promise<void> {
  await sendJrpcRequest<string, { chainId: string }[]>(connector, `eip155:${chainId}`, "wallet_switchEthereumChain", [{ chainId: newChainId }]);
}

export async function addChain({
  connector,
  chainId,
  chainConfig,
}: {
  connector: ISignClient;
  chainId: number;
  chainConfig: AddEthereumChainParameter;
}): Promise<void> {
  await sendJrpcRequest<string, AddEthereumChainParameter[]>(connector, `eip155:${chainId}`, "wallet_addEthereumChain", [chainConfig]);
}
