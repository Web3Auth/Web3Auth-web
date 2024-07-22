import { LOGIN_PROVIDER } from "@toruslabs/openlogin-utils";
import classNames from "classnames";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { capitalizeFirstLetter } from "../config";
import { ThemedContext } from "../context/ThemeContext";
import { SocialLoginsConfig } from "../interfaces";
import i18n from "../localeImport";
import Button from "./Button";
import Image from "./Image";

// const hasLightIcons = ["apple", "github"];

interface SocialLoginProps {
  socialLoginsConfig: SocialLoginsConfig;
  handleSocialLoginClick: (params: { adapter: string; loginParams: { loginProvider: string; login_hint?: string; name: string } }) => void;
}

function getProviderIcon(method: string, isDark: boolean, isPrimaryBtn: boolean) {
  const imageId =
    method === LOGIN_PROVIDER.TWITTER ? `login-twitter-x${isDark ? "-light" : "-dark"}` : `login-${method}${isDark ? "-light" : "-dark"}`;
  const hoverId =
    method === LOGIN_PROVIDER.APPLE || method === LOGIN_PROVIDER.GITHUB || method === LOGIN_PROVIDER.TWITTER ? imageId : `login-${method}-active`;

  if (isPrimaryBtn) {
    return <Image width="20" imageId={hoverId} hoverImageId={hoverId} isButton />;
  }

  return <Image width="20" imageId={imageId} hoverImageId={hoverId} isButton />;
}

export default function SocialLogins(props: SocialLoginProps) {
  const [canShowMore, setCanShowMore] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    socialLoginsConfig = {
      loginMethods: {},
      loginMethodsOrder: [],
      adapter: "",
      uiConfig: {},
    },
    handleSocialLoginClick,
  } = props;
  const { isDark } = useContext(ThemedContext);

  const [t] = useTranslation(undefined, { i18n });

  // Too small a function to use `useCallback`
  const expandClickHandler = () => {
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    const maxOptions = Object.keys(socialLoginsConfig.loginMethods).filter((loginMethodKey) => {
      return socialLoginsConfig.loginMethods[loginMethodKey].showOnModal;
    });
    setCanShowMore(maxOptions.length > 4);
  }, [socialLoginsConfig.loginMethods]);

  const adapterListClass = classNames("w3a-adapter-list", "w3ajs-socials-adapters", !isExpanded ? " w3a-adapter-list--shrink" : "");
  const adapterButtonClass = classNames("w3a-button-expand", "w3ajs-button-expand", isExpanded ? "w3a-button--rotate" : "");
  const adapterExpandText = isExpanded ? t("modal.social.view-less-socials") : t("modal.social.view-more-socials");
  const loginMethodsCount = Object.keys(socialLoginsConfig.loginMethods).length + 1;

  const restrictedLoginMethods: string[] = [
    LOGIN_PROVIDER.WEBAUTHN,
    LOGIN_PROVIDER.JWT,
    LOGIN_PROVIDER.SMS_PASSWORDLESS,
    LOGIN_PROVIDER.EMAIL_PASSWORDLESS,
  ];

  return (
    <div className="w3ajs-social-logins w3a-group">
      {/* <div className="w3a-group__title">{t("modal.social.continue")}</div> */}
      <ul className={adapterListClass}>
        {Object.keys(socialLoginsConfig.loginMethods).map((method) => {
          const name = capitalizeFirstLetter(socialLoginsConfig.loginMethods[method].name || method);
          const orderIndex = socialLoginsConfig.loginMethodsOrder.indexOf(method) + 1;
          const order = orderIndex || Object.keys(socialLoginsConfig.loginMethods).length + 1;

          // TODO: get from somewhere
          const lastLogin = "facebook";
          const providerIcon = getProviderIcon(method, isDark, false);

          if (socialLoginsConfig.loginMethods[method].showOnModal === false || restrictedLoginMethods.includes(method)) {
            return null;
          }

          const loginMethodSpan = classNames("w3a-adapter-item", socialLoginsConfig?.uiConfig?.loginGridCol === 2 ? "col-span-3" : "col-span-2");

          if (method === lastLogin) {
            return (
              <li className="col-span-6 w3a-adapter-item" key={method} style={{ order }}>
                <Button
                  variant="secondary"
                  onClick={() =>
                    handleSocialLoginClick({
                      adapter: socialLoginsConfig.adapter,
                      loginParams: { loginProvider: method, name, login_hint: "" },
                    })
                  }
                  className="w-full"
                  title={name}
                >
                  {providerIcon}
                  <p className="ml-2">{t("modal.social.continueCustom", { adapter: name })}</p>
                </Button>
              </li>
            );
          }
          return (
            <li className={loginMethodSpan} key={method} style={{ order: order + loginMethodsCount }}>
              <Button
                variant="secondary"
                onClick={() =>
                  handleSocialLoginClick({
                    adapter: socialLoginsConfig.adapter,
                    loginParams: { loginProvider: method, name, login_hint: "" },
                  })
                }
                className="w-full"
                title={name}
              >
                {providerIcon}
              </Button>
            </li>
          );
        })}
      </ul>
      {canShowMore && (
        <div className="text-right">
          <button type="button" className={adapterButtonClass} onClick={expandClickHandler}>
            <span className="w3ajs-button-expand-text">{adapterExpandText}</span>
          </button>
        </div>
      )}
    </div>
  );
}
