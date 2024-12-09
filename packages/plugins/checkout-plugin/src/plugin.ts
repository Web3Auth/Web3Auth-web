import { randomId } from "@toruslabs/base-controllers";
import { SafeEventEmitter, THEME_MODES } from "@web3auth/auth";

import { CHECKOUT_BUILD_ENV, CHECKOUT_BUILD_ENV_TYPE, CHECKOUT_URLS } from "./enums";
import { getTheme, htmlToElement } from "./utils";

export type CheckoutPluginParams = {
  modalZIndex?: number;
  buildEnv?: CHECKOUT_BUILD_ENV_TYPE;
  receiveWalletAddress: string;
  apiKey: string;
  userId?: string;
  userEmail?: string;
  fiat?: string;
  fiatAmount?: string;
  cryptoAmount?: string;
  strictMode?: boolean;
  chainId?: string;
  primaryColorHex?: string;
  isDark?: boolean;
  cryptoList?: string[];
  fiatList?: string[];
};

export class CheckoutPlugin extends SafeEventEmitter {
  isInitialized: boolean;

  private readonly embedNonce = randomId();

  private receiveWalletAddress: string;

  private apiKey: string;

  private userId: string;

  private modalZIndex?: number;

  private buildEnv?: CHECKOUT_BUILD_ENV_TYPE;

  private userEmail?: string;

  private crypto?: string;

  private fiat?: string;

  private fiatAmount?: string;

  private cryptoAmount?: string;

  private strictMode?: boolean;

  private chainId?: string;

  private primaryColorHex?: string;

  private isDark?: boolean;

  private cryptoList?: string[];

  private fiatList?: string[];

  constructor(params: CheckoutPluginParams) {
    super();
    this.isInitialized = false;
    this.modalZIndex = params.modalZIndex ?? 99999;
    this.buildEnv = params.buildEnv ?? CHECKOUT_BUILD_ENV.PRODUCTION;
    this.receiveWalletAddress = params.receiveWalletAddress;
    this.apiKey = params.apiKey;
    this.userId = params.userId ?? params.receiveWalletAddress;
    this.userEmail = params.userEmail;
    this.crypto = "";
    this.fiat = params.fiat ?? "";
    this.fiatAmount = params.fiatAmount ?? "";
    this.cryptoAmount = params.cryptoAmount ?? "";
    this.strictMode = params.strictMode ?? false;
    this.chainId = params.chainId ?? "";
    this.primaryColorHex = params.primaryColorHex ?? "";
    this.isDark = params.isDark ?? false;
    this.cryptoList = params.cryptoList ?? [];
    this.fiatList = params.fiatList ?? [];
  }

  async init(): Promise<void> {
    if (this.isInitialized) throw new Error("Already initialized");
    if (this.getIframe()) throw new Error("Already initialized Checkout iframe");

    const checkoutUrl = new URL(CHECKOUT_URLS[this.buildEnv]);
    checkoutUrl.searchParams.append("apiKey", this.apiKey);
    checkoutUrl.searchParams.append("receiveWalletAddress", this.receiveWalletAddress);
    checkoutUrl.searchParams.append("userId", this.userId || this.receiveWalletAddress);
    checkoutUrl.searchParams.append("isIframe", "true");

    const colorScheme = getTheme(this.isDark ? THEME_MODES.dark : THEME_MODES.light);

    if (this.userEmail) checkoutUrl.searchParams.append("userEmail", this.userEmail);
    if (this.crypto) checkoutUrl.searchParams.append("crypto", this.crypto);
    if (this.fiat) checkoutUrl.searchParams.append("fiat", this.fiat);
    if (this.fiatAmount) checkoutUrl.searchParams.append("fiatAmount", this.fiatAmount);
    if (this.cryptoAmount) checkoutUrl.searchParams.append("cryptoAmount", this.cryptoAmount);
    if (this.strictMode && this.strictMode !== undefined) checkoutUrl.searchParams.append("strictMode", "true");
    if (this.chainId) checkoutUrl.searchParams.append("chainId", this.chainId);
    if (this.primaryColorHex) checkoutUrl.searchParams.append("primaryColorHex", this.checkColorHex(this.primaryColorHex));
    if (this.isDark || colorScheme === THEME_MODES.dark) checkoutUrl.searchParams.append("isDark", "true");
    if (this.cryptoList && this.cryptoList.length > 0) checkoutUrl.searchParams.append("cryptoList", this.cryptoList.join(","));
    if (this.fiatList && this.fiatList.length > 0) checkoutUrl.searchParams.append("fiatList", this.fiatList.join(","));

    // create iframe
    const checkoutIframe = htmlToElement<HTMLIFrameElement>(
      `<div 
        id="checkoutModal-${this.embedNonce}"
        style="position: fixed; top: 50%; left: 50%; transform: translateX(-50%) translateY(-50%);
        border: none; border-radius: 32px; z-index: ${this.modalZIndex.toString()}; height: 659px; width: 430px;
        justify-content: center; background-color: ${colorScheme === THEME_MODES.dark ? "#000" : "#fff"};"
      >
          <button
            id="closeButton-iframe"
            style="position: absolute; right: 20px; top: 16px; background: none; border: none; display: none; 
            color: ${colorScheme === THEME_MODES.dark ? "#fff" : "#000"}; font-size: 20px; cursor: pointer; z-index: 1000;"
            onclick="document.getElementById('checkoutModal-${this.embedNonce}').remove()"
          >
            ✕
          </button>
        <iframe
        id="checkoutIframe-${this.embedNonce}"
        class="checkoutIframe-${this.embedNonce}"
        sandbox="allow-popups allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"
        src="${checkoutUrl.href}"
        height="659px"
        width="430px"
        style="position: fixed; top: 50%; left: 50%; transform: translateX(-50%) translateY(-50%);
        border: none; border-radius: 32px;
        color-scheme: ${colorScheme} background-color: ${colorScheme === THEME_MODES.dark ? "#000" : "#fff"};"
        allow="autoplay; camera; clipboard-read; clipboard-write; accelerometer; geolocation; microphone; payment; publickey-credentials-get; gyroscope;"
        onLoad="document.getElementById('closeButton-iframe').style.display = 'block'"
      >
      </iframe>
      </div>`
    );

    return new Promise<void>((resolve, reject) => {
      try {
        window.document.body.appendChild(checkoutIframe);
        this.isInitialized = true;
        resolve();
      } catch (error) {
        this.cleanup();
        reject(error);
      }
    });
  }

  public hide(): void {
    if (!this.isInitialized) throw new Error("Call init() first");
    const checkoutIframe = this.getIframe();
    if (!checkoutIframe) throw new Error("Iframe is not initialized");
    // hide iframe
    checkoutIframe.style.display = "none";
  }

  public cleanup(): void {
    const checkoutIframe = this.getIframe();
    if (checkoutIframe) checkoutIframe.remove();
  }

  private checkColorHex = (color: string) => {
    if (color.startsWith("#")) {
      return color.slice(1);
    }
    return color;
  };

  private getIframe(): HTMLIFrameElement | null {
    function isElement(element: unknown) {
      return element instanceof Element || element instanceof Document;
    }
    const checkoutIframe = window.document.getElementById(`checkoutIframe-${this.embedNonce}`);
    if (!isElement(checkoutIframe)) return null;
    return checkoutIframe as HTMLIFrameElement;
  }
}
