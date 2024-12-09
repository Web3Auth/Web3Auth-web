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
    web3Auth,
    showWalletUi,
    addChain,
    switchChain,
    showWalletConnectScanner,
    enableMFA,
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
      {web3Auth?.connectedAdapterName === WALLET_ADAPTERS.AUTH && (
        <button onClick={signTransaction} className={styles.card}>
          Sign Transaction
        </button>
      )}

      <button onClick={showWalletUi} className={styles.card}>
        Show Wallet UI
      </button>

      <button onClick={showWalletConnectScanner} className={styles.card}>
        Show WalletConnect Scanner
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
