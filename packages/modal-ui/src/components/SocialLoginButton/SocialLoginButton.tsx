import { LOGIN_PROVIDER } from "@web3auth/auth";

import Image from "../Image/Image";
export interface SocialLoginButtonProps {
  text?: string;
  showIcon?: boolean;
  showText?: boolean;
  method?: string;
  isDark?: boolean;
  isPrimaryBtn?: boolean;
  onClick?: (e: Event) => void;
}

function getProviderIcon(method: string, isDark: boolean, isPrimaryBtn: boolean) {
  const imageId =
    method === LOGIN_PROVIDER.TWITTER ? `login-twitter-x${isDark ? "-light" : "-dark"}` : `login-${method}${isDark ? "-light" : "-dark"}`;
  const hoverId =
    method === LOGIN_PROVIDER.APPLE || method === LOGIN_PROVIDER.GITHUB || method === LOGIN_PROVIDER.TWITTER ? imageId : `login-${method}-active`;
  if (isPrimaryBtn) {
    return <Image width="20" imageId={hoverId} hoverImageId={hoverId} isButton />;
  }
  return <Image width="20" imageId={imageId} hoverImageId={hoverId} />;
}

const SocialLoginButton = (props: SocialLoginButtonProps) => {
  return (
    <button
      type="button"
      onClick={(e) => props.onClick?.(e)}
      class="w3a--appearance-none w3a--w-full w3a--border w3a--border-app-gray-400 w3a--rounded-full w3a--px-5 w3a--py-2.5 w3a--flex w3a--items-center w3a--justify-center w3a--gap-x-2 hover:w3a--shadow-md hover:w3a--translate-y-[0.5px]"
    >
      {props.showIcon && getProviderIcon(props.method, props.isDark, props.isPrimaryBtn)}
      {props.showText && <p class="w3a--text-sm w3a--font-normal w3a--text-app-gray-900 dark:w3a--text-app-white">{props.text}</p>}
    </button>
  );
};

export default SocialLoginButton;
