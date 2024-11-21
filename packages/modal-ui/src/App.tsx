import { onMount, type Component } from "solid-js";
import { LoginModal } from "./loginModal";
// import { Auth } from "@web3auth/auth";

const App: Component = () => {
  onMount(async () => {
    const adapterListener: any = null;
    const loginModal = new LoginModal({
      chainNamespace: "eip155",
      walletRegistry: { default: {}, others: {} },
      adapterListener: adapterListener,
    });
    await loginModal.initModal();
  });
  return (
    <div class="w3a--w-screen w3a--h-screen w3a--flex w3a--items-center w3a--justify-center w3a--flex-col w3a--gap-4">
      <h1 class="w3a--text-3xl w3a--font-bold w3a--text-slate-700">Try out your new modal</h1>
    </div>
  );
};

export default App;
