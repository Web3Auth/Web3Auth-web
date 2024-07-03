import { createFetchMiddleware } from "@toruslabs/base-controllers";
import {
  Block,
  JRPCEngineEndCallback,
  JRPCEngineNextCallback,
  JRPCMiddleware,
  JRPCRequest,
  JRPCResponse,
  mergeMiddleware,
} from "@toruslabs/openlogin-jrpc";
import { CustomChainConfig } from "@web3auth/base";

import { RPC_METHODS } from "./xrplRpcMiddlewares";

export function createChainIdMiddleware(chainId: number): JRPCMiddleware<unknown, number> {
  return (req: JRPCRequest<unknown>, res: JRPCResponse<number>, next: JRPCEngineNextCallback, end: JRPCEngineEndCallback) => {
    if (req.method === RPC_METHODS.CHAIN_ID) {
      res.result = chainId;
      return end();
    }
    return next();
  };
}

export function createProviderConfigMiddleware(providerConfig: CustomChainConfig): JRPCMiddleware<unknown, CustomChainConfig> {
  return (req: JRPCRequest<unknown>, res: JRPCResponse<CustomChainConfig>, next: JRPCEngineNextCallback, end: JRPCEngineEndCallback) => {
    if (req.method === RPC_METHODS.PROVIDER_CHAIN_CONFIG) {
      res.result = providerConfig;
      return end();
    }
    return next();
  };
}

export function createConfigMiddleware(providerConfig: CustomChainConfig): JRPCMiddleware<unknown, unknown> {
  const { id: chainId } = providerConfig;

  return mergeMiddleware([
    createChainIdMiddleware(chainId) as JRPCMiddleware<unknown, unknown>,
    createProviderConfigMiddleware(providerConfig) as JRPCMiddleware<unknown, unknown>,
  ]);
}

export function createJsonRpcClient(providerConfig: CustomChainConfig): {
  networkMiddleware: JRPCMiddleware<unknown, unknown>;
  fetchMiddleware: JRPCMiddleware<string[], Block>;
} {
  const { rpcUrls } = providerConfig;
  const fetchMiddleware = createFetchMiddleware({ rpcTarget: rpcUrls.default.http?.[0] });
  const networkMiddleware = mergeMiddleware([createConfigMiddleware(providerConfig), fetchMiddleware as JRPCMiddleware<unknown, unknown>]);
  return { networkMiddleware, fetchMiddleware };
}
