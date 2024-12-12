import { JRPCEngine, providerErrors, providerFromEngine } from "@web3auth/auth";
import { CHAIN_NAMESPACES, CustomChainConfig, IProvider, WalletInitializationError } from "@web3auth/base";
import { BaseProvider, BaseProviderConfig, BaseProviderState } from "@web3auth/base-provider";
import { Client, createPublicClient, createWalletClient, custom, defineChain, Hex, http } from "viem";
import { BundlerClient, createBundlerClient, createPaymasterClient, PaymasterClient, SmartAccount } from "viem/account-abstraction";

import { createAaMiddleware, eoaProviderAsMiddleware } from "../rpc/ethRpcMiddlewares";
import { ISmartAccount } from "./smartAccounts";
import { BundlerConfig, PaymasterConfig } from "./types";
import { getProviderHandlers } from "./utils";

export interface AccountAbstractionProviderConfig extends BaseProviderConfig {
  smartAccountInit: ISmartAccount;
  bundlerConfig: BundlerConfig;
  paymasterConfig?: PaymasterConfig;
}
export interface AccountAbstractionProviderState extends BaseProviderState {
  eoaProvider?: IProvider;
}

export class AccountAbstractionProvider extends BaseProvider<AccountAbstractionProviderConfig, AccountAbstractionProviderState, IProvider> {
  readonly PROVIDER_CHAIN_NAMESPACE = CHAIN_NAMESPACES.EIP155;

  private _smartAccount: SmartAccount | null;

  private _publicClient: Client | null;

  private _bundlerClient: BundlerClient | null;

  private _paymasterClient: PaymasterClient | null;

  constructor({ config, state }: { config: AccountAbstractionProviderConfig; state?: AccountAbstractionProviderState }) {
    super({ config, state });
  }

  get smartAccount(): SmartAccount | null {
    return this._smartAccount;
  }

  get bundlerClient(): BundlerClient | null {
    return this._bundlerClient;
  }

  get paymasterClient(): PaymasterClient | null {
    return this._paymasterClient;
  }

  get publicClient(): Client | null {
    return this._publicClient;
  }

  public static getProviderInstance = async (params: {
    eoaProvider: IProvider;
    smartAccountInit: ISmartAccount;
    chainConfig: CustomChainConfig;
    bundlerConfig: BundlerConfig;
    paymasterConfig?: PaymasterConfig;
  }): Promise<AccountAbstractionProvider> => {
    const providerFactory = new AccountAbstractionProvider({ config: params });
    await providerFactory.setupProvider(params.eoaProvider);
    providerFactory.update({ eoaProvider: params.eoaProvider });
    return providerFactory;
  };

  public async enable(): Promise<string[]> {
    if (!this.state.eoaProvider) throw providerErrors.custom({ message: "eoaProvider is not found in state, please pass it", code: 4902 });
    await this.setupProvider(this.state.eoaProvider);
    return this._providerEngineProxy.request({ method: "eth_accounts" });
  }

  public async setupProvider(eoaProvider: IProvider): Promise<void> {
    const { chainNamespace } = this.config.chainConfig;
    if (chainNamespace !== this.PROVIDER_CHAIN_NAMESPACE) throw WalletInitializationError.incompatibleChainNameSpace("Invalid chain namespace");
    const chain = defineChain({
      id: Number.parseInt(this.config.chainConfig.chainId, 16), // id in number form
      name: this.config.chainConfig.displayName,
      rpcUrls: {
        default: {
          http: [this.config.chainConfig.rpcTarget],
          webSocket: [this.config.chainConfig.wsTarget],
        },
      },
      blockExplorers: this.config.chainConfig.blockExplorerUrl
        ? {
            default: {
              name: "explorer", // TODO: correct name if chain config has it
              url: this.config.chainConfig.blockExplorerUrl,
            },
          }
        : undefined,
      nativeCurrency: {
        name: this.config.chainConfig.tickerName,
        symbol: this.config.chainConfig.ticker,
        decimals: this.config.chainConfig.decimals || 18,
      },
    });
    // setup public client for viem smart account
    this._publicClient = createPublicClient({
      chain,
      transport: http(this.config.chainConfig.rpcTarget),
    }) as Client;

    // viem wallet client using json-rpc account from eoaProvider
    // need to hoist the account address https://viem.sh/docs/clients/wallet#optional-hoist-the-account
    const [eoaAddress] = await eoaProvider.request<never, string[]>({ method: "eth_accounts" });
    const walletClient = createWalletClient({
      account: eoaAddress as Hex,
      chain,
      transport: custom(eoaProvider),
    });
    this._smartAccount = await this.config.smartAccountInit.getSmartAccount({
      client: this._publicClient,
      walletClient,
    });

    // setup bundler and paymaster
    if (this.config.paymasterConfig) {
      this._paymasterClient = createPaymasterClient({
        ...this.config.paymasterConfig,
        transport: this.config.paymasterConfig.transport ?? http(this.config.paymasterConfig.url),
      });
    }
    this._bundlerClient = createBundlerClient({
      ...this.config.bundlerConfig,
      account: this.smartAccount,
      client: this._publicClient,
      transport: this.config.bundlerConfig.transport ?? http(this.config.bundlerConfig.url),
      paymaster: this._paymasterClient,
    });

    const providerHandlers = getProviderHandlers({
      bundlerClient: this._bundlerClient,
      smartAccount: this._smartAccount,
      chain,
      eoaProvider,
    });

    // setup rpc engine and AA middleware
    const engine = new JRPCEngine();
    const aaMiddleware = await createAaMiddleware({
      eoaProvider,
      handlers: providerHandlers,
    });
    engine.push(aaMiddleware);
    const eoaMiddleware = eoaProviderAsMiddleware(eoaProvider);
    engine.push(eoaMiddleware);
    const provider = providerFromEngine(engine);
    this.updateProviderEngineProxy(provider);
    eoaProvider.once("chainChanged", () => {
      this.setupChainSwitchMiddleware();
    });
  }

  public async updateAccount(_params: { privateKey: string }): Promise<void> {
    throw providerErrors.unsupportedMethod("updateAccount. Please call it on eoaProvider");
  }

  public async switchChain(_params: { chainId: string }): Promise<void> {
    throw providerErrors.unsupportedMethod("switchChain. Please call it on eoaProvider");
  }

  protected async lookupNetwork(): Promise<string> {
    throw providerErrors.unsupportedMethod("lookupNetwork. Please call it on eoaProvider");
  }

  private async setupChainSwitchMiddleware() {
    const chainConfig = await this.state.eoaProvider.request<never, CustomChainConfig>({ method: "eth_provider_config" });
    this.update({ chainId: chainConfig.chainId });
    this.configure({
      chainConfig: { ...chainConfig, chainNamespace: CHAIN_NAMESPACES.EIP155, chainId: chainConfig.chainId, rpcTarget: chainConfig.rpcTarget },
    });
    return this.setupProvider(this.state.eoaProvider);
  }
}
