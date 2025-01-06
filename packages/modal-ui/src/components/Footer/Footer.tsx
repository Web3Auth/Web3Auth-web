import { t } from "../../localeImport";
const Footer = () => {
  return (
    <div class="w3a--flex w3a--items-center w3a--gap-2 w3a--justify-center w3a--pt-6 w3a--mt-auto">
      <div class="w3a--text-xs w3a--text-app-gray-300 dark:w3a--text-app-gray-500">{t("modal.footer.message-new")}</div>
      <img
        height="16"
        src="https://images.web3auth.io/web3auth-footer-logo-light.svg"
        alt="Web3Auth Logo Light"
        class="w3a--h-4 w3a--block dark:w3a--hidden"
      />
      <img
        height="16"
        src="https://images.web3auth.io/web3auth-footer-logo-dark.svg"
        alt="Web3Auth Logo Dark"
        class="w3a--h-4 w3a--hidden dark:w3a--block"
      />
    </div>
  );
};

export default Footer;
