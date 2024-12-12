import { toTrustSmartAccount } from "permissionless/accounts";
import { Client, WalletClient } from "viem";
import { entryPoint06Address, SmartAccount } from "viem/account-abstraction";

import { SMART_ACCOUNT } from "./constants";
import { ISmartAccount } from "./types";

type TrustSmartAccountParameters = Parameters<typeof toTrustSmartAccount>[0]; // use type of function so we don't need to pass in generic to parameter type

type TrustSmartAccountConfig = Omit<TrustSmartAccountParameters, "owner" | "client" | "address" | "nonceKey" | "index">;

export class TrustSmartAccount implements ISmartAccount {
  readonly name: string = SMART_ACCOUNT.TRUST;

  private options: TrustSmartAccountConfig;

  constructor(options?: TrustSmartAccountConfig) {
    this.options = options;
  }

  async getSmartAccount(
    params: { walletClient: WalletClient; client: Client } & Pick<TrustSmartAccountParameters, "address" | "nonceKey" | "index">
  ): Promise<SmartAccount> {
    return toTrustSmartAccount({
      ...(this.options || {}),
      entryPoint: {
        address: this.options?.entryPoint?.address || entryPoint06Address,
        version: this.options?.entryPoint?.version || "0.6",
      },
      ...params,
      owner: params.walletClient,
      client: params.client,
    });
  }
}
