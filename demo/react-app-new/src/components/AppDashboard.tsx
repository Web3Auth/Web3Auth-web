import React, { useEffect, useMemo, useState } from "react";
import { useWeb3Auth } from "@web3auth/modal-react-hooks";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context";
import { Button, Card } from "./CommonUI";
import { CHAIN_NAMESPACES, IProvider, WALLET_ADAPTERS, WALLET_PLUGINS } from "@web3auth/base";
import { WalletServicesPlugin } from "@web3auth/wallet-services-plugin";
import { getAccounts, getBalance, getChainId, sendEth, signEthMessage, signTransaction } from "../services/ethHandlers";
import { signAllTransactions, signAndSendTransaction, signMessage } from "../services/solHandlers";
import { METHOD_TYPES } from "@toruslabs/ethereum-controllers";
import { recoverAddress, TypedDataEncoder, verifyMessage } from "ethers";
import { getV4TypedData } from "../config";

const AppDashboard: React.FC = () => {
  const { chainNamespace, walletPlugin, network } = useAppContext();
  const { t } = useTranslation();
  const { userInfo, isConnected, provider, switchChain, addAndSwitchChain, web3Auth, status } = useWeb3Auth();

  const { log } = console;

  const isDisplay = useMemo(() => {
    const dashboard = isConnected;
    const ethServices = chainNamespace === CHAIN_NAMESPACES.EIP155;
    const solServices = chainNamespace === CHAIN_NAMESPACES.SOLANA;
    const walletServices =
      chainNamespace === CHAIN_NAMESPACES.EIP155 && walletPlugin?.enable && web3Auth?.connectedAdapterName === WALLET_ADAPTERS.AUTH;
    return {
      dashboard,
      ethServices,
      solServices,
      walletServices,
    };
  }, [isConnected, chainNamespace, walletPlugin, web3Auth]);

  const showWalletUI = async () => {
    const walletPlugin = web3Auth?.getPlugin(WALLET_PLUGINS.WALLET_SERVICES) as WalletServicesPlugin;
    await walletPlugin.showWalletUi();
  };
  const showCheckout = async () => {
    const walletPlugin = web3Auth?.getPlugin(WALLET_PLUGINS.WALLET_SERVICES) as WalletServicesPlugin;
    await walletPlugin.showCheckout();
  };
  const showWalletConnectScanner = async () => {
    const walletPlugin = web3Auth?.getPlugin(WALLET_PLUGINS.WALLET_SERVICES) as WalletServicesPlugin;
    await walletPlugin.showWalletConnectScanner();
  };

  const clearConsole = () => {
    const el = document.querySelector("#console>pre");
    const h1 = document.querySelector("#console>h1");
    const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
    if (h1) {
      h1.innerHTML = "";
    }
    if (el) {
      el.innerHTML = "";
    }
    if (consoleBtn) {
      consoleBtn.style.display = "none";
    }
  };

  const printToConsole = (...args: unknown[]) => {
    const el = document.querySelector("#console>pre");
    const h1 = document.querySelector("#console>h1");
    const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
    if (h1) {
      h1.innerHTML = args[0] as string;
    }
    if (el) {
      el.innerHTML = JSON.stringify(args[1] || {}, null, 2);
    }
    if (consoleBtn) {
      consoleBtn.style.display = "block";
    }
  };

  const onGetUserInfo = async () => {
    printToConsole("User Info", userInfo);
  };

  const onSendEth = async () => {
    await sendEth(provider as IProvider, printToConsole);
  };

  const onSignEthMessage = async () => {
    await signEthMessage(provider as IProvider, printToConsole);
  };

  const onGetAccounts = async () => {
    await getAccounts(provider as IProvider, printToConsole);
  };

  const getConnectedChainId = async () => {
    await getChainId(provider as IProvider, printToConsole);
  };

  const onGetBalance = async () => {
    await getBalance(provider as IProvider, printToConsole);
  };

  const onSwitchChain = async () => {
    log("switching chain");
    try {
      await switchChain({ chainId: "0x89" });
      printToConsole("switchedChain");
    } catch (error) {
      printToConsole("switchedChain error", error);
    }
  };

  const onAddChain = async () => {
    try {
      await addAndSwitchChain({
        chainId: "0xaa36a7",
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        rpcTarget: "https://1rpc.io/sepolia	",
        blockExplorerUrl: "https://sepolia.etherscan.io",
        displayName: "Sepolia",
        ticker: "ETH",
        tickerName: "Ethereum",
      });
      printToConsole("added chain");
    } catch (error) {
      printToConsole("add chain error", error);
    }
  };

  const onSignAndSendTransaction = async () => {
    await signAndSendTransaction(provider as IProvider, printToConsole);
  };

  const onSignTransaction = async () => {
    await signTransaction(provider as IProvider, printToConsole);
  };

  const onSignMessage = async () => {
    await signMessage(provider as IProvider, printToConsole);
  };

  const onSignAllTransactions = async () => {
    await signAllTransactions(provider as IProvider, printToConsole);
  };

  const onSignTypedData_v4 = async () => {
    try {
      printToConsole("Initiating sign typed data v4");

      const chain = await getChainId(provider as IProvider, () => {});
      const accounts = await getAccounts(provider as IProvider, () => {});
      const typedData = getV4TypedData(chain as string);
      let signTypedDataV4VerifyResult = "";
      // const signedMessage = await ethersProvider?.send("eth_signTypedData_v4", [account.value, JSON.stringify(typedData)]);

      const from = accounts?.[0];

      const signedMessage = (await provider?.request({
        method: METHOD_TYPES.ETH_SIGN_TYPED_DATA_V4,
        params: [from, JSON.stringify(typedData)],
      })) as string;

      const msg = TypedDataEncoder.hash(typedData.domain, typedData.types, typedData.message);
      const recoveredAddr = recoverAddress(msg, signedMessage);
      if (recoveredAddr.toLowerCase() === from?.toLowerCase()) {
        log(`Successfully verified signer as ${recoveredAddr}`);
        signTypedDataV4VerifyResult = recoveredAddr;
      } else {
        throw new Error(`Failed to verify signer when comparing ${recoveredAddr} to ${from}`);
      }
      printToConsole(`Success`, { signedMessage, verify: signTypedDataV4VerifyResult });
    } catch (error) {
      log(error);
      printToConsole("Failed", (error as Error).message);
    }
  };

  const onSignPersonalMsg = async () => {
    try {
      printToConsole("Initiating personal sign");
      const message = "Example `personal_sign` messages";
      const accounts = await getAccounts(provider as IProvider, () => {});
      const from = accounts?.[0];
      let personalSignVerifySigUtilResult = "";
      // const signedMessage = await ethersProvider?.send("personal_sign", [message, account.value]);
      const msg = `0x${Buffer.from(message, "utf8").toString("hex")}`;
      const signedMessage = (await provider?.request({
        method: METHOD_TYPES.PERSONAL_SIGN,
        params: [msg, from, "Example password"],
      })) as string;

      // Verify
      const recoveredAddr = verifyMessage(message, signedMessage);

      if (recoveredAddr.toLowerCase() === from?.toLowerCase()) {
        log(`SigUtil Successfully verified signer as ${recoveredAddr}`);
        personalSignVerifySigUtilResult = recoveredAddr;
      } else {
        throw new Error(`SigUtil Failed to verify signer when comparing ${recoveredAddr} to ${from}`);
      }

      printToConsole(`Success`, { signedMessage, verify: personalSignVerifySigUtilResult });
    } catch (error) {
      log(error);
      printToConsole("Failed", (error as Error).message);
    }
  };

  return (
    isDisplay.dashboard && (
      <div className="grid gap-0">
        <div className="grid grid-cols-8 gap-0">
          <div className="col-span-1"></div>
          <Card className="px-4 py-4 gird col-span-2">
            <div className="mb-2">
              <Button onClick={clearConsole}>
                { t("app.buttons.btnClearConsole") }
              </Button>
            </div>
            <div className="mb-2">
              <Button onClick={onGetUserInfo}>
                { t("app.buttons.btnGetUserInfo") }
              </Button>
            </div>
            {isDisplay.walletServices &&(
              <Card className="px-4 py-4 gap-4 h-auto mb-2">
                <div className="text-xl font-bold leading-tight text-left mb-2">Wallet Service</div>
                <Button onClick={showWalletUI} >
                  { t("app.buttons.btnShowWalletUI") }
                </Button>
                <Button className="mb-2" onClick={showWalletConnectScanner}>
                  { t("app.buttons.btnShowWalletConnectScanner") }
                </Button>
                <Button className="mb-2" onClick={showCheckout}>
                  { t("app.buttons.btnShowCheckout") }
                </Button>
              </Card>
            )}
            {isDisplay.ethServices &&( 
              <Card className="px-4 py-4 gap-4 h-auto mb-2">
                <div className="text-xl font-bold leading-tight text-left mb-2">Sample Transaction</div>
                <Button className="m-2" onClick={onGetAccounts} >
                  { t("app.buttons.btnGetAccounts") }
                </Button>
                <Button className="m-2" onClick={onGetBalance}>
                  { t("app.buttons.btnGetBalance") }
                </Button>
                <Button className="m-2" onClick={onSendEth}>{ t("app.buttons.btnSendEth") }</Button>
                <Button className="m-2" onClick={onSignEthMessage}>{ t("app.buttons.btnSignEthMessage") }</Button>
                <Button className="m-2" onClick={getConnectedChainId}>
                  { t("app.buttons.btnGetConnectedChainId") }
                </Button>
                <Button className="m-2" onClick={onSignTypedData_v4}>
                  { t("app.buttons.btnSignTypedData_v4") }
                </Button>
                <Button className="m-2" onClick={onSignPersonalMsg}>
                  { t("app.buttons.btnSignPersonalMsg") }
                </Button>
              </Card>
            )}
            {isDisplay.solServices &&(
              <Card className="px-4 py-4 gap-4 h-auto mb-2">
                <div className="text-xl font-bold leading-tight text-left mb-2">Sample Transaction</div>
                <Button className="m-2" onClick={onAddChain}>{ t("app.buttons.btnAddChain") }</Button>
                <Button className="m-2" onClick={onSwitchChain}>{ t("app.buttons.btnSwitchChain") }</Button>
                <Button className="m-2" onClick={onSignAndSendTransaction}>
                  { t("app.buttons.btnSignAndSendTransaction") }
                </Button>
                <Button className="m-2" onClick={onSignTransaction}>
                  { t("app.buttons.btnSignTransaction") }
                </Button>
                <Button className="m-2" onClick={onSignMessage}>{ t("app.buttons.btnSignMessage") }</Button>
                <Button className="m-2" onClick={onSignAllTransactions}>
                  { t("app.buttons.btnSignAllTransactions") }
                </Button>
              </Card>
            )}
          </Card>
          <Card id="console" className="px-4 py-4 col-span-4 overflow-y-auto">
            <pre className="whitespace-pre-line overflow-x-auto font-normal text-base leading-6 text-black break-words overflow-y-auto max-h-screen"></pre>
          </Card>
        </div>
      </div>
    )
  );
};

export default AppDashboard;
