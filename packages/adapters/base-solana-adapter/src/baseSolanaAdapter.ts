import { signChallenge, verifySignedChallenge } from "@toruslabs/base-controllers";
import {
  ADAPTER_EVENTS,
  ADAPTER_STATUS,
  AdapterInitOptions,
  BaseAdapter,
  CHAIN_NAMESPACES,
  checkIfTokenIsExpired,
  clearToken,
  getChainConfig,
  getSavedToken,
  saveToken,
  UserAuthInfo,
  WalletLoginError,
} from "@web3auth/base";
import bs58 from "bs58";

export abstract class BaseSolanaAdapter<T> extends BaseAdapter<T> {
  async init(_?: AdapterInitOptions): Promise<void> {
    if (!this.chainConfig) this.chainConfig = getChainConfig(CHAIN_NAMESPACES.SOLANA, 1);
  }

  async authenticateUser(): Promise<UserAuthInfo> {
    if (!this.provider || this.status !== ADAPTER_STATUS.CONNECTED) throw WalletLoginError.notConnectedError();

    const { chainNamespace, id: chainId } = this.chainConfig;

    const accounts = await this.provider.request<never, string[]>({
      method: "getAccounts",
    });
    if (accounts && accounts.length > 0) {
      const existingToken = getSavedToken(accounts[0] as string, this.name);
      if (existingToken) {
        const isExpired = checkIfTokenIsExpired(existingToken);
        if (!isExpired) {
          return { idToken: existingToken };
        }
      }

      const payload = {
        domain: window.location.origin,
        uri: window.location.href,
        address: accounts[0],
        chainId,
        version: "1",
        nonce: Math.random().toString(36).slice(2),
        issuedAt: new Date().toISOString(),
      };

      const challenge = await signChallenge(payload, chainNamespace);
      const encodedMessage = new TextEncoder().encode(challenge);
      const signedMessage = await this.provider.request<{ message: Uint8Array; display: string }, Uint8Array>({
        method: "signMessage",
        params: {
          message: encodedMessage,
          display: "utf8",
        },
      });
      const idToken = await verifySignedChallenge(
        chainNamespace,
        bs58.encode(signedMessage as Uint8Array),
        challenge,
        this.name,
        this.sessionTime,
        this.clientId,
        this.web3AuthNetwork
      );
      saveToken(accounts[0] as string, this.name, idToken);
      return {
        idToken,
      };
    }
    throw WalletLoginError.notConnectedError("Not connected with wallet, Please login/connect first");
  }

  async disconnectSession(): Promise<void> {
    super.checkDisconnectionRequirements();
    const accounts = await this.provider.request<never, string[]>({
      method: "getAccounts",
    });
    if (accounts && accounts.length > 0) {
      clearToken(accounts[0], this.name);
    }
  }

  async disconnect(): Promise<void> {
    this.rehydrated = false;
    this.emit(ADAPTER_EVENTS.DISCONNECTED);
  }
}
