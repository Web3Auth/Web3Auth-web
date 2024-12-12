import { toLightSmartAccount, ToLightSmartAccountParameters } from "permissionless/accounts";
import { Client, WalletClient } from "viem";
import { entryPoint07Address, SmartAccount } from "viem/account-abstraction";

import { SMART_ACCOUNT } from "./constants";
import { ISmartAccount } from "./types";

type LightSmartAccountConfig = Omit<ToLightSmartAccountParameters, "owner" | "client" | "index" | "address" | "nonceKey">;

export class LightSmartAccount implements ISmartAccount {
  readonly name: string = SMART_ACCOUNT.LIGHT;

  private options: LightSmartAccountConfig;

  constructor(options?: LightSmartAccountConfig) {
    this.options = options;
  }

  async getSmartAccount(
    params: { walletClient: WalletClient; client: Client } & Pick<ToLightSmartAccountParameters, "address" | "index" | "nonceKey">
  ): Promise<SmartAccount> {
    return toLightSmartAccount({
      ...(this.options || {}),
      entryPoint: {
        address: this.options?.entryPoint?.address || entryPoint07Address,
        version: this.options?.entryPoint?.version || "0.7",
      },
      version: this.options?.version || "2.0.0",
      owner: params.walletClient,
      client: params.client,
    });
  }
}
