import { randomId } from "@toruslabs/base-controllers";
import { createAsyncMiddleware, JRPCMiddleware, JRPCRequest, mergeMiddleware } from "@toruslabs/openlogin-jrpc";
import { CustomChainConfig } from "@web3auth/base";
import { SubmitResponse, Transaction } from "xrpl";

export const RPC_METHODS = {
  GET_ACCOUNTS: "xrpl_getAccounts",
  GET_KEY_PAIR: "xrpl_getKeyPair",
  GET_PUBLIC_KEY: "xrpl_getPublicKey",
  SIGN_MESSAGE: "xrpl_signMessage",
  SIGN_TRANSACTION: "xrpl_signTransaction",
  SUBMIT_TRANSACTION: "xrpl_submitTransaction",
  ADD_CHAIN: "xrpl_addChain",
  SWITCH_CHAIN: "xrpl_switchChain",
  CHAIN_ID: "xrpl_chainId",
  PROVIDER_CHAIN_CONFIG: "xrpl_providerChainConfig",
};

export type KeyPair = { publicKey: string; privateKey: string };
export interface IProviderHandlers {
  getAccounts: (req: JRPCRequest<unknown>) => Promise<string[]>;
  getKeyPair: (req: JRPCRequest<unknown>) => Promise<KeyPair>;
  getPublicKey: (req: JRPCRequest<unknown>) => Promise<string>;
  signTransaction: (req: JRPCRequest<{ transaction: Transaction; multisign: string | boolean }>) => Promise<{ tx_blob: string; hash: string }>;
  submitTransaction: (req: JRPCRequest<{ transaction: Transaction }>) => Promise<SubmitResponse>;
  signMessage: (req: JRPCRequest<{ message: string }>) => Promise<{ signature: string }>;
}

export function createGetAccountsMiddleware({ getAccounts }: { getAccounts: IProviderHandlers["getAccounts"] }): JRPCMiddleware<unknown, unknown> {
  return createAsyncMiddleware(async (request, response, next) => {
    const { method } = request;

    // hack to override big ids from fetch middleware which are not supported in xrpl servers
    // TODO: fix this for xrpl controllers.
    request.id = randomId();

    if (method !== RPC_METHODS.GET_ACCOUNTS) return next();

    if (!getAccounts) throw new Error("WalletMiddleware - opts.getAccounts not provided");
    // This calls from the prefs controller
    const accounts = await getAccounts(request);
    response.result = accounts;
    return undefined;
  });
}

export function createGenericJRPCMiddleware<T, U>(targetMethod: string, handler: (req: JRPCRequest<T>) => Promise<U>): JRPCMiddleware<T, unknown> {
  return createAsyncMiddleware<T, unknown>(async (request, response, next) => {
    const { method } = request;
    if (method !== targetMethod) return next();

    if (!handler) throw new Error(`WalletMiddleware - ${targetMethod} not provided`);

    const result = await handler(request);

    response.result = result;
    return undefined;
  });
}

export function createXRPLMiddleware(providerHandlers: IProviderHandlers): JRPCMiddleware<unknown, unknown> {
  const { getAccounts, submitTransaction, signTransaction, signMessage, getKeyPair, getPublicKey } = providerHandlers;

  return mergeMiddleware([
    createGetAccountsMiddleware({ getAccounts }),
    createGenericJRPCMiddleware<{ transaction: Transaction; multisign: string | boolean }, { tx_blob: string; hash: string }>(
      RPC_METHODS.SIGN_TRANSACTION,
      signTransaction
    ) as JRPCMiddleware<unknown, unknown>,
    createGenericJRPCMiddleware<{ transaction: Transaction }, SubmitResponse>(RPC_METHODS.SUBMIT_TRANSACTION, submitTransaction) as JRPCMiddleware<
      unknown,
      unknown
    >,
    createGenericJRPCMiddleware<{ message: string }, { signature: string }>(RPC_METHODS.SIGN_MESSAGE, signMessage) as JRPCMiddleware<
      unknown,
      unknown
    >,
    createGenericJRPCMiddleware<void, KeyPair>(RPC_METHODS.GET_KEY_PAIR, getKeyPair) as JRPCMiddleware<unknown, unknown>,
    createGenericJRPCMiddleware<void, string>(RPC_METHODS.GET_PUBLIC_KEY, getPublicKey) as JRPCMiddleware<unknown, unknown>,
  ]);
}

export type AddXRPLChainParameter = CustomChainConfig;

export interface IChainSwitchHandlers {
  addChainConfig: (req: JRPCRequest<AddXRPLChainParameter>) => Promise<void>;
  switchChain: (req: JRPCRequest<{ chainId: string }>) => Promise<void>;
}
export function createChainSwitchMiddleware({ addChainConfig, switchChain }: IChainSwitchHandlers): JRPCMiddleware<unknown, unknown> {
  return mergeMiddleware([
    createGenericJRPCMiddleware<AddXRPLChainParameter, void>(RPC_METHODS.ADD_CHAIN, addChainConfig) as JRPCMiddleware<unknown, unknown>,
    createGenericJRPCMiddleware<{ chainId: string }, void>(RPC_METHODS.SWITCH_CHAIN, switchChain) as JRPCMiddleware<unknown, unknown>,
  ]);
}
