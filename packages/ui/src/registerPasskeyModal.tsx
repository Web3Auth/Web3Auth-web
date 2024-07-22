import "../css/web3auth.css";

import { SafeEventEmitter } from "@toruslabs/openlogin-jrpc";
import { createRoot } from "react-dom/client";

import RegisterPasskey from "./components/RegisterPasskey";
import { ThemedContext } from "./context/ThemeContext";
import { LOGIN_MODAL_EVENTS, PASSKEY_MODAL_EVENTS, UIConfig } from "./interfaces";
import { getUserLanguage } from "./utils";

function createWrapper(parentZIndex = "20"): HTMLElement {
  const existingWrapper = document.getElementById("w3a-passkey-container");
  if (existingWrapper) existingWrapper.remove();

  const parent = document.createElement("section");
  parent.classList.add("w3a-parent-container");
  parent.setAttribute("id", "w3a-passkey-container");
  parent.style.zIndex = parentZIndex;
  parent.style.position = "relative";
  const wrapper = document.createElement("section");
  wrapper.setAttribute("id", "w3a-container");
  parent.appendChild(wrapper);
  document.body.appendChild(parent);
  return wrapper;
}

class RegisterPasskeyModal extends SafeEventEmitter {
  private uiConfig: UIConfig;

  private stateEmitter: SafeEventEmitter;

  constructor(uiConfig: UIConfig) {
    super();
    this.uiConfig = uiConfig;
    if (!uiConfig.mode) this.uiConfig.mode = "light";
    if (!uiConfig.defaultLanguage) this.uiConfig.defaultLanguage = getUserLanguage(uiConfig.defaultLanguage);
    this.stateEmitter = new SafeEventEmitter();
  }

  get isDark(): boolean {
    return this.uiConfig.mode === "dark" || (this.uiConfig.mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  openModal = (): void => {
    this.stateEmitter.emit(PASSKEY_MODAL_EVENTS.PASSKEY_MODAL_VISIBILITY, true);
  };

  closeModal = () => {
    this.stateEmitter.emit(PASSKEY_MODAL_EVENTS.PASSKEY_MODAL_VISIBILITY, false);
  };

  registerPasskey = () => {
    this.emit(LOGIN_MODAL_EVENTS.PASSKEY_REGISTER, {});
  };

  initModal = (): void => {
    const darkState = { isDark: this.isDark };
    const container = createWrapper();
    if (darkState.isDark) {
      container.classList.add("dark");
    } else {
      container.classList.remove("dark");
    }

    const root = createRoot(container);

    root.render(
      <ThemedContext.Provider value={darkState}>
        <RegisterPasskey stateListener={this.stateEmitter} closeModal={this.closeModal} registerPasskey={this.registerPasskey} />
      </ThemedContext.Provider>
    );
  };
}

export default RegisterPasskeyModal;
