import { Web3AuthProvider } from "@web3auth/modal-react-hooks";
import AppHeader from './components/AppHeader';
import { useAppContext } from './context';
import AppSettings from './components/AppSettings';
import App from "./App";
import AppDashboard from "./components/AppDashboard";

function Main() {

  const { web3authContextConfig } = useAppContext();

  return (
    <Web3AuthProvider config={web3authContextConfig}>
      <AppHeader />
      <main className="flex-1 p-1">
        <div className="relative">
          <AppSettings />
          <AppDashboard />
        </div>
      </main>       
    </Web3AuthProvider>
  )
}

export default Main
