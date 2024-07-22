import { base64URLStringToBuffer } from "@simplewebauthn/browser";
import { type RegistrationResponseJSON } from "@simplewebauthn/types";
import { encrypt } from "@toruslabs/eccrypto";
import { encParamsBufToHex, keccak256 } from "@toruslabs/metadata-helpers";
import { base64url, BUILD_ENV_TYPE, OpenloginUserInfo, safeatob } from "@toruslabs/openlogin-utils";
import bowser from "bowser";
import { decode } from "cbor-x/decode";
import { ec as EC } from "elliptic";

import { PASSKEY_SVC_URL } from "./constants";

export const ecCurve = new EC("secp256k1");

export const getPasskeyEndpoints = (buildEnv: BUILD_ENV_TYPE) => {
  const baseUrl = PASSKEY_SVC_URL[buildEnv];
  return {
    register: {
      options: `${baseUrl}/api/v3/auth/passkey/fast/register/options`,
      verify: `${baseUrl}/api/v3/auth/passkey/fast/register/verify`,
    },
    authenticate: {
      options: `${baseUrl}/api/v3/auth/passkey/fast/authenticate/options`,
      verify: `${baseUrl}/api/v3/auth/passkey/fast/authenticate/verify`,
    },
    crud: {
      list: `${baseUrl}/api/v3/passkey/fast/list`,
    },
  };
};

export const getSiteName = (window: Window): string => {
  const { document } = window;

  const siteName = document.querySelector<HTMLMetaElement>('head > meta[property="og:site_name"]');
  if (siteName) {
    return siteName.content;
  }

  const metaTitle = document.querySelector<HTMLMetaElement>('head > meta[name="title"]');
  if (metaTitle) {
    return metaTitle.content;
  }

  if (document.title && document.title.length > 0) {
    return document.title;
  }

  return window.location.hostname;
};

export const getTopLevelDomain = (href: string): string => {
  const url = new URL(href);

  const domain = url.hostname;
  const elems = domain.split(".");
  const iMax = elems.length - 1;

  const elem1 = elems[iMax - 1];
  const elem2 = elems[iMax];

  const isSecondLevelDomain = iMax >= 3 && (elem1 + elem2).length <= 5;
  if (!elem1) return elem2;
  return `${(isSecondLevelDomain ? `${elems[iMax - 2]}.` : "") + elem1}.${elem2}`;
};

export async function encryptData<T>(publicKey: { x: string; y: string }, d: T) {
  const serializedDec = JSON.stringify(d);
  const serializedBuf = Buffer.from(serializedDec, "utf-8");
  const encParams = await encrypt(Buffer.from(ecCurve.keyFromPublic(publicKey).getPublic("array")), serializedBuf);
  const encParamsHex = encParamsBufToHex(encParams);
  const sData = JSON.stringify(encParamsHex);
  return sData;
}

interface AuthParamsData {
  rpIdHash: Buffer;
  flagsBuf: Buffer;
  flags: {
    up: boolean;
    uv: boolean;
    at: boolean;
    ed: boolean;
    flagsInt: number;
  };
  counter: number;
  counterBuf: Buffer;
  aaguid: Buffer;
  credID: Buffer;
  COSEPublicKey: Buffer;
}

