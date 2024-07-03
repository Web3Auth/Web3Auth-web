import { rpcErrors } from "@metamask/rpc-errors";
import { BaseConfig, BaseController, BaseState, createEventEmitterProxy } from "@toruslabs/base-controllers";
import { JRPCRequest, JRPCResponse, SendCallBack } from "@toruslabs/openlogin-jrpc";
import {
  CustomChainConfig,
  IBaseProvider,
  Maybe,
  RequestArguments,
  SafeEventEmitterProvider,
  WalletInitializationError,
  WalletProviderError,
} from "@web3auth/base";

export interface BaseProviderState extends BaseState {
  chainId: string;
}

export interface BaseProviderConfig extends BaseConfig {
  chainConfig: CustomChainConfig;
  networks?: Record<string, CustomChainConfig>;
  skipLookupNetwork?: boolean;
}

export abstract class BaseProvider<C extends BaseProviderConfig, S extends BaseProviderState, P>
  extends BaseController<C, S>
  implements IBaseProvider<P>
{
  // should be Assigned in setupProvider
  public _providerEngineProxy: SafeEventEmitterProvider | null = null;

  constructor({ config, state }: { config: C; state?: S }) {
    super({ config, state });
    if (!config.chainConfig) throw WalletInitializationError.invalidProviderConfigError("Please provide chainConfig");
    if (!config.chainConfig.id) throw WalletInitializationError.invalidProviderConfigError("Please provide chainId inside chainConfig");
    if (!config.chainConfig.rpcUrls?.default?.http?.length)
      throw WalletInitializationError.invalidProviderConfigError("Please provide rpcTarget inside chainConfig");
    this.defaultState = {
      chainId: "loading",
    } as S;
    this.defaultConfig = {
      chainConfig: config.chainConfig,
      networks: { [config.chainConfig.id]: config.chainConfig },
    } as C;
    super.initialize();
  }

  get currentChainConfig(): CustomChainConfig {
    return this.config.chainConfig;
  }

  get provider(): SafeEventEmitterProvider | null {
    return this._providerEngineProxy;
  }

  get chainId(): string {
    return this.state.chainId;
  }

  set provider(_) {
    throw new Error("Method not implemented.");
  }

  async request<T, R>(args: RequestArguments<T>): Promise<Maybe<R>> {
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      throw rpcErrors.invalidRequest({
        message: WalletProviderError.invalidRequestArgs().message,
        data: { ...(args || {}), cause: WalletProviderError.invalidRequestArgs().message },
      });
    }

    const { method, params } = args;

    if (typeof method !== "string" || method.length === 0) {
      throw rpcErrors.invalidRequest({
        message: WalletProviderError.invalidRequestMethod().message,
        data: { ...(args || {}), cause: WalletProviderError.invalidRequestMethod().message },
      });
    }

    if (params !== undefined && !Array.isArray(params) && (typeof params !== "object" || params === null)) {
      throw rpcErrors.invalidRequest({
        message: WalletProviderError.invalidRequestParams().message,
        data: { ...(args || {}), cause: WalletProviderError.invalidRequestParams().message },
      });
    }

    return this.provider?.request(args);
  }

  sendAsync<T, U>(req: JRPCRequest<T>, callback: SendCallBack<JRPCResponse<U>>): void;
  sendAsync<T, U>(req: JRPCRequest<T>): Promise<JRPCResponse<U>>;

  sendAsync<T, U>(req: JRPCRequest<T>, callback?: SendCallBack<JRPCResponse<U>>): void | Promise<JRPCResponse<U>> {
    if (callback) return this.send(req, callback);
    return this.request(req);
  }

  send<T, U>(req: JRPCRequest<T>, callback: SendCallBack<JRPCResponse<U>>): void {
    this.request(req)
      .then((res) => callback(null, { result: res } as JRPCResponse<U>))
      .catch((err) => callback(err, null));
  }

  public addChain(chainConfig: CustomChainConfig): void {
    if (!chainConfig.id) throw rpcErrors.invalidParams("chainId is required");
    if (!chainConfig.rpcUrls.default.http[0]) throw rpcErrors.invalidParams("chainId is required");
    this.configure({
      networks: { ...this.config.networks, [chainConfig.id]: chainConfig },
    } as C);
  }

  public getChainConfig(chainId: number): CustomChainConfig | null {
    const chainConfig = this.config.networks?.[chainId];
    if (!chainConfig) throw rpcErrors.invalidRequest(`Chain ${chainId} is not supported, please add chainConfig for it`);
    return chainConfig;
  }

  public updateProviderEngineProxy(provider: SafeEventEmitterProvider): void {
    if (this._providerEngineProxy) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this._providerEngineProxy as any).setTarget(provider);
    } else {
      this._providerEngineProxy = createEventEmitterProxy<SafeEventEmitterProvider>(provider);
    }
  }

  protected getProviderEngineProxy(): SafeEventEmitterProvider | null {
    return this._providerEngineProxy;
  }

  abstract setupProvider(provider: P): Promise<void>;

  abstract switchChain(params: { chainId: number }): Promise<void>;

  protected abstract lookupNetwork(provider?: P): Promise<string | void>;
}
