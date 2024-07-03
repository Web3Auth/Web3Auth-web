import { providerErrors, rpcErrors } from "@metamask/rpc-errors";
import { JRPCEngine, JRPCMiddleware, JRPCRequest, providerFromEngine } from "@toruslabs/openlogin-jrpc";
import { CHAIN_NAMESPACES, CustomChainConfig, WalletInitializationError } from "@web3auth/base";
import { BaseProvider, BaseProviderConfig, BaseProviderState } from "@web3auth/base-provider";
import type { PingResponse } from "xrpl";

import { createJsonRpcClient } from "../../rpc/JrpcClient";
import {
  AddXRPLChainParameter,
  createChainSwitchMiddleware,
  createXRPLMiddleware,
  IChainSwitchHandlers,
  KeyPair,
  RPC_METHODS,
} from "../../rpc/xrplRpcMiddlewares";
import { getProviderHandlers } from "./xrplWalletUtils";

export interface XrplPrivKeyProviderConfig extends BaseProviderConfig {
  chainConfig: CustomChainConfig;
}

export interface XrplPrivKeyProviderState extends BaseProviderState {
  privateKey?: string;
}
export class XrplPrivateKeyProvider extends BaseProvider<BaseProviderConfig, XrplPrivKeyProviderState, string> {
  readonly PROVIDER_CHAIN_NAMESPACE = CHAIN_NAMESPACES.XRPL;

  constructor({ config, state }: { config: XrplPrivKeyProviderConfig; state?: XrplPrivKeyProviderState }) {
    super({ config, state });
  }

  public static getProviderInstance = async (params: { privKey: string; chainConfig: CustomChainConfig }): Promise<XrplPrivateKeyProvider> => {
    const providerFactory = new XrplPrivateKeyProvider({ config: { chainConfig: params.chainConfig } });
    await providerFactory.setupProvider(params.privKey);
    return providerFactory;
  };

  public async enable(): Promise<string[]> {
    if (!this.state.privateKey)
      throw providerErrors.custom({ message: "Private key is not found in state, plz pass it in constructor state param", code: 4902 });
    await this.setupProvider(this.state.privateKey);
    return this._providerEngineProxy.request({ method: RPC_METHODS.GET_ACCOUNTS });
  }

  public async setupProvider(privKey: string): Promise<void> {
    const { rpcUrls, chainNamespace } = this.config.chainConfig;
    if (chainNamespace !== this.PROVIDER_CHAIN_NAMESPACE) throw WalletInitializationError.incompatibleChainNameSpace("Invalid chain namespace");
    if (!rpcUrls?.default?.webSocket?.[0]) {
      throw WalletInitializationError.invalidParams(`websocket url is required in chainConfig for xrplProvider`);
    }
    const providerHandlers = await getProviderHandlers({
      privKey,
      chainConfig: this.config.chainConfig,
    });
    const xrplWalletMiddleware = createXRPLMiddleware(providerHandlers);
    const engine = new JRPCEngine();
    const { networkMiddleware } = createJsonRpcClient(this.config.chainConfig as CustomChainConfig);
    engine.push(this.getChainSwitchMiddleware());
    engine.push(xrplWalletMiddleware);
    engine.push(networkMiddleware);

    const provider = providerFromEngine(engine);
    this.updateProviderEngineProxy(provider);

    await this.lookupNetwork();
  }

  public async switchChain(params: { chainId: number }): Promise<void> {
    if (!this._providerEngineProxy) throw providerErrors.custom({ message: "Provider is not initialized", code: 4902 });
    const chainConfig = this.getChainConfig(params.chainId);
    this.update({
      chainId: "loading",
    });
    this.configure({ chainConfig });
    const { privateKey } = await this._providerEngineProxy.request<never, KeyPair>({ method: RPC_METHODS.GET_KEY_PAIR });
    await this.setupProvider(privateKey);
  }

  protected async lookupNetwork(): Promise<void> {
    if (!this._providerEngineProxy) throw providerErrors.custom({ message: "Provider is not initialized", code: 4902 });
    const { id: chainId } = this.config.chainConfig;
    if (!chainId) throw rpcErrors.invalidParams("chainId is required while lookupNetwork");

    const pingResponse = await this._providerEngineProxy.request<[], PingResponse>({
      method: "ping",
      params: [],
    });

    if (pingResponse?.status !== "success") {
      const { chainConfig } = this.config;
      throw WalletInitializationError.rpcConnectionError(
        `Failed to ping network for following rpc target: ${chainConfig.rpcUrls?.default?.http?.[0]}`
      );
    }

    if (this.state.chainId !== chainId.toString(16)) {
      this.emit("chainChanged", chainId);
      this.emit("connect", { chainId });
    }
    this.update({ chainId: chainId.toString(16) });
  }

  private getChainSwitchMiddleware(): JRPCMiddleware<unknown, unknown> {
    const chainSwitchHandlers: IChainSwitchHandlers = {
      addChainConfig: async (req: JRPCRequest<AddXRPLChainParameter>): Promise<void> => {
        if (!req.params) throw rpcErrors.invalidParams("Missing request params");
        const { id, nativeCurrency, name, rpcUrls, blockExplorers, logo } = req.params;

        if (!id) throw rpcErrors.invalidParams("Missing chainId in chainParams");
        if (!rpcUrls?.default) throw rpcErrors.invalidParams("Missing default rpc url in chainParams");
        if (!rpcUrls?.default?.webSocket?.[0]) throw rpcErrors.invalidParams("Missing websocket rpc url in chainParams");
        this.addChain({
          chainNamespace: CHAIN_NAMESPACES.XRPL,
          id,
          nativeCurrency,
          name,
          rpcUrls,
          blockExplorers,
          logo,
        });
      },
      switchChain: async (req: JRPCRequest<{ chainId: string }>): Promise<void> => {
        if (!req.params) throw rpcErrors.invalidParams("Missing request params");
        if (!req.params.chainId) throw rpcErrors.invalidParams("Missing chainId");
        await this.switchChain({ chainId: parseInt(req.params.chainId, 16) });
      },
    };
    const chainSwitchMiddleware = createChainSwitchMiddleware(chainSwitchHandlers);
    return chainSwitchMiddleware;
  }
}
