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

export abstract class BaseEvmAdapter<T> extends BaseAdapter<T> {
  async init(_?: AdapterInitOptions): Promise<void> {
    if (!this.chainConfig) this.chainConfig = getChainConfig(CHAIN_NAMESPACES.EIP155, 1);
  }

  async authenticateUser(): Promise<UserAuthInfo> {
    if (!this.provider || this.status !== ADAPTER_STATUS.CONNECTED) throw WalletLoginError.notConnectedError();
    const { chainNamespace, id: chainId } = this.chainConfig;
    const accounts = await this.provider.request<never, string[]>({
      method: "eth_accounts",
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

      const signedMessage = await this.provider.request<[string, string], string>({
        method: "personal_sign",
        params: [challenge, accounts[0]],
      });

      const idToken = await verifySignedChallenge(
        chainNamespace,
        signedMessage as string,
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
      method: "eth_accounts",
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
