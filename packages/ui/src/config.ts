import { LOGIN_PROVIDER } from "@toruslabs/openlogin-mpc";

export const OPENLOGIN_PROVIDERS = Object.values(LOGIN_PROVIDER).filter((x) => x !== LOGIN_PROVIDER.WEBAUTHN && x !== LOGIN_PROVIDER.JWT);
