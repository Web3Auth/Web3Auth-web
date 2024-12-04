/* eslint-disable @typescript-eslint/no-explicit-any */
import { IProvider, log } from "@web3auth/base";
import Web3 from "web3";

export const sendEth = async (provider: IProvider, uiConsole: any) => {
  try {
    const web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();
    log.info("pubKey", accounts);
    const txRes = await web3.eth.sendTransaction({
      from: accounts[0],
      to: accounts[0],
      value: web3.utils.toWei("0.01", "ether"),
    });
    uiConsole("txRes", txRes);
  } catch (error) {
    log.info("error", error);
    uiConsole("error", error);
  }
};

export const signEthMessage = async (provider: IProvider, uiConsole: any) => {
  try {
    const web3 = new Web3();
    web3.setProvider(provider);
    // hex message
    // const message = "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad";
    const fromAddress = (await web3.eth.getAccounts())[0];
    log.info("fromAddress", fromAddress);
    // const signedMessage = await provider.request({
    //   method: "eth_sign",
    //   params: [fromAddress, message],
    // });

    const message = "Some string";
    const hash = web3.utils.sha3(message) as string;
    const sig = await web3.eth.personal.sign(hash, fromAddress, "");
    uiConsole("personal sign", sig);
    // const originalMessage = {
    //   types: {
    //     EIP712Domain: [
    //       {
    //         name: "name",
    //         type: "string",
    //       },
    //       {
    //         name: "version",
    //         type: "string",
    //       },
    //       {
    //         name: "chainId",
    //         type: "uint256",
    //       },
    //       {
    //         name: "verifyingContract",
    //         type: "address",
    //       },
    //     ],
    //     Person: [
    //       {
    //         name: "name",
    //         type: "string",
    //       },
    //       {
    //         name: "wallet",
    //         type: "address",
    //       },
    //     ],
    //     Mail: [
    //       {
    //         name: "from",
    //         type: "Person",
    //       },
    //       {
    //         name: "to",
    //         type: "Person",
    //       },
    //       {
    //         name: "contents",
    //         type: "string",
    //       },
    //     ],
    //   },
    //   primaryType: "Mail",
    //   domain: {
    //     name: "Ether Mail",
    //     version: "1",
    //     chainId: 1,
    //     verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
    //   },
    //   message: {
    //     from: {
    //       name: "Cow",
    //       wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    //     },
    //     to: {
    //       name: "Bob",
    //       wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
    //     },
    //     contents: "Hello, Bob!",
    //   },
    // };
    // const params = [originalMessage, fromAddress];
    // const method = "eth_signTypedData";

    // const signedMessage = await provider.request({
    //   method,
    //   params,
    // });
    // uiConsole("signedMessage orog", signedMessage);
  } catch (error) {
    log.error("error", error);
    uiConsole("error", error);
  }
};

export const getAccounts = async (provider: IProvider, uiConsole: any): Promise<string[] | undefined> => {
  try {
    const web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();
    uiConsole("accounts", accounts);
    return accounts;
  } catch (error) {
    log.error("Error", error);
    uiConsole("error", error);
    return [];
  }
};
export const getChainId = async (provider: IProvider, uiConsole: any): Promise<string | undefined> => {
  try {
    const web3 = new Web3(provider);
    const chainId = await web3.eth.getChainId();
    uiConsole("chainId", chainId.toString());
    return chainId.toString();
  } catch (error) {
    log.error("Error", error);
    uiConsole("error", error);
    return undefined;
  }
};
export const getBalance = async (provider: IProvider, uiConsole: any) => {
  try {
    const web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();
    const balance = await web3.eth.getBalance(accounts[0]);
    uiConsole("balance", balance.toString());
  } catch (error) {
    log.error("Error", error);
    uiConsole("error", error);
  }
};

export const signTransaction = async (provider: IProvider, uiConsole: any) => {
  try {
    const web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();

    // only supported with social logins (openlogin adapter)
    const txRes = await web3.eth.signTransaction({
      from: accounts[0],
      to: accounts[0],
      value: web3.utils.toWei("0.01", "ether"),
    });
    uiConsole("txRes", txRes);
  } catch (error) {
    log.info("error", error);
    uiConsole("error", error);
  }
};
