import { IBaseSmartAccount } from "@web3auth/base";
import { Client, WalletClient } from "viem";
import { SmartAccount } from "viem/account-abstraction";

export interface ISmartAccount extends IBaseSmartAccount {
  getSmartAccount(params: { client: Client; walletClient: WalletClient }): Promise<SmartAccount>;
}
