import React, { useEffect, useState } from "react";
import { useWeb3Auth } from "@web3auth/modal-react-hooks";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context";
import {
  CHAIN_NAMESPACES,
  ChainNamespaceType,
  WEB3AUTH_NETWORK_TYPE,
} from "@web3auth/base";

import { Card, ColorPicker, Tabs, Tag, TextInput, Toggle } from "./CommonUI";
import { Select, Button } from "@toruslabs/react-components";
import { LANGUAGE_TYPE, LOGIN_PROVIDER_TYPE } from "@web3auth/auth";

const AppSettings: React.FC = () => {
  const {
    setNetWork,
    chainNamespace,
    setChainNamespace,
    setChain,
    setAdapters,
    whiteLabel,
    setWhiteLabel,
    loginProviders,
    loginMethods,
    setLoginProviders,
    setLoginMethods,
    walletPlugin,
    setWalletPlugin,
    showWalletDiscovery,
    setShowWalletDiscovery,
    networkOptions,
    chainNamespaceOptions,
    chainOptions,
    adapterOptions,
    loginProviderOptions,
    languageOptions,

    useAccountAbstractionProvider,
    setUseAccountAbstractionProvider,
    useAAWithExternalWallet,
    setUseAAWithExternalWallet,
    bundlerUrl,
    paymasterUrl,
    setBundlerUrl,
    setPaymasterUrl,
    smartAccountTypeOptions,
    setSmartAccountType,
  } = useAppContext();
  const { t } = useTranslation();
  const { status, isConnected, isInitialized, connect } = useWeb3Auth();

  const [activeTab, setActiveTab] = useState("General");

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };

  const onChangeLoginMethods = (loginProvider: LOGIN_PROVIDER_TYPE, params: {
    name?: string,
    description?: string,
    logoHover?: string,
    logoLight?: string,
    logoDark?: string,
    mainOption?: boolean,
    showOnModal?: boolean,
    showOnDesktop?: boolean,
    showOnMobile?: boolean,
  }) => {
    const method = loginMethods?.[loginProvider];
    setLoginMethods({ ...loginMethods, [loginProvider]: { ...method, ...params } });
  };

  const onChangeAppName = (value: string) => {
    setWhiteLabel({ config: { ...whiteLabel?.config, appName: value } });
  }

  const onChangeAppUrl = (value: string) => {
    setWhiteLabel({ config: { ...whiteLabel?.config, appUrl: value } });
  }

  const onChangeLogoLight = (value: string) => {
    setWhiteLabel({ config: { ...whiteLabel?.config, logoLight: value } });
  }

  const onChangeLogoDark = (value: string) => {
    setWhiteLabel({ config: { ...whiteLabel?.config, logoDark: value } });
  }

  const onChangePrimary = (value: string) => {
    setWhiteLabel({ config: { ...whiteLabel?.config, theme: { ...whiteLabel?.config?.theme, primary: value } } });
  }

  const onChangePrimaryColor = (value: string) => {
    setWhiteLabel({ config: { ...whiteLabel?.config, theme: { ...whiteLabel?.config?.theme, onPrimary: value } } });
  }

  const onChangeWalletLogoLight = (value: string) => {
    setWalletPlugin({ enable: walletPlugin?.enable, logoLight: value, logoDark: walletPlugin?.logoDark });
  }

  const onChangeWalletLogoDark = (value: string) => {
    setWalletPlugin({ enable: walletPlugin?.enable, logoLight: walletPlugin?.logoLight, logoDark: value });
  }

  const onChangLanguage = (value: string) => {
    setWhiteLabel({ enable: whiteLabel?.enable, config: { ...whiteLabel?.config, defaultLanguage: value as LANGUAGE_TYPE } });
  }

  const onToggleShowWalletDiscovery = () => {
    setShowWalletDiscovery(!showWalletDiscovery);
  }

  const onToggleEnableWhiteLabel = () => {
    setWhiteLabel({ enable: !whiteLabel?.enable });
  }

  const onToggleUseLogoLoader = () => {
    setWhiteLabel({ config: { ...whiteLabel?.config, useLogoLoader: !whiteLabel?.config?.useLogoLoader } });
  }
  
  const onToggleEnableWalletPlugin = () => {
    setWalletPlugin({ enable: !walletPlugin?.enable });
  }


  return !isConnected && (
    <div className="grid grid-cols-8 gap-0">
      <div className="col-span-0 sm:col-span-1 lg:col-span-2"></div>
      <Card className="h-auto px-8 py-8 col-span-8 sm:col-span-6 lg:col-span-4">
        <div className="text-3xl font-bold leading-tight text-center">{t("app.greeting")}</div>
        <div className="leading-tight font-extrabold text-center mb-12">
          <Tag text={status} /> 
          &nbsp;
          <Tag text={isInitialized ? "INITIALIZED" : "NOT_INITIALIZE_YET"} />
        </div>
        <Tabs tabs={["General", "WhiteLabel", "Login Provider", "Wallet Plugin", chainNamespace === CHAIN_NAMESPACES.EIP155 ? "Account Abstraction Provider" : ""]} activeTab={activeTab} onTabClick={handleTabClick} />
        {activeTab === "General" && (
          <Card className="grid grid-cols-1 gap-2 py-4 px-4 shadow-none">
            <Select
              block
              inputSize="md"
              label={t('app.network')}
              onChange={(value) => setNetWork(value as WEB3AUTH_NETWORK_TYPE)}
              options={networkOptions}
              pill
              placeholder="Select an network"
              showArrow
            />
            <Select
              block
              inputSize="md"
              label={t('app.chainNamespace')}
              options={chainNamespaceOptions}
              pill
              placeholder="Select an chain namespace"
              showArrow
              onChange={(value) => 
                setChainNamespace(value as ChainNamespaceType)}
            />
            <Select 
              block
              inputSize="md"
              label={t('app.chain')} 
              options={chainOptions} 
              pill
              placeholder="Select an chain"
              showArrow
              onChange={(value) => setChain(value as string)} 
            />
            <Select 
              block
              inputSize="md"
              label={t('app.adapters')} 
              options={adapterOptions} 
              pill
              placeholder="Select an adapters"
              showArrow
              onChange={(value) => setAdapters(value as string[])} 
              multiple={true} 
            />
            <Toggle label={t("app.showWalletDiscovery")} isOn={Boolean(showWalletDiscovery)} onToggle={() => onToggleShowWalletDiscovery()} />
          </Card>
        )}
        {activeTab === "WhiteLabel" && (
          <Card className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-4 px-4 shadow-none">
            <Toggle label={t("app.whiteLabel.title")} isOn={Boolean(whiteLabel?.enable)} onToggle={() => onToggleEnableWhiteLabel()} />
            <Toggle
              label={t("app.whiteLabel.useLogoLoader")}
              isOn={Boolean(whiteLabel?.config?.useLogoLoader)}
              onToggle={() => onToggleUseLogoLoader()}
              disabled={!whiteLabel?.enable}
            />
            <TextInput
              label={t("app.whiteLabel.appName")}
              value={whiteLabel?.config?.appName || ""}
              onChange={(value) => onChangeAppName(value)}
              disabled={!whiteLabel?.enable}
            />
            <Select
              block
              filterPlaceholder="Filter languages..."
              inputSize="md"
              label={t("app.whiteLabel.defaultLanguage")}
              options={languageOptions}
              onChange={(value) => onChangLanguage(value[0])}
              disabled={!whiteLabel?.enable}
            />
            <TextInput className="col-span-2" label={t("app.whiteLabel.appUrl")} value={whiteLabel?.config?.appUrl || ""} onChange={(value) => onChangeAppUrl(value)} disabled={!whiteLabel?.enable} />
            <TextInput label={t("app.whiteLabel.logoLight")} value={whiteLabel?.config?.logoLight || ""} onChange={(value) => onChangeLogoLight(value)} disabled={!whiteLabel?.enable} />
            <TextInput label={t("app.whiteLabel.logoDark")} value={whiteLabel?.config?.logoDark || ""} onChange={(value) => onChangeLogoDark(value)} disabled={!whiteLabel?.enable}/>
            <ColorPicker label={t("app.whiteLabel.primary")} color={whiteLabel?.config?.theme?.primary || ""} onChange={(value) => onChangePrimary(value)} disabled={!whiteLabel?.enable} />
            <ColorPicker label={t("app.whiteLabel.primaryColor")} color={whiteLabel?.config?.theme?.onPrimary || ""} onChange={(value) => onChangePrimaryColor(value)} disabled={!whiteLabel?.enable} />
          </Card>
        )}
        {activeTab === "Login Provider" && (
          <Card className="grid grid-cols-1 gap-2 py-4 px-4 shadow-none">
            <Select
              block
              filterPlaceholder="Filter login providers..."
              inputSize="md"
              label={t('app.loginProviderTitle')}
              options={loginProviderOptions}
              onChange={(value) => setLoginProviders(value as LOGIN_PROVIDER_TYPE[])}
              multiple={true}
            />
            {(loginProviders || []).map((p, index) => {
              const method = loginMethods?.[p] || {};
              const { name, description, logoHover, logoLight, logoDark, mainOption, showOnModal, showOnDesktop, showOnMobile } = method;
              return (
                <Card key={index} className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-none border">
                  <div className="font-bold leading-tight text-left sm:col-span-2">{p}</div>
                  <Toggle label={t("app.loginProvider.mainOption")} isOn={mainOption} onToggle={() => onChangeLoginMethods(p, { mainOption: !method?.mainOption })} />
                  <TextInput label={t("app.loginProvider.name")} value={name} onChange={(value) => onChangeLoginMethods(p, { name: value })} />
                  <TextInput
                    label={t("app.loginProvider.description")}
                    value={description}
                    onChange={(value) => onChangeLoginMethods(p, { description: value })}
                  />
                  <TextInput
                    label={t("app.loginProvider.logoHover")}
                    value={logoHover}
                    onChange={(value) => onChangeLoginMethods(p, { logoHover: value })}
                  />
                  <TextInput
                    label={t("app.loginProvider.logoLight")}
                    value={logoLight}
                    onChange={(value) => onChangeLoginMethods(p, { logoLight: value })}
                  />
                  <TextInput
                    label={t("app.loginProvider.logoDark")}
                    value={logoDark}
                    onChange={(value) => onChangeLoginMethods(p, { logoDark: value })}
                  />

                  <Toggle label={t("app.loginProvider.showOnModal")} isOn={showOnModal} onToggle={() => onChangeLoginMethods(p, { showOnModal: !method?.showOnModal })} />
                  <Toggle
                    label={t("app.loginProvider.showOnDesktop")}
                    isOn={showOnDesktop}
                    onToggle={() => onChangeLoginMethods(p, { showOnDesktop: !method?.showOnDesktop })}
                  />
                  <Toggle
                    label={t("app.loginProvider.showOnMobile")}
                    isOn={showOnMobile}
                    onToggle={() => onChangeLoginMethods(p, { showOnMobile: !method?.showOnMobile })}
                  />
                </Card>
              );
            })}
          </Card>
        )}
        {activeTab === "Wallet Plugin" && (
          <Card className="grid grid-cols-1 gap-2 py-4 px-4 shadow-none">
            <Toggle label={t("app.walletPlugin.enable")} isOn={Boolean(walletPlugin?.enable)} onToggle={() => onToggleEnableWalletPlugin()} />
            <TextInput
              label={t("app.walletPlugin.logoLight")}
              value={walletPlugin?.logoLight || ""}
              onChange={(value) => onChangeWalletLogoLight(value)}
              disabled={!walletPlugin?.enable}
            />
            <TextInput
              label={t("app.walletPlugin.logoDark")}
              value={walletPlugin?.logoDark || ""}
              onChange={(value) => onChangeWalletLogoDark(value)}
              disabled={!walletPlugin?.enable}
            />
          </Card>
        )}
        {activeTab === "Account Abstraction Provider" && chainNamespace === CHAIN_NAMESPACES.EIP155 && (
          <Card className="grid grid-cols-1 gap-2 py-4 px-4 shadow-none">
            <Toggle label={t("app.useAccountAbstractionProvider")} isOn={Boolean(useAccountAbstractionProvider)} onToggle={() => setUseAccountAbstractionProvider(!useAccountAbstractionProvider)} />
            <Toggle disabled={!useAccountAbstractionProvider} label={t("app.useAAWithExternalWallet")} isOn={Boolean(useAAWithExternalWallet)} onToggle={() => setUseAAWithExternalWallet(!useAAWithExternalWallet)} />
            <Select
              block
              filterPlaceholder="Filter smart account types..."
              inputSize="md"
              label={t("app.smartAccountType")}
              options={smartAccountTypeOptions}
              onChange={(value) => setSmartAccountType(value as string)}
              disabled={!useAccountAbstractionProvider} 
            />
            <TextInput label={t("app.bundlerUrl")} value={bundlerUrl} onChange={(value) => setBundlerUrl(value)} disabled={!useAccountAbstractionProvider} />
            <TextInput label={t("app.paymasterUrl")} value={paymasterUrl} onChange={(value) => setPaymasterUrl(value)} disabled={!useAccountAbstractionProvider} />
          </Card>
        )}
        <div className="flex justify-center">
          <Button onClick={connect} pill size="sm">
            Connect
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AppSettings;
