import { providerErrors } from "@metamask/rpc-errors";
import { JRPCEngine, providerFromEngine } from "@toruslabs/openlogin-jrpc";
import { CustomChainConfig, isHexStrict, WalletInitializationError } from "@web3auth/base";
import { BaseProvider, BaseProviderConfig, BaseProviderState } from "@web3auth/base-provider";

import { ITorusWalletProvider } from "../../../interface";
import { createSolanaMiddleware } from "../../../rpc/solanaRpcMiddlewares";
import { createInjectedProviderProxyMiddleware } from "../injectedProviderProxy";
import { getTorusHandlers } from "./providerHandlers";

export class TorusInjectedProvider extends BaseProvider<BaseProviderConfig, BaseProviderState, ITorusWalletProvider> {
  readonly PROVIDER_CHAIN_NAMESPACE = "solana";

  constructor({ config, state }: { config: BaseProviderConfig; state?: BaseProviderState }) {
    super({ config, state });
  }

  public async switchChain(params: { chainId: number }): Promise<void> {
    // overrides the base provider implementation
    await this.provider.request({
      method: "switchSolanaChain",
      params: [{ chainId: params.chainId.toString(16) }],
    });
  }

  public async addChain(chainConfig: CustomChainConfig): Promise<void> {
    super.addChain(chainConfig);
    await this.provider.request({
      method: "addNewChainConfig",
      params: [
        {
          chainId: chainConfig.id,
          chainName: chainConfig.name,
          rpcUrls: [chainConfig.rpcUrls.default.http[0]],
          blockExplorerUrls: [chainConfig.blockExplorers],
          iconUrls: [chainConfig.logo],
          nativeCurrency: {
            name: chainConfig.nativeCurrency.name,
            symbol: chainConfig.nativeCurrency.symbol,
            decimals: chainConfig.nativeCurrency.decimals || 18,
          },
        },
      ],
    });
  }

  public async setupProvider(injectedProvider: ITorusWalletProvider): Promise<void> {
    this.handleInjectedProviderUpdate(injectedProvider);
    const { chainNamespace } = this.config.chainConfig;
    if (chainNamespace !== this.PROVIDER_CHAIN_NAMESPACE) throw WalletInitializationError.incompatibleChainNameSpace("Invalid chain namespace");
    await this.setupEngine(injectedProvider);
  }

  protected async lookupNetwork(): Promise<string> {
    if (!this.provider) throw providerErrors.custom({ message: "Torus solana provider is not initialized", code: 4902 });
    const { id: chainId } = this.config.chainConfig;

    const connectedChainId = await this.provider.request<never, string>({
      method: "solana_chainId",
    });

    const connectedHexChainId = isHexStrict(connectedChainId.toString()) ? connectedChainId : `0x${parseInt(connectedChainId, 10).toString(16)}`;
    if (chainId.toString(16) !== connectedHexChainId)
      throw WalletInitializationError.rpcConnectionError(`Invalid network, net_version is: ${connectedHexChainId}, expected: ${chainId}`);

    this.update({ chainId: connectedHexChainId });
    this.emit("connect", { chainId: this.state.chainId });
    this.emit("chainChanged", this.state.chainId);
    return this.state.chainId;
  }

  private async setupEngine(injectedProvider: ITorusWalletProvider): Promise<void> {
    const providerHandlers = getTorusHandlers(injectedProvider);
    const solanaMiddleware = createSolanaMiddleware(providerHandlers);
    const injectedProviderProxy = createInjectedProviderProxyMiddleware(injectedProvider);
    const engine = new JRPCEngine();
    engine.push(solanaMiddleware);
    engine.push(injectedProviderProxy);
    const provider = providerFromEngine(engine);
    this.updateProviderEngineProxy(provider);
    await this.lookupNetwork();
  }

  private async handleInjectedProviderUpdate(injectedProvider: ITorusWalletProvider): Promise<void> {
    injectedProvider.on("accountsChanged", async (accounts: string[]) => {
      this.emit("accountsChanged", accounts);
    });
    injectedProvider.on("chainChanged", async (chainId: string) => {
      const connectedHexChainId = isHexStrict(chainId) ? chainId : `0x${parseInt(chainId, 10).toString(16)}`;
      // Check if chainId changed and trigger event
      this.configure({
        chainConfig: { ...this.config.chainConfig, id: parseInt(connectedHexChainId, 16) },
      });
      await this.setupProvider(injectedProvider);
    });
  }
}
