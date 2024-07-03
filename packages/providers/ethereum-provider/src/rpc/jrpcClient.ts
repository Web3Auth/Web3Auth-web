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
import type { CustomChainConfig } from "@web3auth/base";

export function createChainIdMiddleware(chainId: number): JRPCMiddleware<unknown, number> {
  return (req: JRPCRequest<unknown>, res: JRPCResponse<number>, next: JRPCEngineNextCallback, end: JRPCEngineEndCallback) => {
    if (req.method === "eth_chainId") {
      res.result = chainId;
      return end();
    }
    return next();
  };
}

export function createProviderConfigMiddleware(providerConfig: CustomChainConfig): JRPCMiddleware<unknown, CustomChainConfig> {
  return (req: JRPCRequest<unknown>, res: JRPCResponse<CustomChainConfig>, next: JRPCEngineNextCallback, end: JRPCEngineEndCallback) => {
    if (req.method === "eth_provider_config") {
      res.result = providerConfig;
      return end();
    }
    return next();
  };
}

export function createJsonRpcClient(providerConfig: CustomChainConfig): {
  networkMiddleware: JRPCMiddleware<unknown, unknown>;
  fetchMiddleware: JRPCMiddleware<string[], Block>;
} {
  const { id, rpcUrls } = providerConfig;
  const fetchMiddleware = createFetchMiddleware({ rpcTarget: rpcUrls.default.http?.[0] });
  const networkMiddleware = mergeMiddleware([
    createChainIdMiddleware(id) as JRPCMiddleware<unknown, unknown>,
    createProviderConfigMiddleware(providerConfig) as JRPCMiddleware<unknown, unknown>,
    fetchMiddleware as JRPCMiddleware<unknown, unknown>,
  ]);
  return { networkMiddleware, fetchMiddleware };
}
