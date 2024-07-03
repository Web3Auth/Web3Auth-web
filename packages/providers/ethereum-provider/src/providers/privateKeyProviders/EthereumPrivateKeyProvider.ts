import { providerErrors, rpcErrors } from "@metamask/rpc-errors";
import { JRPCEngine, JRPCMiddleware, providerFromEngine } from "@toruslabs/openlogin-jrpc";
import { CHAIN_NAMESPACES, CustomChainConfig, WalletInitializationError } from "@web3auth/base";
import { BaseProvider, BaseProviderConfig, BaseProviderState } from "@web3auth/base-provider";

import { createAccountMiddleware, createChainSwitchMiddleware, createEthMiddleware } from "../../rpc/ethRpcMiddlewares";
import { AddEthereumChainParameter, IAccountHandlers, IChainSwitchHandlers } from "../../rpc/interfaces";
import { createJsonRpcClient } from "../../rpc/jrpcClient";
import { getProviderHandlers } from "./ethPrivatekeyUtils";
import { TransactionFormatter } from "./TransactionFormatter/formatter";

export interface EthereumPrivKeyProviderConfig extends BaseProviderConfig {
  chainConfig: CustomChainConfig;
}

export interface EthereumPrivKeyProviderState extends BaseProviderState {
  privateKey?: string;
}

export class EthereumPrivateKeyProvider extends BaseProvider<BaseProviderConfig, EthereumPrivKeyProviderState, string> {
  readonly PROVIDER_CHAIN_NAMESPACE = CHAIN_NAMESPACES.EIP155;

  constructor({ config, state }: { config: EthereumPrivKeyProviderConfig; state?: EthereumPrivKeyProviderState }) {
    super({ config, state });
  }

  public static getProviderInstance = async (params: { privKey: string; chainConfig: CustomChainConfig }): Promise<EthereumPrivateKeyProvider> => {
    const providerFactory = new EthereumPrivateKeyProvider({ config: { chainConfig: params.chainConfig } });
    await providerFactory.setupProvider(params.privKey);
    return providerFactory;
  };

  public async enable(): Promise<string[]> {
    if (!this.state.privateKey)
      throw providerErrors.custom({ message: "Private key is not found in state, plz pass it in constructor state param", code: 4902 });
    await this.setupProvider(this.state.privateKey);
    return this._providerEngineProxy.request({ method: "eth_accounts" });
  }

  public async setupProvider(privKey: string): Promise<void> {
    const { chainNamespace } = this.config.chainConfig;
    if (chainNamespace !== this.PROVIDER_CHAIN_NAMESPACE) throw WalletInitializationError.incompatibleChainNameSpace("Invalid chain namespace");
    const txFormatter = new TransactionFormatter({
      getProviderEngineProxy: this.getProviderEngineProxy.bind(this),
    });
    const providerHandlers = getProviderHandlers({
      txFormatter,
      privKey,
      getProviderEngineProxy: this.getProviderEngineProxy.bind(this),
    });
    const ethMiddleware = createEthMiddleware(providerHandlers);
    const chainSwitchMiddleware = this.getChainSwitchMiddleware();
    const engine = new JRPCEngine();
    // Not a partial anymore because of checks in ctor
    const { networkMiddleware } = createJsonRpcClient(this.config.chainConfig as CustomChainConfig);
    engine.push(ethMiddleware);
    engine.push(chainSwitchMiddleware);
    engine.push(this.getAccountMiddleware());
    engine.push(networkMiddleware);
    const provider = providerFromEngine(engine);
    this.updateProviderEngineProxy(provider);
    await txFormatter.init();
    await this.lookupNetwork();
  }

  public async updateAccount(params: { privateKey: string }): Promise<void> {
    if (!this._providerEngineProxy) throw providerErrors.custom({ message: "Provider is not initialized", code: 4902 });
    const existingKey = await this._providerEngineProxy.request<never, string>({ method: "eth_private_key" });
    if (existingKey !== params.privateKey) {
      await this.setupProvider(params.privateKey);
      this.emit("accountsChanged", {
        accounts: await this._providerEngineProxy.request<never, string[]>({ method: "eth_accounts" }),
      });
    }
  }

  public async switchChain(params: { chainId: number }): Promise<void> {
    if (!this._providerEngineProxy) throw providerErrors.custom({ message: "Provider is not initialized", code: 4902 });
    const chainConfig = this.getChainConfig(params.chainId);
    this.update({
      chainId: "loading",
    });
    this.configure({ chainConfig });
    const privKey = await this._providerEngineProxy.request<never, string>({ method: "eth_private_key" });
    await this.setupProvider(privKey);
  }

  protected async lookupNetwork(): Promise<string> {
    if (!this._providerEngineProxy) throw providerErrors.custom({ message: "Provider is not initialized", code: 4902 });
    const { id: chainId } = this.config.chainConfig;
    if (!chainId) throw rpcErrors.invalidParams("chainId is required while lookupNetwork");
    const network = await this._providerEngineProxy.request<[], string>({
      method: "net_version",
      params: [],
    });

    if (chainId !== parseInt(network, 10)) throw providerErrors.chainDisconnected(`Invalid network, net_version is: ${network}`);
    if (this.state.chainId !== chainId.toString(16)) {
      this.emit("chainChanged", chainId);
      this.emit("connect", { chainId });
    }
    this.update({ chainId: chainId.toString(16) });
    return network;
  }

  private getChainSwitchMiddleware(): JRPCMiddleware<unknown, unknown> {
    const chainSwitchHandlers: IChainSwitchHandlers = {
      addChain: async (params: AddEthereumChainParameter): Promise<void> => {
        const { chainId, chainName, rpcUrls, blockExplorerUrls, nativeCurrency, iconUrls } = params;
        this.addChain({
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          id: parseInt(chainId, 16),
          nativeCurrency: {
            symbol: nativeCurrency?.symbol || "ETH",
            name: nativeCurrency?.name || "Ether",
            decimals: nativeCurrency?.decimals || 18,
          },
          name: chainName,
          rpcUrls: { default: { http: rpcUrls } },
          blockExplorers: { default: { name: chainName, url: blockExplorerUrls?.[0] } },
          logo: iconUrls?.[0] || "https://images.toruswallet.io/eth.svg",
        });
      },
      switchChain: async (params: { chainId: string }): Promise<void> => {
        const { chainId } = params;
        await this.switchChain({ chainId: parseInt(chainId, 16) });
      },
    };
    const chainSwitchMiddleware = createChainSwitchMiddleware(chainSwitchHandlers);
    return chainSwitchMiddleware;
  }

  private getAccountMiddleware(): JRPCMiddleware<unknown, unknown> {
    const accountHandlers: IAccountHandlers = {
      updatePrivatekey: async (params: { privateKey: string }): Promise<void> => {
        const { privateKey } = params;
        await this.updateAccount({ privateKey });
      },
    };
    return createAccountMiddleware(accountHandlers);
  }
}
