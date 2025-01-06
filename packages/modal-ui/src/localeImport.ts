import { createEffect, createSignal } from "solid-js";

// Update type definitions
type TranslationType = Record<string, Record<string, string>>;
const languageMap: Record<string, () => Promise<{ default: TranslationType }>> = {
  en: () => import("./i18n/english.json"),
  fr: () => import("./i18n/french.json"),
  de: () => import("./i18n/german.json"),
  es: () => import("./i18n/spanish.json"),
  pt: () => import("./i18n/portuguese.json"),
  tr: () => import("./i18n/turkish.json"),
  zh: () => import("./i18n/mandarin.json"),
  ko: () => import("./i18n/korean.json"),
  nl: () => import("./i18n/dutch.json"),
  ja: () => import("./i18n/japanese.json"),
};

// Function to get the locale from localStorage or default to 'en'
const storedLocale = localStorage.getItem("w3a--app-locale") || "en";

// Signals to manage locale and translations
const [locale, setLocale] = createSignal<string>(storedLocale);
const [translations, setTranslations] = createSignal<TranslationType>({});

// Function to load JSON dynamically and set translations
async function loadTranslations(newLocale: string) {
  const loader = languageMap[newLocale];
  if (!loader) {
    // eslint-disable-next-line no-console
    console.error(`Locale '${newLocale}' is not supported.`);
    return;
  }

  const { default: data } = await loader();
  setTranslations(data as TranslationType);
}

// Function to change locale and persist it to localStorage
async function changeLocale(newLocale: string) {
  await loadTranslations(newLocale);
  setLocale(newLocale);
  localStorage.setItem("w3a--app-locale", newLocale); // Persist the new locale
}

// Recursive t function to handle nested keys and placeholders
function t(key: string, placeholders: Record<string, string> = {}): string {
  const keys = key.split(".");
  let translation: unknown = translations();

  // Traverse the nested keys
  for (const k of keys) {
    if (translation && typeof translation === "object") {
      translation = (translation as Record<string, unknown>)[k];
    } else if (!translation && translations()[keys[0]][key.split(".").slice(1).join(".")]) {
      translation = translations()[keys[0]][key.split(".").slice(1).join(".")];
    } else {
      return key;
    }
  }

  // Handle placeholders if it's a string
  if (typeof translation === "string") {
    return Object.entries(placeholders).reduce((str, [placeholder, value]) => str.replace(new RegExp(`{{${placeholder}}}`, "g"), value), translation);
  }

  return key;
}

// Replace direct call with createEffect
createEffect(() => {
  loadTranslations(locale());
});

export { changeLocale, locale, t };
