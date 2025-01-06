/** Merge classes with tailwind-merge with clsx full feature */
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { browser, mobileOs } from "../interfaces";

const cache = new Map<string, string>();

/** Merge classes with tailwind-merge with clsx full feature and memoization */
export function cn(...inputs: ClassValue[]) {
  // Create a cache key using JSON.stringify
  const cacheKey = JSON.stringify(inputs);

  // Check if the result is already cached
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // If not cached, compute the result
  const result = twMerge(clsx(inputs));

  // Store the result in the cache
  cache.set(cacheKey, result);

  return result;
}

export const getBrowserExtensionUrl = (browserType: browser, walletId: string) => {
  if (walletId?.startsWith("https://")) return walletId;
  switch (browserType) {
    case "chrome":
      return `https://chrome.google.com/webstore/detail/${walletId}`;
    case "firefox":
      return `https://addons.mozilla.org/firefox/addon/${walletId}`;
    case "edge":
      return `https://microsoftedge.microsoft.com/addons/detail/${walletId}`;
    default:
      return null;
  }
};

export const getMobileInstallLink = (os: mobileOs, appId: string) => {
  if (appId?.includes("https://")) {
    return appId;
  }
  switch (os) {
    case "android":
      return `https://play.google.com/store/apps/details?id=${appId}`;
    case "ios":
      return `https://apps.apple.com/app/safepal-wallet/${appId}`;
    default:
      return "";
  }
};

export const getOsName = (os: mobileOs) => {
  switch (os) {
    case "ios":
      return "iOS";
    case "android":
      return "Android";
    default:
      return "";
  }
};

export const getBrowserName = (browserType: browser) => {
  return browserType.charAt(0).toUpperCase() + browserType.slice(1);
};
