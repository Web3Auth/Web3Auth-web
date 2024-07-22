import { LOGIN_PROVIDER } from "@toruslabs/openlogin-utils";
import { ChangeEvent, FormEvent, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ThemedContext } from "../context/ThemeContext";
import i18n from "../localeImport";
import { getUserCountry, validatePhoneNumber } from "../utils";
import Button from "./Button";
import Icon from "./Icon";

interface SocialLoginPasswordlessProps {
  isPrimaryBtn: boolean;
  isEmailVisible: boolean;
  isSmsVisible: boolean;
  adapter: string;
  handleSocialLoginClick: (params: { adapter: string; loginParams: { loginProvider: string; login_hint?: string; name: string } }) => void;
}
export default function SocialLoginPasswordless(props: SocialLoginPasswordlessProps) {
  const { handleSocialLoginClick, adapter, isPrimaryBtn, isEmailVisible, isSmsVisible } = props;
  const { isDark } = useContext(ThemedContext);

  const [fieldValue, setFieldValue] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("");
  const [isValidInput, setIsValidInput] = useState<boolean | null>(null);

  const [t] = useTranslation(undefined, { i18n });

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = fieldValue;
    const isEmailValid = value.match(/^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i);
    if (isEmailValid) {
      return handleSocialLoginClick({ adapter, loginParams: { loginProvider: LOGIN_PROVIDER.EMAIL_PASSWORDLESS, login_hint: value, name: "Email" } });
    }
    const number = value.startsWith("+") ? value : `${countryCode}${value}`;
    const result = await validatePhoneNumber(number);
    if (result) {
      return handleSocialLoginClick({
        adapter,
        loginParams: { loginProvider: LOGIN_PROVIDER.SMS_PASSWORDLESS, login_hint: typeof result === "string" ? result : number, name: "Mobile" },
      });
    }

    setIsValidInput(false);
    return undefined;
  };

  useEffect(() => {
    const getLocation = async () => {
      const result = await getUserCountry();
      if (result && result.dialCode) {
        setCountryCode(result.dialCode);
      }
    };
    if (isSmsVisible) getLocation();
  }, [isSmsVisible]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFieldValue(e.target.value);
    if (isValidInput === false) setIsValidInput(null);
  };

  const title = useMemo(() => {
    if (isEmailVisible && isSmsVisible) return "modal.social.passwordless-title";
    if (isEmailVisible) return "modal.social.email";
    return "modal.social.phone";
  }, [isEmailVisible, isSmsVisible]);

  const placeholder = useMemo(() => {
    if (isEmailVisible && isSmsVisible) return "name@example.com/+(00)123456";
    if (isEmailVisible) return "name@example.com";
    return "+(00)123456";
  }, [isEmailVisible, isSmsVisible]);

  return (
    <div className="w3ajs-passwordless w3a-group w3a-group--passwordless">
      <div className="w3a-group__title">
        {t(title)}
        {isSmsVisible && (
          <div className="relative flex flex-col items-center cursor-pointer group">
            <Icon iconName={`information-circle${isDark ? "-light" : ""}`} />
            <div className="absolute z-20 flex-col items-center hidden mb-5 top-4 group-hover:flex">
              <div className="w-3 h-3 ml-[3px] -mb-2 rotate-45 bg-app-gray-50 dark:bg-app-gray-600" />
              <div className="relative p-4 w-[300px] text-xs leading-none text-app-white rounded-md bg-app-gray-50 dark:bg-app-gray-600 shadow-lg">
                <div className="mb-1 text-xs font-medium text-app-gray-900 dark:text-app-white">{t("modal.popup.phone-header")}</div>
                <div className="text-xs text-app-gray-400">{t("modal.popup.phone-body")}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <form className="w3ajs-passwordless-form" onSubmit={(e) => handleFormSubmit(e)}>
        <div className="w3a-text-field !py-1 !pl-6 !pr-1 flex gap-2 mb-4 w-full justify-between">
          <div className="flex flex-1 items-center">
            <input
              type="text"
              className="border-none bg-transparent focus:outline-none w-full"
              name="passwordless-input"
              required
              placeholder={placeholder}
              onFocus={(e) => {
                e.target.placeholder = "";
              }}
              onBlur={(e) => {
                e.target.placeholder = placeholder;
              }}
              onChange={(e) => handleInputChange(e)}
            />
          </div>
          <Button className="!px-6" variant={isPrimaryBtn ? "primary" : "tertiary"} size="sm" disabled={fieldValue === ""} type="submit">
            {t("modal.social.passwordless-login")}
          </Button>
        </div>

        {isValidInput === false && <div className="w3a-sms-field--error">{t("modal.errors-invalid-number-email")}</div>}
      </form>
    </div>
  );
}
