import { ChainNamespaceType, signChallenge, verifySignedChallenge } from "@toruslabs/base-controllers";
import { getPublicCompressed } from "@toruslabs/eccrypto";
import { CHAIN_NAMESPACES, IProvider, OPENLOGIN_NETWORK_TYPE } from "@web3auth/base";
import bs58 from "bs58";

import { ExternalAuthTokenPayload, OpenloginAdapterOptions, OpenloginUserInfo } from "./interface";

export function getBufferFromHexKey(hexString: string): Buffer {
  return Buffer.from(hexString.padStart(64, "0"), "hex");
}

export const getAuthToken = async ({
  sessionId,
  userInfo,
  wallets,
  chainNamespace,
  provider,
  options,
}: {
  sessionId: string;
  userInfo: OpenloginUserInfo;
  wallets: ExternalAuthTokenPayload["wallets"];
  chainNamespace: ChainNamespaceType;
  provider: IProvider;
  options: OpenloginAdapterOptions["adapterSettings"];
}) => {
  const getSignedMessage = async (challenge: string, accounts: string[]) => {
    const signedMessage = await provider.request<string[] | { message: Uint8Array }, string | Uint8Array>({
      method: chainNamespace === CHAIN_NAMESPACES.EIP155 ? "personal_sign" : "signMessage",
      params: chainNamespace === CHAIN_NAMESPACES.EIP155 ? [challenge, accounts[0]] : { message: Buffer.from(challenge) },
    });
    if (chainNamespace === CHAIN_NAMESPACES.SOLANA) return bs58.encode(signedMessage as Uint8Array);
    return signedMessage as string;
  };

  const accounts = await provider.request<unknown, string[]>({
    method: chainNamespace === CHAIN_NAMESPACES.EIP155 ? "eth_accounts" : "getAccounts",
  });

  const jwtPayload = {
    nonce: Math.random().toString(36).slice(2),
    issuedAt: new Date().toISOString(),
    version: "1",
    chainId: parseInt(provider.chainId, 16),
    address: accounts[0],
    domain: window.location.origin,
    uri: window.location.href,
  };

  const additionalMetadata: Partial<ExternalAuthTokenPayload> = {
    nonce: getPublicCompressed(getBufferFromHexKey(sessionId)).toString("hex"),
  };
  const { email, name, profileImage, verifier, verifierId, aggregateVerifier } = userInfo;
  if (email) additionalMetadata.email = email;
  if (name) additionalMetadata.name = name;
  if (profileImage) additionalMetadata.profileImage = profileImage;
  if (verifier) additionalMetadata.verifier = verifier;
  if (verifierId) additionalMetadata.verifierId = verifierId;
  if (aggregateVerifier) additionalMetadata.aggregateVerifier = aggregateVerifier;

  if (wallets) {
    additionalMetadata.wallets = wallets;
  }

  const challenge = await signChallenge(jwtPayload, chainNamespace);
  const signedMessage = await getSignedMessage(challenge, accounts);
  const idToken = await verifySignedChallenge(
    chainNamespace,
    signedMessage,
    challenge,
    "https://authjs.web3auth.io/jwks",
    options.sessionTime,
    options.clientId,
    options.network as OPENLOGIN_NETWORK_TYPE,
    options.clientId,
    additionalMetadata
  );
  return idToken;
};
