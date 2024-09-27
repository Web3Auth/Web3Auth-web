import { getED25519Key, JRPCEngine, JRPCMiddleware, JRPCRequest, providerErrors, providerFromEngine, rpcErrors } from "@web3auth/auth";
import { CHAIN_NAMESPACES, CustomChainConfig, WalletInitializationError } from "@web3auth/base";
import { BaseProvider, BaseProviderConfig, BaseProviderState } from "@web3auth/base-provider";

import { AddSolanaChainParameter, IChainSwitchHandlers } from "../../rpc";
import { createJsonRpcClient } from "../../rpc/JrpcClient";
import { createAccountMiddleware, createChainSwitchMiddleware, createSolanaMiddleware, IAccountHandlers } from "../../rpc/solanaRpcMiddlewares";
import { getProviderHandlers } from "./solanaPrivateKeyUtils";

export interface SolanaPrivKeyProviderConfig extends BaseProviderConfig {
  chainConfig: CustomChainConfig;
}
export interface SolanaPrivKeyProviderState extends BaseProviderState {
  privateKey?: string;
}
export class SolanaPrivateKeyProvider extends BaseProvider<BaseProviderConfig, SolanaPrivKeyProviderState, string> {
  readonly PROVIDER_CHAIN_NAMESPACE = CHAIN_NAMESPACES.SOLANA;

  constructor({ config, state }: { config: SolanaPrivKeyProviderConfig; state?: BaseProviderState }) {
    super({ config, state });
  }

  public static getProviderInstance = async (params: { privKey: string; chainConfig: CustomChainConfig }): Promise<SolanaPrivateKeyProvider> => {
    const providerFactory = new SolanaPrivateKeyProvider({ config: { chainConfig: params.chainConfig } });
    await providerFactory.setupProvider(params.privKey);
    return providerFactory;
  };

  public async enable(): Promise<string[]> {
    if (!this.state.privateKey)
      throw providerErrors.custom({ message: "Private key is not found in state, plz pass it in constructor state param", code: 4902 });
    await this.setupProvider(this.state.privateKey);
    return this._providerEngineProxy.request<never, string[]>({ method: "eth_accounts" });
  }

  public getEd25519Key(privateKey: string): string {
    return getED25519Key(privateKey).sk.toString("hex").padStart(128, "0");
  }

  public async setupProvider(privKey: string): Promise<void> {
    const { chainNamespace } = this.config.chainConfig;
    if (chainNamespace !== this.PROVIDER_CHAIN_NAMESPACE) throw WalletInitializationError.incompatibleChainNameSpace("Invalid chain namespace");
    const providerHandlers = await getProviderHandlers({
      privKey,
      getProviderEngineProxy: this.getProviderEngineProxy.bind(this),
      keyExportEnabled: this.config.keyExportEnabled,
    });

    const solanaMiddleware = createSolanaMiddleware(providerHandlers);

    const engine = new JRPCEngine();
    const { networkMiddleware } = createJsonRpcClient(this.config.chainConfig as CustomChainConfig);
    engine.push(this.getChainSwitchMiddleware());
    engine.push(this.getAccountMiddleware());
    engine.push(solanaMiddleware);
    engine.push(networkMiddleware);

    const provider = providerFromEngine(engine);

    this.updateProviderEngineProxy(provider);

    await this.lookupNetwork();
  }

  public async updateAccount(params: { privateKey: string }): Promise<void> {
    if (!this._providerEngineProxy) throw providerErrors.custom({ message: "Provider is not initialized", code: 4902 });
    const existingKey = await this._providerEngineProxy.request<never, string>({ method: "solanaPrivateKey" });
    if (existingKey !== params.privateKey) {
      await this.setupProvider(params.privateKey);
      const accounts = await this._providerEngineProxy.request<never, string[]>({ method: "requestAccounts" });
      this.emit("accountsChanged", accounts);
    }
  }

  public async switchChain(params: { chainId: string }): Promise<void> {
    if (!this._providerEngineProxy) throw providerErrors.custom({ message: "Provider is not initialized", code: 4902 });
    const chainConfig = this.getChainConfig(params.chainId);
    this.update({
      chainId: "loading",
    });
    this.configure({ chainConfig });
    const privKey = await this._providerEngineProxy.request<never, string>({ method: "solanaPrivateKey" });
    await this.setupProvider(privKey);
  }

  protected async lookupNetwork(): Promise<string> {
    if (!this._providerEngineProxy) throw providerErrors.custom({ message: "Provider is not initialized", code: 4902 });
    const health = await this._providerEngineProxy.request<[], string>({
      method: "getHealth",
      params: [],
    });
    const { chainConfig } = this.config;
    if (health !== "ok")
      throw WalletInitializationError.rpcConnectionError(`Failed to lookup network for following rpc target: ${chainConfig.rpcTarget}`);
    this.update({ chainId: chainConfig.chainId });
    if (this.state.chainId !== chainConfig.chainId) {
      this.emit("chainChanged", this.state.chainId);
      this.emit("connect", { chainId: this.state.chainId });
    }
    return this.state.chainId;
  }

  private getChainSwitchMiddleware(): JRPCMiddleware<unknown, unknown> {
    const chainSwitchHandlers: IChainSwitchHandlers = {
      addNewChainConfig: async (req: JRPCRequest<AddSolanaChainParameter>): Promise<void> => {
        if (!req.params) throw rpcErrors.invalidParams("Missing request params");
        const { chainId, chainName, rpcUrls, blockExplorerUrls, nativeCurrency, iconUrls } = req.params;

        if (!chainId) throw rpcErrors.invalidParams("Missing chainId in chainParams");
        if (!rpcUrls || rpcUrls.length === 0) throw rpcErrors.invalidParams("Missing rpcUrls in chainParams");
        if (!nativeCurrency) throw rpcErrors.invalidParams("Missing nativeCurrency in chainParams");
        this.addChain({
          chainNamespace: CHAIN_NAMESPACES.SOLANA,
          chainId,
          ticker: nativeCurrency?.symbol || "SOL",
          tickerName: nativeCurrency?.name || "Solana",
          displayName: chainName,
          rpcTarget: rpcUrls[0],
          blockExplorerUrl: blockExplorerUrls?.[0] || "",
          decimals: nativeCurrency?.decimals || 9,
          logo: iconUrls?.[0] || "https://images.toruswallet.io/sol.svg",
        });
      },
      switchSolanaChain: async (req: JRPCRequest<{ chainId: string }>): Promise<void> => {
        if (!req.params) throw rpcErrors.invalidParams("Missing request params");
        if (!req.params.chainId) throw rpcErrors.invalidParams("Missing chainId");
        await this.switchChain(req.params);
      },
    };
    const chainSwitchMiddleware = createChainSwitchMiddleware(chainSwitchHandlers);
    return chainSwitchMiddleware;
  }

  private getAccountMiddleware(): JRPCMiddleware<unknown, unknown> {
    const accountHandlers: IAccountHandlers = {
      updatePrivatekey: async (req: JRPCRequest<{ privateKey: string }>): Promise<void> => {
        if (!req.params) throw rpcErrors.invalidParams("Missing request params");
        if (!req.params.privateKey) throw rpcErrors.invalidParams("Missing privateKey");
        const { privateKey } = req.params;
        await this.updateAccount({ privateKey });
      },
    };
    return createAccountMiddleware(accountHandlers);
  }
}
