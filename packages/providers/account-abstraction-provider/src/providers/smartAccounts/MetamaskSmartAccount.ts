import {
  HybridDeleGatorDeployParams,
  HybridSignatoryConfig,
  Implementation,
  MultiSigDeleGatorDeployParams,
  MultiSigSignatoryConfig,
  toMetaMaskSmartAccount,
  ToMetaMaskSmartAccountParameters,
} from "@codefi/delegator-core-viem";
import { Client, Hex, WalletClient } from "viem";
import { SmartAccount, WebAuthnAccount } from "viem/account-abstraction";

import { SMART_ACCOUNT } from "./constants";
import { ISmartAccount } from "./types";

type MetamaskSmartAccountConfig<TImplementation extends Implementation> = Partial<
  Omit<ToMetaMaskSmartAccountParameters<TImplementation>, "client" | "signatory" | "deployParams" | "address">
> & {
  hybridParams?: {
    p256KeyIds?: string[];
    p256XValues?: bigint[];
    p256YValues?: bigint[];
    webAuthnAccount?: WebAuthnAccount;
    keyId?: Hex;
  };
  multiSigParams?: {
    additionalSignerAddresses: Hex[];
    additonalSignerWalletClients: WalletClient[];
    threshold: bigint;
  };
};

function isImplementationHybrid(implementation: Implementation): implementation is Implementation.Hybrid {
  return implementation === Implementation.Hybrid;
}

export class MetamaskSmartAccount<TImplementation extends Implementation> implements ISmartAccount {
  readonly name: string = SMART_ACCOUNT.METAMASK;

  private options?: MetamaskSmartAccountConfig<TImplementation>;

  constructor(options?: MetamaskSmartAccountConfig<TImplementation>) {
    this.options = options;
  }

  async getSmartAccount(params: { client: Client; walletClient: WalletClient }): Promise<SmartAccount> {
    const implementation: Implementation = this.options?.implementation ?? Implementation.Hybrid;
    const [eoaAddress] = await params.walletClient.getAddresses();

    const hybridDeployParams = [
      eoaAddress,
      [...(this.options?.hybridParams?.p256KeyIds || [])],
      [...(this.options?.hybridParams?.p256XValues || [])],
      [...(this.options?.hybridParams?.p256YValues || [])],
    ] as HybridDeleGatorDeployParams;
    const multiSigDeployParams = [
      [eoaAddress, ...(this.options?.multiSigParams?.additionalSignerAddresses || [])],
      this.options?.multiSigParams?.threshold ?? BigInt(1 + (this.options?.multiSigParams?.additonalSignerWalletClients?.length || 0)),
    ] as MultiSigDeleGatorDeployParams;

    const hybridSignatory = {
      walletClient: params.walletClient,
      webAuthnAccount: this.options?.hybridParams?.webAuthnAccount,
      keyId: this.options?.hybridParams?.keyId,
    } as HybridSignatoryConfig;
    const multiSigSignatory = [
      {
        walletClient: params.walletClient,
      },
      ...(this.options?.multiSigParams?.additonalSignerWalletClients || []).map((walletClient) => ({
        walletClient,
      })),
    ] as MultiSigSignatoryConfig;

    return toMetaMaskSmartAccount({
      ...this.options,
      implementation,
      client: params.client,
      deploySalt: this.options?.deploySalt ?? "0x",
      ...(isImplementationHybrid(implementation)
        ? {
            deployParams: hybridDeployParams,
            signatory: hybridSignatory,
          }
        : {
            deployParams: multiSigDeployParams,
            signatory: multiSigSignatory,
          }),
    });
  }
}
