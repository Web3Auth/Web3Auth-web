import { WALLET_ADAPTERS } from "@web3auth/base";
import { useWeb3Auth } from "../services/web3auth";
import styles from "../styles/Home.module.css";

const Main = () => {
  const {
    provider,
    login,
    logout,
    getUserInfo,
    getAccounts,
    getBalance,
    signMessage,
    signTransaction,
    signAndSendTransaction,
    web3Auth,
    chain,
    addChain,
    switchChain,
    getTokenBalance,
    signAndSendTokenTransaction,
    randomContractInteraction,
    showWalletConnectScanner,
    enableMFA,
    registerPasskey,
  } = useWeb3Auth();

  const loggedInView = (
    <>
      <button onClick={getUserInfo} className={styles.card}>
        Get User Info
      </button>
      <button onClick={getAccounts} className={styles.card}>
        Get Accounts
      </button>
      <button onClick={getBalance} className={styles.card}>
        Get Balance
      </button>
      <button onClick={getTokenBalance} className={styles.card}>
        Get Token Balance
      </button>
      <button onClick={signMessage} className={styles.card}>
        Sign Message
      </button>
      <button onClick={addChain} className={styles.card}>
        Add Chain
      </button>
      <button onClick={switchChain} className={styles.card}>
        Switch Chain
      </button>
      <button onClick={enableMFA} className={styles.card}>
        Enable MFA
      </button>
      {(web3Auth?.connectedAdapterName === WALLET_ADAPTERS.OPENLOGIN || chain === "solana") && (
        <button onClick={signTransaction} className={styles.card}>
          Sign Transaction
        </button>
      )}
      <button onClick={signAndSendTransaction} className={styles.card}>
        Sign and Send Transaction
      </button>
      <button onClick={signAndSendTokenTransaction} className={styles.card}>
        Sign and Send Token Transaction
      </button>
      <button onClick={randomContractInteraction} className={styles.card}>
        Contract Interaction
      </button>
      <button onClick={showWalletConnectScanner} className={styles.card}>
        Show WalletConnect Scanner
      </button>
      <button onClick={registerPasskey} className={styles.card}>
        Register Passkey
      </button>
      <button onClick={logout} className={styles.card}>
        Log Out
      </button>

      <div className={styles.console} id="console">
        <p className={styles.code}></p>
      </div>
    </>
  );

  const unloggedInView = (
    <button onClick={login} className={styles.card}>
      Login
    </button>
  );

  return <div className={styles.grid}>{provider ? loggedInView : unloggedInView}</div>;
};

export default Main;
