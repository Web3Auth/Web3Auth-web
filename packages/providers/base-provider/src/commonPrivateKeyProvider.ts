import { createEventEmitterProxy } from "@toruslabs/base-controllers";
import {
  createAsyncMiddleware,
  createScaffoldMiddleware,
  JRPCEngine,
  JRPCMiddleware,
  JRPCRequest,
  JRPCResponse,
  providerFromEngine,
} from "@toruslabs/openlogin-jrpc";
import { CustomChainConfig, IBaseProvider, SafeEventEmitterProvider } from "@web3auth/base";

import { BaseProvider, BaseProviderConfig, BaseProviderState } from "./baseProvider";

export interface CommonPrivKeyProviderConfig extends BaseProviderConfig {
  chainConfig: CustomChainConfig;
}

export interface CommonPrivKeyProviderState extends BaseProviderState {
  privateKey?: string;
}

export class CommonPrivateKeyProvider extends BaseProvider<BaseProviderConfig, CommonPrivKeyProviderState, string> implements IBaseProvider<string> {
  // should be Assigned in setupProvider
  public _providerEngineProxy: SafeEventEmitterProvider | null = null;

  constructor({ config, state }: { config: CommonPrivKeyProviderConfig; state?: CommonPrivKeyProviderState }) {
    super({ config, state });
  }

  get provider(): SafeEventEmitterProvider | null {
    return this._providerEngineProxy;
  }

  set provider(_) {
    throw new Error("Method not implemented.");
  }

  public static getProviderInstance = async (params: { privKey: string; chainConfig: CustomChainConfig }): Promise<CommonPrivateKeyProvider> => {
    const providerFactory = new CommonPrivateKeyProvider({ config: { chainConfig: params.chainConfig } });
    await providerFactory.setupProvider(params.privKey);
    return providerFactory;
  };

  addChain(_: CustomChainConfig): void {
    throw new Error("Method not implemented.");
  }

  public async setupProvider(privKey: string): Promise<void> {
    const privKeyMiddleware = this.getPrivKeyMiddleware(privKey);
    const engine = new JRPCEngine();
    engine.push(privKeyMiddleware);
    const provider = providerFromEngine(engine);
    this.updateProviderEngineProxy(provider);
  }

  public updateProviderEngineProxy(provider: SafeEventEmitterProvider) {
    if (this._providerEngineProxy) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this._providerEngineProxy as any).setTarget(provider);
    } else {
      this._providerEngineProxy = createEventEmitterProxy<SafeEventEmitterProvider>(provider);
    }
  }

  public async switchChain(_: { chainId: number }): Promise<void> {
    return Promise.resolve();
  }

  protected getProviderEngineProxy(): SafeEventEmitterProvider | null {
    return this._providerEngineProxy;
  }

  protected async lookupNetwork(): Promise<string> {
    return Promise.resolve("");
  }

  private getPrivKeyMiddleware(privKey: string): JRPCMiddleware<unknown, unknown> {
    const middleware = {
      getPrivatekey: async (): Promise<string> => {
        return privKey;
      },
    };
    return this.createPrivKeyMiddleware(middleware);
  }

  private createPrivKeyMiddleware({ getPrivatekey }: { getPrivatekey: () => Promise<string> }): JRPCMiddleware<unknown, unknown> {
    async function getPrivatekeyHandler(_: JRPCRequest<{ privateKey: string }[]>, res: JRPCResponse<unknown>): Promise<void> {
      res.result = await getPrivatekey();
    }

    return createScaffoldMiddleware({
      private_key: createAsyncMiddleware(getPrivatekeyHandler) as JRPCMiddleware<unknown, unknown>,
    });
  }
}
