import { ADAPTER_STATUS } from "@web3auth/base";
import { createEffect, createMemo, Show } from "solid-js";

import { MODAL_STATUS, ModalStatusType } from "../../interfaces";
import { t } from "../../localeImport";
import { Image } from "../Image";

export interface LoaderProps {
  message?: string;
  appLogo?: string;
  adapter: string;
  adapterName: string;
  modalStatus: ModalStatusType;
  onClose: () => void;
}

const Loader = (props: LoaderProps) => {
  const providerIcon = createMemo(() =>
    props.adapter === "twitter" ? <Image imageId="login-x-dark" /> : <Image imageId={`login-${props.adapter}`} height="40" width="40" />
  );

  createEffect(() => {
    if (props.modalStatus === MODAL_STATUS.CONNECTED) {
      setTimeout(() => {
        props.onClose();
      }, 3000);
    }
  });

  return (
    <div class="w3a--h-full w3a--flex w3a--flex-col w3a--flex-1 w3a--items-center w3a--justify-center w3a--gap-y-4">
      <Show when={props.modalStatus === ADAPTER_STATUS.CONNECTING}>
        <div class="w3a--h-full w3a--flex w3a--flex-col w3a--flex-1 w3a--items-center w3a--justify-center w3a--gap-y-4">
          <div class="w3a--flex w3a--items-center w3a--justify-center w3a--gap-x-6">
            <figure class="w3a--loader-logo-size w3a--overflow-hidden w3a--flex w3a--items-center w3a--justify-center">
              <img src={props.appLogo} alt="" class="w3a--h-full w3a--w-full w3a--object-contain" />
            </figure>

            <div class="w3a--flex w3a--items-center w3a--justify-center w3a--gap-x-2">
              <div class="w3a--animate-circle" />
              <div class="w3a--animate-circle" />
              <div class="w3a--animate-circle" />
              <div class="w3a--animate-circle" />
            </div>

            {providerIcon()}
          </div>
          <div class="w3a--flex w3a--flex-col w3a--gap-y-1">
            <div class="w3a--text-sm w3a--text-app-gray-500 dark:w3a--text-app-gray-400 w3a--text-center">
              {t("modal.adapter-loader.message1", { adapter: props.adapterName })}
            </div>
            <div class="w3a--text-sm w3a--text-app-gray-500 dark:w3a--text-app-gray-400 w3a--text-center">
              {t("modal.adapter-loader.message2", { adapter: props.adapterName })}
            </div>
          </div>
        </div>
      </Show>

      <Show when={props.modalStatus === ADAPTER_STATUS.CONNECTED}>
        <div class="w3a--flex w3a--flex-col w3a--items-center w3a--gap-y-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" class="w3a--connected-logo">
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M6.267 3.455a3.07 3.07 0 0 0 1.745-.723 3.066 3.066 0 0 1 3.976 0 3.07 3.07 0 0 0 1.745.723 3.066 3.066 0 0 1 2.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 0 1 0 3.976 3.07 3.07 0 0 0-.723 1.745 3.066 3.066 0 0 1-2.812 2.812 3.07 3.07 0 0 0-1.745.723 3.066 3.066 0 0 1-3.976 0 3.07 3.07 0 0 0-1.745-.723 3.066 3.066 0 0 1-2.812-2.812 3.07 3.07 0 0 0-.723-1.745 3.066 3.066 0 0 1 0-3.976 3.07 3.07 0 0 0 .723-1.745 3.066 3.066 0 0 1 2.812-2.812m7.44 5.252a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="w3a--text-sm w3a--text-app-gray-500 dark:w3a--text-app-gray-400 w3a--text-center">{props.message}</p>
        </div>
      </Show>

      <Show when={props.modalStatus === ADAPTER_STATUS.ERRORED}>
        <div class="w3a--flex w3a--flex-col w3a--items-center w3a--gap-y-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" class="w3a--error-logo">
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M18 10a8 8 0 1 1-16.001 0A8 8 0 0 1 18 10m-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1"
              clip-rule="evenodd"
            />
          </svg>
          <p class="w3a--text-sm w3a--text-app-gray-500 dark:w3a--text-app-gray-400 w3a--text-center">{props.message}</p>
        </div>
      </Show>
    </div>
  );
};

export default Loader;
