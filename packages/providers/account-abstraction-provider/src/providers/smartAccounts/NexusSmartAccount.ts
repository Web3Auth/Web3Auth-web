import { toNexusSmartAccount, ToNexusSmartAccountParameters } from "permissionless/accounts";
import { Client, WalletClient } from "viem";
import { entryPoint07Address, SmartAccount } from "viem/account-abstraction";

import { SMART_ACCOUNT } from "./constants";
import { ISmartAccount } from "./types";

type NexusSmartAccountConfig = Omit<ToNexusSmartAccountParameters, "owners" | "client" | "index" | "address">;

export class NexusSmartAccount implements ISmartAccount {
  readonly name: string = SMART_ACCOUNT.NEXUS;

  private options: NexusSmartAccountConfig;

  constructor(options?: NexusSmartAccountConfig) {
    this.options = options;
  }

  async getSmartAccount(
    params: { walletClient: WalletClient; client: Client } & Pick<ToNexusSmartAccountParameters, "index" | "address">
  ): Promise<SmartAccount> {
    return toNexusSmartAccount({
      ...(this.options || {}),
      entryPoint: {
        address: this.options?.entryPoint?.address || entryPoint07Address,
        version: this.options?.entryPoint?.version || "0.7",
      },
      version: this.options?.version || "1.0.0",
      ...params,
      owners: [params.walletClient],
      client: params.client,
    });
  }
}
