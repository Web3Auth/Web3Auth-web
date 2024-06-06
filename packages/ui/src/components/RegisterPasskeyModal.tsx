import { useTranslation } from "react-i18next";

import i18n from "../localeImport";
import Button from "./Button";

export default function RegisterPasskeyModal() {
  const [t] = useTranslation(undefined, { i18n });

  return (
    <div id="w3a-modal" className="w3a-modal">
      <div className="w3ajs-external-wallet w3a-group">
        <div className="w3a-external-container w3ajs-external-container">
          <div className="text-center mt-2">
            <img className="mx-auto mb-b" src="https://images.web3auth.io/passkey-register.svg" alt="Register Passkey" />
            <div className="font-bold mb-2 text-app-gray-900 dark:text-app-white">{t("modal.passkey.register-title")}</div>
            <div className="text-sm mb-8 text-app-gray-400 dark:text-app-gray-500">
              <div>{t("modal.passkey.register-desc")}</div>
              <button
                type="button"
                className="text-app-primary-600 hover:text-app-primary-800 dark:text-app-primary-500 dark:hover:text-app-primary-400 focus-visible:outline-1 dark:focus-visible:outline-1 focus-visible:outline dark:focus-visible:outline focus-visible:outline-app-gray-50 dark:focus-visible:outline-app-gray-400"
              >
                {t("modal.passkey.learn-more")}
              </button>
            </div>
            <Button variant="primary" type="button" className="w-full">
              {t("modal.passkey.add")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
