import { useEffect, useState } from "react";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { ADAPTER_EVENTS, CHAIN_NAMESPACES, CustomChainConfig, PLUGIN_EVENTS, SafeEventEmitterProvider, WALLET_ADAPTERS, getChainConfig, getEvmChainConfig } from "@web3auth/base";
import { OpenloginAdapter, OpenloginAdapterOptions, OpenloginLoginParams } from "@web3auth/openlogin-adapter";
// import { TorusWalletAdapter } from "@web3auth/torus-evm-adapter";
// import { CoinbaseAdapter } from "@web3auth/coinbase-adapter";
import { PhantomAdapter } from "@web3auth/phantom-adapter";
import "./App.css";
import RPC from "./web3RPC"; // for using web3.js
import { MetamaskAdapter } from "@web3auth/metamask-adapter";
import { CoinbaseAdapter } from "@web3auth/coinbase-adapter";
import { SolanaWalletAdapter } from "@web3auth/torus-solana-adapter";
//import RPC from "./ethersRPC"; // for using ethers.js
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { PasskeysPlugin } from "@web3auth/passkeys-pnp-plugin";
import { WalletServicesPlugin } from "@web3auth/wallet-services-plugin";

const clientId = "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk"; // get from https://dashboard.web3auth.io

function App() {
  const [web3auth, setWeb3auth] = useState<Web3AuthNoModal | null>(null);
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(null);
  const [passkeysPlugin, setPasskeysPlugin] = useState<PasskeysPlugin | null>(null);
  const [walletServicesPlugin, setWalletServicesPlugin] = useState<WalletServicesPlugin | null>(null);

  useEffect(() => {
    const subscribeAuthEvents = (web3auth: Web3AuthNoModal) => {
      // Can subscribe to all ADAPTER_EVENTS and LOGIN_MODAL_EVENTS
      web3auth.on(ADAPTER_EVENTS.CONNECTED, (data: unknown) => {
        console.log("Yeah!, you are successfully logged in", data);
        setProvider(web3auth.provider!);
      });

      web3auth.on(ADAPTER_EVENTS.CONNECTING, () => {
        console.log("connecting");
      });

      web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
        console.log("disconnected");
      });

      web3auth.on(ADAPTER_EVENTS.ERRORED, (error: unknown) => {
        console.error("some error or user has cancelled login request", error);
      });
    };

    const subscribePluginEvents = (plugin: WalletServicesPlugin) => {
      // Can subscribe to all PLUGIN_EVENTS and LOGIN_MODAL_EVENTS
      plugin.on(PLUGIN_EVENTS.CONNECTED, (data: unknown) => {
        console.log("Yeah!, you are successfully logged in to plugin");
      });

      plugin.on(PLUGIN_EVENTS.CONNECTING, () => {
        console.log("connecting plugin");
      });

      plugin.on(PLUGIN_EVENTS.DISCONNECTED, () => {
        console.log("plugin disconnected");
      });

      plugin.on(PLUGIN_EVENTS.ERRORED, (error) => {
        console.error("some error on plugin login", error);
      });
    };
    
    const init = async () => {
      try {
        const web3authInstance = new Web3AuthNoModal({
          clientId,
          chainConfig: {
            displayName: "Ethereum Mainnet",
            chainId: "0x1",
            rpcTarget: `https://rpc.ankr.com/eth`,
            blockExplorerUrl: "https://etherscan.io/",
            ticker: "ETH",
            tickerName: "Ethereum",
            logo: "https://images.toruswallet.io/eth.svg",
            chainNamespace: CHAIN_NAMESPACES.EIP155,
          },
          web3AuthNetwork: "cyan",
        });

        setWeb3auth(web3authInstance);

        const openloginAdapter = new OpenloginAdapter({
          privateKeyProvider: new EthereumPrivateKeyProvider({
            config: {
              chainConfig: getEvmChainConfig(1) as CustomChainConfig,
            },
          }),
        });
        web3authInstance.configureAdapter(openloginAdapter);

        // Passkeys Plugin
        const localPasskeysPlugin = new PasskeysPlugin({ buildEnv: 'testing' });
        web3authInstance.addPlugin(localPasskeysPlugin);
        setPasskeysPlugin(localPasskeysPlugin);

        const walletServicesPlugin = new WalletServicesPlugin({
          wsEmbedOpts: {},
          walletInitOptions: {
            whiteLabel: { 
              showWidgetButton: true, 
              logoLight: "https://web3auth.io/images/web3auth-logo.svg",
              logoDark: "https://web3auth.io/images/web3auth-logo.svg", 
            },
          },
        });
        subscribePluginEvents(walletServicesPlugin);
        subscribeAuthEvents(web3authInstance);
        setWalletServicesPlugin(walletServicesPlugin);
        web3authInstance.addPlugin(walletServicesPlugin);

        await web3authInstance.init();
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const login = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    await web3auth.connectTo<OpenloginLoginParams>(WALLET_ADAPTERS.OPENLOGIN, { loginProvider: "google" });
  };

  const registerWithPasskey = async () => { 
    if (!passkeysPlugin) {
      console.log("passkeysPlugin not initialized yet");
      uiConsole("passkeysPlugin not initialized yet");
      return;
    }
    const userInfo = await web3auth?.getUserInfo();
     
    const res = await passkeysPlugin.registerPasskey({ 
      username: `${userInfo?.typeOfLogin}|${userInfo?.email || userInfo?.name} - ${new Date().toLocaleDateString("en-GB")}`
    });
    if (res) uiConsole("Passkey registered successfully");
  }

  const loginWithPasskey = async () => { 
    if (!passkeysPlugin) {
      console.log("passkeysPlugin not initialized yet");
      uiConsole("passkeysPlugin not initialized yet");
      return;
    }
    await passkeysPlugin.loginWithPasskey();
  }

  const listAllPasskeys = async () => {
    if (!passkeysPlugin) {
      uiConsole("passkeysPlugin not initialized yet");
      return;
    }
    const res = await passkeysPlugin?.listAllPasskeys();
    uiConsole(res);
  };


  const authenticateUser = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    const idToken = await web3auth.authenticateUser();
    uiConsole(idToken);
  };

  const getUserInfo = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    const user = await web3auth.getUserInfo();
    uiConsole(user);
  };

  const logout = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    await web3auth.logout();
    setProvider(null);
  };

  const getChainId = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const chainId = await rpc.getChainId();
    uiConsole(chainId);
  };

  const addChain = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const newChain = {
      chainId: "0x5",
      displayName: "Goerli",
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      tickerName: "Goerli",
      ticker: "ETH",
      decimals: 18,
      rpcTarget: "https://rpc.ankr.com/eth_goerli",
      blockExplorer: "https://goerli.etherscan.io",
    };
    await web3auth?.addChain(newChain);
    uiConsole("New Chain Added");
  };

  const switchChain = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    await web3auth?.switchChain({ chainId: "0x5" });
    uiConsole("Chain Switched");
  };

  const getAccounts = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const address = await rpc.getAccounts();
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const balance = await rpc.getBalance();
    uiConsole(balance);
  };

  const sendTransaction = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const receipt = await rpc.sendTransaction();
    uiConsole(receipt);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const signedMessage = await rpc.signMessage();
    uiConsole(signedMessage);
  };

  const getPrivateKey = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const privateKey = await rpc.getPrivateKey();
    uiConsole(privateKey);
  };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2);
    }
  }

  const loggedInView = (
    <>
      <div className="flex-container">
        <div>
          <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={authenticateUser} className="card">
            Get ID Token
          </button>
        </div>
        <div>
          <button onClick={getChainId} className="card">
            Get Chain ID
          </button>
        </div>
        <div>
          <button onClick={addChain} className="card">
            Add Chain
          </button>
        </div>
        <div>
          <button onClick={switchChain} className="card">
            Switch Chain
          </button>
        </div>
        <div>
          <button onClick={getAccounts} className="card">
            Get Accounts
          </button>
        </div>
        <div>
          <button onClick={getBalance} className="card">
            Get Balance
          </button>
        </div>
        <div>
          <button onClick={signMessage} className="card">
            Sign Message
          </button>
        </div>
        <div>
          <button onClick={sendTransaction} className="card">
            Send Transaction
          </button>
        </div>
        <div>
          <button onClick={getPrivateKey} className="card">
            Get Private Key
          </button>
        </div>
        <div>
          <button onClick={registerWithPasskey} className="card">
            Register Passkey
          </button>
        </div>
        <div>
          <button onClick={listAllPasskeys} className="card">
            List All Passkeys
          </button>
        </div>
        <div>
          <button onClick={logout} className="card">
            Log Out
          </button>
        </div>
      </div>
      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}>Logged in Successfully!</p>
      </div>
    </>
  );

  const unloggedInView = (
    <>
      <button onClick={login} className="card">
        Login
      </button>
      <button onClick={loginWithPasskey} className="card">
        Login with passkey
      </button>
    </>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="http://web3auth.io/" rel="noreferrer">
          Web3Auth{" "}
        </a>
        & ReactJS Example
      </h1>

      <div className="grid">{provider ? loggedInView : unloggedInView}</div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/examples/tree/master/web-no-modal-sdk/evm/react-evm-no-modal-example"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
