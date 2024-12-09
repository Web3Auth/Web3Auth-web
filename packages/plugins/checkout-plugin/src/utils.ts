import { THEME_MODE_TYPE, THEME_MODES } from "@web3auth/auth";

export const htmlToElement = <T extends Element>(html: string): T => {
  const template = window.document.createElement("template");
  const trimmedHtml = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = trimmedHtml;
  return template.content.firstChild as T;
};

export const getTheme = (theme: THEME_MODE_TYPE): string => {
  if (theme === THEME_MODES.light) return "light";
  if (theme === THEME_MODES.dark) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
