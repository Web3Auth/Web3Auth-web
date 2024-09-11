import { IProvider } from "@web3auth/base";
import { toSafeSmartAccount } from "permissionless/accounts";
import { Client, EIP1193Provider } from "viem";
import { SmartAccount } from "viem/account-abstraction";

import { ISmartAccount } from "./types";

type SafeSmartAccountParameters = Parameters<typeof toSafeSmartAccount>[0]; // use type of function so we don't need to pass in generic to parameter type

type SafeSmartAccountConfig = Omit<
  SafeSmartAccountParameters,
  "owners" | "client" | "address" | "nonceKey" | "saltNonce" | "validUntil" | "validAfter"
>;

export class SafeSmartAccount implements ISmartAccount {
  private options: SafeSmartAccountConfig;

  constructor(options: SafeSmartAccountConfig) {
    this.options = options;
  }

  async getSmartAccount(
    params: { owner: IProvider; client: Client } & Pick<
      SafeSmartAccountParameters,
      "address" | "nonceKey" | "saltNonce" | "validUntil" | "validAfter"
    >
  ): Promise<SmartAccount> {
    return toSafeSmartAccount({
      ...this.options,
      ...params,
      owners: [params.owner as EIP1193Provider],
      client: params.client,
    });
  }
}