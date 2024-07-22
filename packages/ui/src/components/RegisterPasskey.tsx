import { SafeEventEmitter } from "@toruslabs/openlogin-jrpc";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PASSKEY_MODAL_EVENTS } from "../interfaces";
import i18n from "../localeImport";
import Button from "./Button";
import Icon from "./Icon";

interface ModalProps {
  stateListener: SafeEventEmitter;
  registerPasskey: () => void;
  closeModal: () => void;
}

export default function RegisterPasskey(props: ModalProps) {
  const [modalTransitionClasses, setModalTransitionClasses] = useState([""]);
  const [modalVisibilityDelayed, setModalVisibilityDelayed] = useState(false);
  const [modalVisibility, setModalVisibility] = useState(false);
  const { closeModal, stateListener, registerPasskey } = props;
  const [t] = useTranslation(undefined, { i18n });

  useEffect(() => {
    stateListener.on(PASSKEY_MODAL_EVENTS.PASSKEY_MODAL_VISIBILITY, (visible: boolean) => {
      setModalVisibility(visible);
    });
  }, [stateListener]);

  useEffect(() => {
    let timeOutId: number;
    if (modalVisibility) {
      setModalVisibilityDelayed(modalVisibility);

      timeOutId = window.setTimeout(() => {
        setModalTransitionClasses([modalVisibility ? "w3a-modal__inner--active" : ""]);
      }, 100);
    } else {
      setModalTransitionClasses([modalVisibility ? "w3a-modal__inner--active" : ""]);

      timeOutId = window.setTimeout(() => {
        setModalVisibilityDelayed(modalVisibility);
      }, 250);
    }
    return () => {
      clearTimeout(timeOutId);
    };
  }, [modalVisibility, setModalTransitionClasses]);

  const onCloseModal = () => {
    setModalVisibility(false);
    closeModal();
  };

  return (
    modalVisibilityDelayed && (
      <div id="w3a-modal" className="w3a-modal">
        <div className={["w3a-modal__inner", "w3a-modal__inner--passkey", ...modalTransitionClasses].join(" ")}>
          <button type="button" onClick={onCloseModal} className="w3a-header__button w3ajs-close-btn">
            <Icon iconName="close" />
          </button>
          <div className="text-center mt-2 py-6 px-8">
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
            <Button variant="primary" type="button" className="w-full" onClick={registerPasskey}>
              {t("modal.passkey.add")}
            </Button>
          </div>
        </div>
      </div>
    )
  );
}
