import { rpcErrors } from "@metamask/rpc-errors";
import { JRPCRequest } from "@toruslabs/openlogin-jrpc";
import { CustomChainConfig } from "@web3auth/base";
import { generateSeed, sign } from "ripple-keypairs";
// import { providerErrors, rpcErrors } from "@metamask/rpc-errors";
import { Client, deriveAddress, SubmitResponse, Transaction, Wallet } from "xrpl";
import ECDSA from "xrpl/dist/npm/ECDSA";

import { IProviderHandlers, KeyPair } from "../../rpc/xrplRpcMiddlewares";

const deriveKeypair = (web3authKey: string): { publicKey: string; privateKey: string } => {
  const seed = generateSeed({ entropy: Buffer.from(web3authKey.padStart(64, "0"), "hex"), algorithm: "ecdsa-secp256k1" });
  const wallet = Wallet.fromSecret(seed, { algorithm: ECDSA.secp256k1 }); // web3auth network currently only supports the secp256k1 key
  return { privateKey: wallet.privateKey, publicKey: wallet.publicKey };
};

export async function getProviderHandlers({
  privKey: web3authKey,
  chainConfig,
}: {
  privKey: string;
  chainConfig: CustomChainConfig;
}): Promise<IProviderHandlers> {
  const client = new Client(chainConfig?.rpcUrls?.default?.webSocket?.[0]);
  await client.connect();
  return {
    getAccounts: async (_: JRPCRequest<unknown>): Promise<string[]> => {
      const { publicKey } = deriveKeypair(web3authKey);
      const accAddress = deriveAddress(publicKey);
      return [accAddress];
    },
    getKeyPair: async (_: JRPCRequest<unknown>): Promise<KeyPair> => {
      return deriveKeypair(web3authKey);
    },
    getPublicKey: async (_: JRPCRequest<unknown>): Promise<string> => {
      const keyPair = deriveKeypair(web3authKey);
      return keyPair.publicKey;
    },
    signTransaction: async (
      req: JRPCRequest<{ transaction: Transaction; multisign?: boolean | string }>
    ): Promise<{
      tx_blob: string;
      hash: string;
    }> => {
      const { transaction, multisign } = req.params || {};
      if (!transaction) throw rpcErrors.invalidParams("Invalid params, req.params.transaction is required");
      const { publicKey, privateKey } = deriveKeypair(web3authKey);
      const wallet = new Wallet(publicKey, privateKey);
      return wallet.sign(transaction, multisign);
    },
    submitTransaction: async (req: JRPCRequest<{ transaction: Transaction }>): Promise<SubmitResponse> => {
      const { transaction } = req.params || {};
      if (!transaction) throw rpcErrors.invalidParams("Invalid params, req.params.transaction is required");
      const { publicKey, privateKey } = deriveKeypair(web3authKey);
      const wallet = new Wallet(publicKey, privateKey);
      const res = await client.submit(transaction, { wallet });
      return res;
    },
    signMessage: async (req: JRPCRequest<{ message: string }>): Promise<{ signature: string }> => {
      const { message } = req.params || {};
      if (!message) throw rpcErrors.invalidParams("Invalid params, req.params.message is required");
      const keyPair = deriveKeypair(web3authKey);
      const signature = sign(message, keyPair.privateKey);
      return { signature };
    },
  };
}
