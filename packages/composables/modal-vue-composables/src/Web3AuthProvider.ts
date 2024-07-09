import {
  ADAPTER_EVENTS,
  type ADAPTER_STATUS_TYPE,
  type CustomChainConfig,
  type IPlugin,
  type IProvider,
  WalletInitializationError,
  WalletLoginError,
} from "@web3auth/base";
import { type ModalConfig, Web3Auth } from "@web3auth/modal";
import type { LoginParams, OpenloginUserInfo } from "@web3auth/openlogin-adapter";
import { defineComponent, h, InjectionKey, PropType, provide, ref, shallowRef, triggerRef, watch } from "vue";

import { IWeb3AuthContext, Web3AuthContextConfig } from "./interfaces";

export const Web3AuthContextKey = Symbol("Web3AuthContextKey") as InjectionKey<IWeb3AuthContext>;

export default defineComponent({
  name: "Web3AuthProvider",
  props: {
    config: { type: Object as PropType<Web3AuthContextConfig>, required: true },
  },
  setup(props) {
    const web3Auth = shallowRef<Web3Auth | null>(null);
    const isConnected = ref(false);
    const provider = ref<IProvider | null>(null);
    const userInfo = ref<Partial<OpenloginUserInfo> | null>(null);
    const isMFAEnabled = ref(false);
    const isInitialized = ref(false);
    const status = ref<ADAPTER_STATUS_TYPE | null>(null);

    const addPlugin = (plugin: IPlugin) => {
      if (!web3Auth.value) throw WalletInitializationError.notReady();
      return web3Auth.value.addPlugin(plugin);
    };

    const getPlugin = (name: string) => {
      if (!web3Auth.value) throw WalletInitializationError.notReady();
      return web3Auth.value.getPlugin(name);
    };

    const initModal = async (modalParams: { modalConfig?: Record<string, ModalConfig> } = {}) => {
      if (!web3Auth.value) throw WalletInitializationError.notReady();
      await web3Auth.value.initModal(modalParams);
      triggerRef(web3Auth);
    };

    const enableMFA = async (loginParams?: Partial<LoginParams>) => {
      if (!web3Auth.value) throw WalletInitializationError.notReady();
      if (!isConnected.value) throw WalletLoginError.notConnectedError();
      await web3Auth.value.enableMFA(loginParams);
      triggerRef(web3Auth);
      const localUserInfo = await web3Auth.value.getUserInfo();
      userInfo.value = localUserInfo;
      isMFAEnabled.value = localUserInfo.isMfaEnabled || false;
    };

    const logout = async (logoutParams: { cleanup: boolean } = { cleanup: false }) => {
      if (!web3Auth.value) throw WalletInitializationError.notReady();
      if (!isConnected.value) throw WalletLoginError.notConnectedError();
      await web3Auth.value.logout(logoutParams);
      triggerRef(web3Auth);
    };

    const connect = async () => {
      if (!web3Auth.value) throw WalletInitializationError.notReady();
      const localProvider = await web3Auth.value.connect();
      triggerRef(web3Auth);
      return localProvider;
    };

    const addAndSwitchChain = async (chainConfig: CustomChainConfig) => {
      if (!web3Auth.value) throw WalletInitializationError.notReady();
      await web3Auth.value.addChain(chainConfig);
      await web3Auth.value.switchChain({ chainId: chainConfig.chainId });
    };

    const authenticateUser = async () => {
      if (!web3Auth.value) throw WalletInitializationError.notReady();
      return web3Auth.value.authenticateUser();
    };

    const addChain = async (chainConfig: CustomChainConfig) => {
      if (!web3Auth.value) throw WalletInitializationError.notReady();
      return web3Auth.value.addChain(chainConfig);
    };

    const switchChain = (chainParams: { chainId: string }) => {
      if (!web3Auth.value) throw WalletInitializationError.notReady();
      return web3Auth.value.switchChain(chainParams);
    };

    watch(
      [web3Auth, () => props.config],
      () => {
        if (web3Auth.value) return;

        const resetHookState = () => {
          provider.value = null;
          userInfo.value = null;
          isMFAEnabled.value = false;
          isConnected.value = false;
          status.value = null;
        };

        resetHookState();
        const { web3AuthOptions, adapters = [], plugins = [] } = props.config;
        const web3AuthInstance = new Web3Auth(web3AuthOptions);
        if (adapters.length) adapters.map((adapter) => web3AuthInstance.configureAdapter(adapter));
        if (plugins.length) {
          plugins.forEach((plugin) => {
            web3AuthInstance.addPlugin(plugin);
          });
        }

        web3Auth.value = web3AuthInstance;
      },
      { immediate: true }
    );

    watch([web3Auth, isConnected], () => {
      if (web3Auth.value) {
        const addState = async (web3AuthInstance: Web3Auth) => {
          provider.value = web3AuthInstance.provider;
          const userState = await web3AuthInstance.getUserInfo();
          userInfo.value = userState;
          isMFAEnabled.value = userState?.isMfaEnabled || false;
        };

        const resetState = () => {
          provider.value = null;
          userInfo.value = null;
          isMFAEnabled.value = false;
        };

        if (isConnected.value) addState(web3Auth.value as Web3Auth);
        else resetState();
      }
    });

    watch(
      web3Auth,
      (newWeb3Auth, prevWeb3Auth) => {
        const notReadyListener = () => (status.value = web3Auth.value!.status);
        const readyListener = () => {
          status.value = web3Auth.value!.status;
          isInitialized.value = true;
        };
        const connectedListener = () => {
          status.value = web3Auth.value!.status;
          isInitialized.value = true;
          isConnected.value = true;
        };
        const disconnectedListener = () => {
          status.value = web3Auth.value!.status;
          isConnected.value = false;
        };
        const connectingListener = () => {
          status.value = web3Auth.value!.status;
        };
        const errorListener = () => {
          status.value = ADAPTER_EVENTS.ERRORED;
        };

        // unregister previous listeners
        if (prevWeb3Auth && newWeb3Auth !== prevWeb3Auth) {
          prevWeb3Auth.off(ADAPTER_EVENTS.NOT_READY, notReadyListener);
          prevWeb3Auth.off(ADAPTER_EVENTS.READY, readyListener);
          prevWeb3Auth.off(ADAPTER_EVENTS.CONNECTED, connectedListener);
          prevWeb3Auth.off(ADAPTER_EVENTS.DISCONNECTED, disconnectedListener);
          prevWeb3Auth.off(ADAPTER_EVENTS.CONNECTING, connectingListener);
          prevWeb3Auth.off(ADAPTER_EVENTS.ERRORED, errorListener);
        }

        if (newWeb3Auth && newWeb3Auth !== prevWeb3Auth) {
          status.value = newWeb3Auth.status;
          // web3Auth is initialized here.
          newWeb3Auth.on(ADAPTER_EVENTS.NOT_READY, notReadyListener);
          newWeb3Auth.on(ADAPTER_EVENTS.READY, readyListener);
          newWeb3Auth.on(ADAPTER_EVENTS.CONNECTED, connectedListener);
          newWeb3Auth.on(ADAPTER_EVENTS.DISCONNECTED, disconnectedListener);
          newWeb3Auth.on(ADAPTER_EVENTS.CONNECTING, connectingListener);
          newWeb3Auth.on(ADAPTER_EVENTS.ERRORED, errorListener);
        }
      },
      { immediate: true }
    );

    provide(Web3AuthContextKey, {
      web3Auth,
      isConnected,
      isInitialized,
      provider,
      userInfo,
      isMFAEnabled,
      status,
      getPlugin,
      initModal,
      connect,
      enableMFA,
      logout,
      addAndSwitchChain,
      addChain,
      addPlugin,
      authenticateUser,
      switchChain,
    });
  },
  render() {
    return h(this.$slots.default ?? "");
  },
});
