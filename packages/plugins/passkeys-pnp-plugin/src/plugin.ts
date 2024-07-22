import { NodeDetailManager } from "@toruslabs/fetch-node-details";
import { decryptData } from "@toruslabs/metadata-helpers";
import { SafeEventEmitter } from "@toruslabs/openlogin-jrpc";
import { BUILD_ENV, OpenloginUserInfo, WhiteLabelData } from "@toruslabs/openlogin-utils";
import Torus, { TorusPublicKey } from "@toruslabs/torus.js";
import {
  ADAPTER_EVENTS,
  ADAPTER_STATUS,
  type IPlugin,
  IProvider,
  IWeb3Auth,
  type IWeb3AuthCore,
  log,
  PLUGIN_EVENTS,
  PLUGIN_NAMESPACES,
  PLUGIN_STATUS,
  PLUGIN_STATUS_TYPE,
  PluginConnectParams,
  PluginNamespace,
  WALLET_ADAPTERS,
} from "@web3auth/base";
import { type OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { type RegisterPasskeyModal } from "@web3auth/ui";

import { PASSKEYS_VERIFIER_MAP } from "./constants";
import { EncryptedMetadata, ExternalAuthTokenPayload, IPasskeysPluginOptions, LoginParams, RegisterPasskeyParams } from "./interfaces";
import PasskeyService from "./passkeysSvc";
import { decodeToken, encryptData, getPasskeyVerifierId, getSiteName, getTopLevelDomain, getUserName, shouldSupportPasskey } from "./utils";
export class PasskeysPlugin extends SafeEventEmitter implements IPlugin {
  name = "PASSKEYS_PLUGIN";

  status: PLUGIN_STATUS_TYPE;

  SUPPORTED_ADAPTERS: string[] = [WALLET_ADAPTERS.OPENLOGIN];

  pluginNamespace: PluginNamespace = PLUGIN_NAMESPACES.MULTICHAIN;

  private options: IPasskeysPluginOptions;

  private web3auth: IWeb3Auth | null = null;

  private initialized: boolean = false;

  private passkeysSvc: PasskeyService | null = null;

  private authInstance: Torus | null = null;

  private nodeDetailManagerInstance: NodeDetailManager;

  private userInfo: Partial<OpenloginUserInfo>;

  private sessionSignatures: string[];

  private authToken: string;

  private verifier: string;

  constructor(options: IPasskeysPluginOptions = {}) {
    super();
    if (!options.buildEnv) options.buildEnv = BUILD_ENV.PRODUCTION;
    if (!options.rpID) {
      if (typeof window !== "undefined") {
        options.rpID = getTopLevelDomain(window.location.href);
      }
    }
    if (!options.rpName) {
      if (typeof window !== "undefined") {
        options.rpName = getSiteName(window) || "";
      }
    }

    this.options = options;
  }

  connect(_params: PluginConnectParams): Promise<void> {
    throw new Error("Method not implemented.");
  }

  disconnect(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public setPluginOptions(options: IPasskeysPluginOptions = {}) {
    this.options = { ...this.options, ...options };
  }

  async initWithWeb3Auth(web3auth: IWeb3AuthCore, _whiteLabel?: WhiteLabelData) {
    if (this.initialized) return;
    if (!web3auth) throw new Error("Web3Auth pnp instance is required");

    this.web3auth = web3auth as IWeb3Auth;
    const { clientId, web3AuthNetwork } = this.web3auth.coreOptions;
    if (!clientId || !web3AuthNetwork) throw new Error("Missing Web3auth options");

    this.passkeysSvc = new PasskeyService({
      web3authClientId: clientId,
      web3authNetwork: web3AuthNetwork,
      buildEnv: this.options.buildEnv,
      rpID: this.options.rpID,
      rpName: this.options.rpName,
    });

    this.nodeDetailManagerInstance = new NodeDetailManager({ network: web3AuthNetwork });

    this.authInstance = new Torus({
      clientId,
      enableOneKey: true,
      network: web3AuthNetwork,
    });

    this.verifier = PASSKEYS_VERIFIER_MAP[web3AuthNetwork];

    if (this.web3auth.status === ADAPTER_STATUS.CONNECTED && this.web3auth.connectedAdapterName === WALLET_ADAPTERS.OPENLOGIN) {
      this.userInfo = await this.web3auth.getUserInfo();
      const openloginAdapter = this.web3auth.walletAdapters[WALLET_ADAPTERS.OPENLOGIN] as OpenloginAdapter;
      this.sessionSignatures = openloginAdapter?.openloginInstance?.state?.signatures;
      this.authToken = openloginAdapter._passkeyToken;
    }

    this.subscribeToPnpEvents(this.web3auth);
    if (this.options.registerFlowModal) this.subscribeToRegisterModalEvents(this.options.registerFlowModal);
    this.initialized = true;
    this.status = PLUGIN_STATUS.READY;
    this.emit(PLUGIN_EVENTS.READY);
  }

  public async registerPasskey(params: RegisterPasskeyParams = {}): Promise<boolean | void> {
    if (!this.initialized) throw new Error("Sdk not initialized, please call init first.");
    if (!this.passkeysSvc) throw new Error("Passkey service not initialized");
    if (!this.web3auth.connected) throw new Error("Web3Auth not connected");

    this.checkIfPasskeysSupported();

    if (this.options.registerFlowModal) {
      this.options.registerFlowModal.openModal();
      return;
    }

    return this.initiatePasskeyRegistration(params);
  }

  public async loginWithPasskey({ authenticatorId }: { authenticatorId?: string } = {}): Promise<IProvider | null> {
    if (!this.initialized) throw new Error("Sdk not initialized, please call init first.");
    if (!this.passkeysSvc) throw new Error("Passkey service not initialized");

    this.checkIfPasskeysSupported();

    this.emit(PLUGIN_EVENTS.CONNECTING, { adapter: "passkey" });
    try {
      const loginResult = await this.passkeysSvc.loginUser(authenticatorId);
      const {
        response: { signature, clientDataJSON, authenticatorData },
        id,
      } = loginResult.authenticationResponse;
      const { publicKey, challenge, metadata, verifierId } = loginResult.data;

      const loginParams: LoginParams = {
        verifier: this.verifier,
        verifierId,
        idToken: signature,
        extraVerifierParams: {
          signature,
          clientDataJSON,
          authenticatorData,
          publicKey,
          challenge,
          rpOrigin: window.location.origin,
          rpId: this.options.rpID,
          credId: id,
        },
      };

      // get the passkey private key.
      const passkey = await this.getPasskeyPostboxKey(loginParams);

      // decrypt the data.
      const data = await decryptData<EncryptedMetadata>(passkey, metadata);
      if (!data) throw new Error("Unable to decrypt metadata.");

      const adapter = this.web3auth.walletAdapters[WALLET_ADAPTERS.OPENLOGIN];
      await (adapter as OpenloginAdapter)._rehydrateWithPasskey({
        sessionData: data.state,
        passkeyToken: loginResult.data.idToken,
        jwtTokenPayload: data.jwtTokenPayload,
      });
      return (this.web3auth as IWeb3Auth).provider;
    } catch (error: unknown) {
      log.error("error login with passkey", error);
      this.emit(PLUGIN_EVENTS.ERRORED, error);
      throw error;
    }
  }

  public async listAllPasskeys() {
    if (!this.initialized) throw new Error("Sdk not initialized, please call init first.");
    if (!this.passkeysSvc) throw new Error("Passkey service not initialized");

    return this.passkeysSvc.getAllPasskeys({ passkeyToken: this.authToken, signatures: this.sessionSignatures });
  }

  private async getEncryptedMetadata(passkeyPubKey: TorusPublicKey) {
    const adapter = this.web3auth.walletAdapters[WALLET_ADAPTERS.OPENLOGIN] as OpenloginAdapter;
    const idToken = adapter.openloginInstance?.state?.userInfo?.idToken || "";
    let jwtTokenPayload: Partial<ExternalAuthTokenPayload> = {};
    if (idToken) {
      jwtTokenPayload = decodeToken<ExternalAuthTokenPayload>(idToken).payload;
    }
    const metadata: EncryptedMetadata = {
      state: {
        ...adapter.openloginInstance.state,
        signatures: [],
        userInfo: {
          ...adapter.openloginInstance.state.userInfo,
          idToken: "",
        },
      },
      jwtTokenPayload: {
        wallets: jwtTokenPayload?.wallets || [],
      },
    };
    // encrypting the metadata.
    return encryptData({ x: passkeyPubKey.finalKeyData.X, y: passkeyPubKey.finalKeyData.Y }, metadata);
  }

  private async getPasskeyPublicKey(params: { verifier: string; verifierId: string }) {
    if (!this.initialized) throw new Error("Sdk not initialized, please call init first.");

    const { verifier, verifierId } = params;
    const verifierDetails = { verifier, verifierId };

    const { torusNodeEndpoints, torusNodePub } = await this.nodeDetailManagerInstance.getNodeDetails(verifierDetails);

    const publicAddress = await this.authInstance.getPublicAddress(torusNodeEndpoints, torusNodePub, { verifier, verifierId });
    return publicAddress;
  }

  private async initiatePasskeyRegistration({ authenticatorAttachment, username }: RegisterPasskeyParams) {
    if (!username) {
      username = getUserName(this.userInfo);
    }
    try {
      const { verifier, verifierId, aggregateVerifier } = this.userInfo;
      const result = await this.passkeysSvc.initiateRegistration({
        oAuthVerifier: aggregateVerifier || verifier,
        oAuthVerifierId: verifierId,
        authenticatorAttachment,
        signatures: this.sessionSignatures,
        username,
        passkeyToken: this.authToken,
      });

      if (!result) throw new Error("passkey registration failed.");

      const passkeyVerifierId = await getPasskeyVerifierId(result);

      // get the passkey public address.
      const passkeyPublicKey = await this.getPasskeyPublicKey({ verifier: this.verifier, verifierId: passkeyVerifierId });

      if (!passkeyPublicKey) throw new Error("Unable to get passkey public key, please try again.");

      const encryptedMetadata = await this.getEncryptedMetadata(passkeyPublicKey);

      const verificationResult = await this.passkeysSvc.registerPasskey({
        verificationResponse: result,
        signatures: this.sessionSignatures,
        passkeyToken: this.authToken,
        data: encryptedMetadata,
      });

      if (!verificationResult) throw new Error("passkey registration failed.");

      return true;
    } catch (error: unknown) {
      log.error("error registering user", error);
      throw error;
    }
  }

  private async getPasskeyPostboxKey(loginParams: LoginParams): Promise<string> {
    if (!this.initialized) throw new Error("Sdk not initialized, please call init first.");

    const { verifier, verifierId, idToken } = loginParams;
    const verifierDetails = { verifier, verifierId };

    const { torusNodeEndpoints, torusIndexes } = await this.nodeDetailManagerInstance.getNodeDetails(verifierDetails);

    const finalIdToken = idToken;
    const finalVerifierParams = { verifier_id: verifierId };

    const retrieveSharesResponse = await this.authInstance.retrieveShares(
      torusNodeEndpoints,
      torusIndexes,
      verifier,
      finalVerifierParams,
      finalIdToken,
      loginParams.extraVerifierParams || {}
    );

    if (!retrieveSharesResponse.finalKeyData.privKey) throw new Error("Unable to get passkey privkey.");
    return retrieveSharesResponse.finalKeyData.privKey.padStart(64, "0");
  }

  private subscribeToPnpEvents(web3auth: IWeb3Auth) {
    web3auth.on(ADAPTER_EVENTS.CONNECTED, async () => {
      if (web3auth.connectedAdapterName === WALLET_ADAPTERS.OPENLOGIN) {
        this.userInfo = await web3auth.getUserInfo();
        const openloginAdapter = this.web3auth.walletAdapters[WALLET_ADAPTERS.OPENLOGIN] as OpenloginAdapter;
        this.sessionSignatures = openloginAdapter?.openloginInstance?.state?.signatures;
        this.authToken = openloginAdapter._passkeyToken;
      }
    });
  }

  private subscribeToRegisterModalEvents(registerModal: RegisterPasskeyModal) {
    registerModal.on("PASSKEY_REGISTER", async (params: RegisterPasskeyParams) => {
      try {
        await this.initiatePasskeyRegistration(params);
        registerModal.closeModal();
      } catch (error: unknown) {
        log.error("error registering passkey", error);
      }
    });
  }

  private checkIfPasskeysSupported() {
    const result = shouldSupportPasskey();
    if (!result.isOsSupported) throw new Error("Passkeys not supported on this OS.");
    if (!result.isBrowserSupported) throw new Error("Passkeys not supported on this browser.");
    return true;
  }
}
