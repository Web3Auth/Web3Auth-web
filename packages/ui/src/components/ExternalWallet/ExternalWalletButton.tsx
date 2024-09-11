import { BaseAdapterConfig } from "@web3auth/base";
import { useTranslation } from "react-i18next";

import { ExternalButton } from "../../interfaces";
import i18n from "../../localeImport";
import Button from "../Button";
import Image from "../Image";

interface ExternalWalletButtonProps {
  button: ExternalButton;
  adapterConfig?: BaseAdapterConfig;
  handleWalletClick: (button: ExternalButton) => void;
}

export default function ExternalWalletButton(props: ExternalWalletButtonProps) {
  const { adapterConfig, button, handleWalletClick } = props;
  const [t] = useTranslation(undefined, { i18n });

  return (
    <Button
      variant="tertiary"
      type="button"
      onClick={() => handleWalletClick(button)}
      className="w-full rounded-xl size-xl flex !justify-between items-center !bg-app-gray-100 hover:!bg-app-gray-200 !px-2"
      title={adapterConfig?.label || button.name}
    >
      <div className="flex items-center">
        <Image imageId={`login-${button.name}`} hoverImageId={`login-${button.name}`} fallbackImageId="wallet" height="30" width="30" isButton />
        <p className="ml-2 text-left">{adapterConfig?.label || button.displayName}</p>
      </div>
      {button.hasInjectedWallet && (
        <span className="inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium bg-app-primary-100 text-app-primary-800">
          {t("modal.external.installed")}
        </span>
      )}
    </Button>
  );
}