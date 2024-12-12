import { toBiconomySmartAccount, ToBiconomySmartAccountParameters } from "permissionless/accounts";
import { Client, WalletClient } from "viem";
import { entryPoint06Address, SmartAccount } from "viem/account-abstraction";

import { SMART_ACCOUNT } from "./constants";
import { ISmartAccount } from "./types";

type BiconomySmartAccountConfig = Pick<ToBiconomySmartAccountParameters, "entryPoint" | "ecdsaModuleAddress" | "factoryAddress">;

export class BiconomySmartAccount implements ISmartAccount {
  readonly name: string = SMART_ACCOUNT.BICONOMY;

  private options: BiconomySmartAccountConfig;

  constructor(options?: BiconomySmartAccountConfig) {
    this.options = options;
  }

  async getSmartAccount(
    params: { walletClient: WalletClient; client: Client } & Pick<ToBiconomySmartAccountParameters, "index" | "nonceKey" | "address">
  ): Promise<SmartAccount> {
    return toBiconomySmartAccount({
      ...(this.options || {}),
      entryPoint: {
        address: this.options?.entryPoint?.address || entryPoint06Address,
        version: this.options?.entryPoint?.version || "0.6",
      },
      ...params,
      owners: [params.walletClient],
      client: params.client,
    });
  }
}
