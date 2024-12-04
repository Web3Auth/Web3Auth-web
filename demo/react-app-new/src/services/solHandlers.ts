/* eslint-disable @typescript-eslint/no-explicit-any */
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { CustomChainConfig, IProvider, log } from "@web3auth/base";
import { SolanaWallet } from "@web3auth/solana-provider";

const getConnection = async (provider: IProvider): Promise<Connection> => {
  const solanaWallet = new SolanaWallet(provider);

  const connectionConfig = await solanaWallet.request<never, CustomChainConfig>({ method: "solana_provider_config" });
  const conn = new Connection(connectionConfig.rpcTarget);
  return conn;
};

function getNewTx(publicKeys: any, blockhash: any) {
  const inst = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys[0]),
    toPubkey: new PublicKey(publicKeys[0]),
    lamports: 0.1 * LAMPORTS_PER_SOL,
  });
  return new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(inst);
}

export const getAccounts = async (provider: IProvider, uiConsole: any): Promise<string[] | undefined> => {
  try {
    const solWeb3 = new SolanaWallet(provider);
    const acc = await solWeb3.requestAccounts();
    uiConsole("accounts", acc);
    return acc;
  } catch (error) {
    log.error("Error", error);
    uiConsole("error", error);
    return [];
  }
};
export const getBalance = async (provider: IProvider, uiConsole: any): Promise<void> => {
  try {
    const conn = await getConnection(provider);
    const solanaWallet = new SolanaWallet(provider);
    const accounts = await solanaWallet.requestAccounts();
    const balance = await conn.getBalance(new PublicKey(accounts[0]));
    uiConsole("balance", balance);
  } catch (error) {
    log.error("Error", error);
    uiConsole("error", error);
  }
};

export const signAndSendTransaction = async (provider: IProvider, uiConsole: any) => {
  try {
    const conn = await getConnection(provider);
    const solWeb3 = new SolanaWallet(provider);
    const pubKey = await solWeb3.requestAccounts();

    const block = await conn.getLatestBlockhash("finalized");
    const transactionInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(pubKey[0]),
      toPubkey: new PublicKey(pubKey[0]),
      lamports: 0.01 * LAMPORTS_PER_SOL,
    });

    const transaction = new Transaction({
      blockhash: block.blockhash,
      lastValidBlockHeight: block.lastValidBlockHeight,
      feePayer: new PublicKey(pubKey[0]),
    }).add(transactionInstruction);

    const signature = await solWeb3.signAndSendTransaction(transaction);
    uiConsole("signature", signature);
  } catch (error) {
    log.error("Error", error);
    uiConsole("error", error);
  }
};

export const signTransaction = async (provider: IProvider, uiConsole: any) => {
  try {
    const conn = await getConnection(provider);
    const solWeb3 = new SolanaWallet(provider);
    const pubKey = await solWeb3.requestAccounts();

    const block = await conn.getLatestBlockhash("finalized");
    const transactionInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(pubKey[0]),
      toPubkey: new PublicKey(pubKey[0]),
      lamports: 0 * LAMPORTS_PER_SOL,
    });

    const transaction = new Transaction({
      blockhash: block.blockhash,
      lastValidBlockHeight: block.lastValidBlockHeight,
      feePayer: new PublicKey(pubKey[0]),
    }).add(transactionInstruction);

    const signedTx = await solWeb3.signTransaction(transaction);

    // const res = await conn.sendRawTransaction(signedTx.serialize());
    uiConsole("signature", signedTx);
    return { signature: signedTx };
  } catch (error) {
    log.error("Error", error);
    uiConsole("error", error);
    return undefined;
  }
};

export const signMessage = async (provider: IProvider, uiConsole: any) => {
  try {
    const solWeb3 = new SolanaWallet(provider);
    const msg = Buffer.from("Test Signing Message ", "utf8");
    const res = await solWeb3.signMessage(new Uint8Array(msg));
    uiConsole(res);
  } catch (error) {
    log.error("Error", error);
    uiConsole("error", error);
  }
};

export const signAllTransactions = async (provider: IProvider, uiConsole: any) => {
  try {
    const conn = await getConnection(provider);
    const solWeb3 = new SolanaWallet(provider);
    const publicKeys = await solWeb3.requestAccounts();
    const { blockhash } = await conn.getRecentBlockhash("finalized");
    log.info("blockhash", blockhash);

    const signedTx = await solWeb3.signAllTransactions([
      getNewTx(publicKeys, blockhash),
      getNewTx(publicKeys, blockhash),
      getNewTx(publicKeys, blockhash),
    ]);
    log.info("signedTx", signedTx);
    uiConsole("signature", signedTx);
  } catch (error) {
    log.error("Error", error);
    uiConsole("error", error);
  }
};
