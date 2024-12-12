import { toSimpleSmartAccount } from "permissionless/accounts";
import { Client, WalletClient } from "viem";
import { entryPoint07Address, SmartAccount } from "viem/account-abstraction";

import { SMART_ACCOUNT } from "./constants";
import { ISmartAccount } from "./types";

type SimpleSmartAccountParameters = Parameters<typeof toSimpleSmartAccount>[0]; // use type of function so we don't need to pass in generic to parameter type

type SimpleSmartAccountConfig = Omit<SimpleSmartAccountParameters, "owner" | "client">;

export class SimpleSmartAccount implements ISmartAccount {
  readonly name: string = SMART_ACCOUNT.SIMPLE;

  private options: SimpleSmartAccountConfig;

  constructor(options?: SimpleSmartAccountConfig) {
    this.options = options;
  }

  async getSmartAccount(params: { walletClient: WalletClient; client: Client }): Promise<SmartAccount> {
    return toSimpleSmartAccount({
      ...(this.options || {}),
      entryPoint: {
        address: this.options?.entryPoint?.address || entryPoint07Address,
        version: this.options?.entryPoint?.version || "0.7",
      },
      owner: params.walletClient,
      client: params.client,
    });
  }
}
