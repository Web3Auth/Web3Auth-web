import { toSafeSmartAccount } from "permissionless/accounts";
import { Client, WalletClient } from "viem";
import { entryPoint07Address, SmartAccount } from "viem/account-abstraction";

import { SMART_ACCOUNT } from "./constants";
import { ISmartAccount } from "./types";

type SafeSmartAccountParameters = Parameters<typeof toSafeSmartAccount>[0]; // use type of function so we don't need to pass in generic to parameter type

type SafeSmartAccountConfig = Omit<
  SafeSmartAccountParameters,
  "owners" | "client" | "address" | "nonceKey" | "saltNonce" | "validUntil" | "validAfter"
>;

export class SafeSmartAccount implements ISmartAccount {
  readonly name: string = SMART_ACCOUNT.SAFE;

  private options: SafeSmartAccountConfig;

  constructor(options?: SafeSmartAccountConfig) {
    this.options = options;
  }

  async getSmartAccount(
    params: { walletClient: WalletClient; client: Client } & Pick<
      SafeSmartAccountParameters,
      "address" | "nonceKey" | "saltNonce" | "validUntil" | "validAfter"
    >
  ): Promise<SmartAccount> {
    return toSafeSmartAccount({
      ...(this.options || {}),
      entryPoint: {
        address: this.options?.entryPoint?.address || entryPoint07Address,
        version: this.options?.entryPoint?.version || "0.7",
      },
      version: this.options?.version || "1.4.1",
      ...params,
      owners: [params.walletClient],
      client: params.client,
    });
  }
}
