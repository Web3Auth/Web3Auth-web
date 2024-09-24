import {
  createAsyncMiddleware,
  createScaffoldMiddleware,
  JRPCMiddleware,
  JRPCRequest,
  JRPCResponse,
  mergeMiddleware,
  rpcErrors,
} from "@web3auth/auth";

import { AddEthereumChainParameter, IAccountHandlers, IChainSwitchHandlers, IProviderHandlers } from "./interfaces";
import { createWalletMiddleware } from "./walletMidddleware";

export function createEthMiddleware(providerHandlers: IProviderHandlers): JRPCMiddleware<unknown, unknown> {
  const {
    getAccounts,
    getPrivateKey,
    getPublicKey,
    processTransaction,
    processSignTransaction,
    processEthSignMessage,
    processTypedMessageV4,
    processPersonalMessage,
  } = providerHandlers;
  const ethMiddleware = mergeMiddleware([
    createScaffoldMiddleware({
      eth_syncing: false,
    }),
    createWalletMiddleware({
      getAccounts,
      getPrivateKey,
      getPublicKey,
      processTransaction,
      processEthSignMessage,
      processSignTransaction,
      processTypedMessageV4,
      processPersonalMessage,
    }) as JRPCMiddleware<unknown, unknown>,
  ]);
  return ethMiddleware;
}

export function createChainSwitchMiddleware({ addChain, switchChain }: IChainSwitchHandlers): JRPCMiddleware<unknown, unknown> {
  async function addNewChain(req: JRPCRequest<AddEthereumChainParameter[]>, res: JRPCResponse<unknown>): Promise<void> {
    const chainParams = req.params?.length ? req.params[0] : undefined;
    if (!chainParams) throw rpcErrors.invalidParams("Missing chain params");
    if (!chainParams.chainId) throw rpcErrors.invalidParams("Missing chainId in chainParams");
    if (!chainParams.rpcUrls || chainParams.rpcUrls.length === 0) throw rpcErrors.invalidParams("Missing rpcUrls in chainParams");
    if (!chainParams.nativeCurrency) throw rpcErrors.invalidParams("Missing nativeCurrency in chainParams");

    res.result = await addChain(chainParams);
  }
  async function updateChain(req: JRPCRequest<{ chainId: string }[]>, res: JRPCResponse<unknown>): Promise<void> {
    const chainParams = req.params?.length ? req.params[0] : undefined;
    if (!chainParams) throw rpcErrors.invalidParams("Missing chainId");
    res.result = await switchChain(chainParams);
  }

  return createScaffoldMiddleware({
    wallet_addEthereumChain: createAsyncMiddleware(addNewChain) as JRPCMiddleware<unknown, unknown>,
    wallet_switchEthereumChain: createAsyncMiddleware(updateChain) as JRPCMiddleware<unknown, unknown>,
  });
}

// #region account middlewares
export function createAccountMiddleware({ updatePrivatekey }: IAccountHandlers): JRPCMiddleware<unknown, unknown> {
  async function updateAccount(req: JRPCRequest<{ privateKey: string }[]>, res: JRPCResponse<unknown>): Promise<void> {
    const accountParams = req.params?.length ? req.params[0] : undefined;
    if (!accountParams?.privateKey) throw rpcErrors.invalidParams("Missing privateKey");
    res.result = await updatePrivatekey(accountParams);
  }

  return createScaffoldMiddleware({
    wallet_updateAccount: createAsyncMiddleware(updateAccount) as JRPCMiddleware<unknown, unknown>,
  });
}

// #endregion account middlewares
