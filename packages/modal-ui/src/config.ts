import { LOGIN_PROVIDER, LOGIN_PROVIDER_TYPE } from "@web3auth/auth";

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const restrictedLoginMethods: Set<LOGIN_PROVIDER_TYPE> = new Set([
  LOGIN_PROVIDER.AUTHENTICATOR,
  LOGIN_PROVIDER.PASSKEYS,
  LOGIN_PROVIDER.JWT,
  LOGIN_PROVIDER.WEBAUTHN,
]);
export const AUTH_PROVIDERS = Object.values(LOGIN_PROVIDER).filter((x) => !restrictedLoginMethods.has(x));

export const AUTH_PROVIDERS_NAMES = AUTH_PROVIDERS.reduce(
  (acc, x) => {
    if (x === "email_passwordless") acc[x] = "Email";
    else if (x === "sms_passwordless") acc[x] = "Mobile";
    else acc[x] = capitalizeFirstLetter(x);
    return acc;
  },
  {} as Record<LOGIN_PROVIDER_TYPE, string>
);