export const getPasskeyVerifierId = async (verificationResponse: RegistrationResponseJSON) => {
  const parseAuthData = (paramBuffer: Buffer): AuthParamsData => {
    let buffer = paramBuffer;
    const rpIdHash = buffer.slice(0, 32);
    buffer = buffer.slice(32);
    const flagsBuf = buffer.slice(0, 1);
    buffer = buffer.slice(1);
    const flagsInt = flagsBuf[0];
    const flags = {
      up: !!(flagsInt & 0x01),
      uv: !!(flagsInt & 0x04),
      at: !!(flagsInt & 0x40),
      ed: !!(flagsInt & 0x80),
      flagsInt,
    };

    const counterBuf = buffer.slice(0, 4);
    buffer = buffer.slice(4);
    const counter = counterBuf.readUInt32BE(0);

    if (!flags.at) throw new Error("Unable to parse auth data");

    const aaguid = buffer.slice(0, 16);
    buffer = buffer.slice(16);
    const credIDLenBuf = buffer.slice(0, 2);
    buffer = buffer.slice(2);
    const credIDLen = credIDLenBuf.readUInt16BE(0);
    const credID = buffer.slice(0, credIDLen);
    buffer = buffer.slice(credIDLen);
    const COSEPublicKey = buffer;

    return {
      rpIdHash,
      flagsBuf,
      flags,
      counter,
      counterBuf,
      aaguid,
      credID,
      COSEPublicKey,
    };
  };

  const b64url = (arrayBuffer: ArrayBuffer): string => {
    if (typeof arrayBuffer === "string") {
      throw new Error("only accepts buffer-like input");
    } else {
      return base64url.fromBase64(Buffer.from(arrayBuffer).toString("base64"));
    }
  };

  const { response } = verificationResponse;
  const attestationStruct = decode(Buffer.from(base64URLStringToBuffer(response.attestationObject)));
  const authDataStruct = parseAuthData(attestationStruct.authData);
  const base64UrlString = b64url(authDataStruct.COSEPublicKey);
  const verifierId = b64url(keccak256(Buffer.from(base64UrlString, "base64")));
  return verifierId;
};

export const getUserName = (userInfo: Partial<OpenloginUserInfo>) => {
  const { email, name, typeOfLogin, verifierId } = userInfo;
  if (typeOfLogin && typeOfLogin !== "jwt") return `${typeOfLogin}|${email || name || verifierId}`;
  return email || name || verifierId;
};

export function decodeToken<T>(token: string): { header: { alg: string; typ: string; kid?: string }; payload: T } {
  const [header, payload] = token.split(".");
  return {
    header: JSON.parse(safeatob(header)),
    payload: JSON.parse(safeatob(payload)) as T,
  };
}

const PASSKEYS_ALLOWED_MAP = [bowser.OS_MAP.iOS, bowser.OS_MAP.MacOS, bowser.OS_MAP.Android, bowser.OS_MAP.Windows];

const getWindowsVersion = (osVersion: string) => {
  const windowsVersionRegex = /NT (\d+\.\d+)/;
  const match = osVersion.match(windowsVersionRegex);
  if (match) return parseInt(match[1], 10);
  return 0;
};

const checkIfOSIsSupported = (osName: string, osVersion: string) => {
  if (!PASSKEYS_ALLOWED_MAP.includes(osName)) return false;
  if (osName === bowser.OS_MAP.MacOS) return true;
  switch (osName) {
    case bowser.OS_MAP.iOS: {
      const version = parseInt(osVersion.split(".")[0], 10);
      return version >= 16;
    }
    case bowser.OS_MAP.Android: {
      const version = parseInt(osVersion.split(".")[0], 10);
      return version >= 9;
    }
    case bowser.OS_MAP.Windows: {
      const version = getWindowsVersion(osVersion);
      return version >= 10;
    }
    default:
      return false;
  }
};

export function shouldSupportPasskey(): { isBrowserSupported: boolean; isOsSupported: boolean; supportedBrowser?: Record<string, string> } {
  const browser = bowser.getParser(navigator.userAgent);
  const osDetails = browser.parseOS();
  if (!osDetails) return { isBrowserSupported: false, isOsSupported: false };
  const osName = osDetails.name || "";
  const result = checkIfOSIsSupported(osName, osDetails.version || "");
  if (!result) return { isBrowserSupported: false, isOsSupported: false };
  const browserData: Record<string, Record<string, string>> = {
    iOS: {
      safari: ">=16",
      chrome: ">=108",
    },
    macOS: {
      safari: ">=16",
      chrome: ">=108",
      firefox: ">=122",
    },
    Android: {
      chrome: ">=108",
    },
    Windows: {
      edge: ">=108",
      chrome: ">=108",
    },
  };
  const isBrowserSupported = browser.satisfies({ ...browserData }) || false;
  return { isBrowserSupported, isOsSupported: true, supportedBrowser: browserData[osName] };
}
