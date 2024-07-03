import { ErrorCodes, IWeb3AuthError, Web3AuthError } from "../errors";

export class WalletServicesPluginError extends Web3AuthError {
  protected static messages: ErrorCodes = {
    5210: "Wallet Services Plugin is not initialized",
    5211: "Web3Auth is connected to unsupported adapter. Wallet services connector plugin requires web3auth connected to openlogin adapter.",
    5212: "Provider is required..",
    5213: "Web3Auth instance is required while initialization.",
    5214: "Web3Auth is not connected.",
    5216: "Plugin is already initialized",
    5218: "Unsupported chain namespace.",
    5219: "Plugin network different than web3auth instance network.",
    5221: "Web3Auth is not initialized",
    5222: "Invalid session inside wallet services. Please report this issue.",
  };

  public constructor(code: number, message?: string, cause?: unknown) {
    // takes care of stack and proto
    super(code, message, cause);

    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "WalletServicesPluginError" });
  }

  public static fromCode(code: number, extraMessage = "", cause?: unknown): IWeb3AuthError {
    return new WalletServicesPluginError(code, `${WalletServicesPluginError.messages[code]}${extraMessage}`, cause);
  }

  public static notInitialized(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5210, extraMessage, cause);
  }

  public static unsupportedAdapter(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5211, extraMessage, cause);
  }

  public static providerRequired(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5212, extraMessage, cause);
  }

  public static web3authRequired(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5213, extraMessage, cause);
  }

  public static web3AuthNotConnected(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5214, extraMessage, cause);
  }

  public static alreadyInitialized(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5216, extraMessage, cause);
  }

  public static unsupportedChainNamespace(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5218, extraMessage, cause);
  }

  public static differentWeb3AuthNetwork(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5219, extraMessage, cause);
  }

  public static invalidParams(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5220, extraMessage, cause);
  }

  public static web3authNotInitialized(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5221, extraMessage, cause);
  }

  public static invalidSession(extraMessage = "", cause?: unknown): IWeb3AuthError {
    return WalletServicesPluginError.fromCode(5222, extraMessage, cause);
  }
}
