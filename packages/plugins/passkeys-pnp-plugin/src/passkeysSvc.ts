import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import {
  AuthenticationResponseJSON,
  AuthenticatorAttachment,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { post } from "@toruslabs/http-helpers";
import { BUILD_ENV, type BUILD_ENV_TYPE, OPENLOGIN_NETWORK_TYPE } from "@toruslabs/openlogin-utils";
import log from "loglevel";

import { PasskeyServiceEndpoints } from "./interfaces";
import { getPasskeyEndpoints } from "./utils";

export interface ILoginData {
  authenticationResponse: AuthenticationResponseJSON;
  data: {
    challenge: string;
    transports: AuthenticatorTransportFuture[];
    publicKey: string;
    idToken: string;
    metadata: string;
    verifierId: string;
  };
}

export default class PasskeyService {
  trackingId: string = "";

  web3authClientId: string;

  web3authNetwork: OPENLOGIN_NETWORK_TYPE;

  buildEnv: string = BUILD_ENV.PRODUCTION;

  endpoints: PasskeyServiceEndpoints;

  rpID: string;

  rpName: string;

  constructor(params: { web3authClientId: string; web3authNetwork: OPENLOGIN_NETWORK_TYPE; buildEnv: BUILD_ENV_TYPE; rpID: string; rpName: string }) {
    this.web3authClientId = params.web3authClientId;
    this.endpoints = getPasskeyEndpoints(params.buildEnv);
    this.buildEnv = params.buildEnv;
    this.web3authNetwork = params.web3authNetwork;
    this.rpID = params.rpID;
    this.rpName = params.rpName;
  }

  async initiateRegistration(params: {
    oAuthVerifier: string;
    oAuthVerifierId: string;
    username: string;
    signatures: string[];
    passkeyToken?: string;
    authenticatorAttachment?: AuthenticatorAttachment;
  }): Promise<RegistrationResponseJSON> {
    const data = await this.getRegistrationOptions(params);
    const { options, trackingId } = data;
    this.trackingId = trackingId;
    const verificationResponse = await startRegistration(options);
    return verificationResponse;
  }

  async registerPasskey(params: { verificationResponse: RegistrationResponseJSON; signatures: string[]; passkeyToken?: string; data?: string }) {
    const result = await this.verifyRegistration(params.verificationResponse, params.signatures, params.passkeyToken, params.data);
    return { response: params.verificationResponse, data: result };
  }

  async loginUser(authenticatorId?: string): Promise<ILoginData | null> {
    const data = await this.getAuthenticationOptions(authenticatorId);
    const { options, trackingId } = data;
    this.trackingId = trackingId;
    const verificationResponse = await startAuthentication(options);
    const result = await this.verifyAuthentication(verificationResponse);
    if (result && result.verified && result.data) {
      log.info("authentication response", verificationResponse);
      return {
        authenticationResponse: verificationResponse,
        data: {
          challenge: result.data.challenge_timestamp,
          transports: result.data.transports,
          publicKey: result.data.credential_public_key,
          idToken: result.data.id_token,
          metadata: result.data.metadata,
          verifierId: result.data.verifier_id,
        },
      };
    }
    return null;
  }

  async getAllPasskeys({ passkeyToken = "", signatures = [] }: { passkeyToken: string; signatures: string[] }) {
    try {
      const response = await post<{ success: boolean; data: { passkeys: Record<string, string> } }>(
        this.endpoints.crud.list,
        {
          web3auth_client_id: this.web3authClientId,
          network: this.web3authNetwork,
          signatures,
        },
        {
          headers: {
            Authorization: `Bearer ${passkeyToken}`,
          },
        }
      );
      if (response.success) {
        return response.data.passkeys;
      }
      throw new Error("Error getting passkeys");
    } catch (error) {
      if (error instanceof Response) {
        const res = await error.json();
        throw new Error(`Error getting passkeys, reason: ${res.error || "unknown"}`);
      }
      log.error("error getting passkeys", error);
      throw error;
    }
  }

  private async getRegistrationOptions({
    authenticatorAttachment,
    oAuthVerifier,
    oAuthVerifierId,
    signatures,
    username,
    passkeyToken,
  }: {
    oAuthVerifier: string;
    oAuthVerifierId: string;
    signatures: string[];
    username: string;
    passkeyToken?: string;
    authenticatorAttachment?: AuthenticatorAttachment;
  }) {
    try {
      const response = await post<{ success: boolean; data: { options: PublicKeyCredentialCreationOptionsJSON; trackingId: string } }>(
        this.endpoints.register.options,
        {
          web3auth_client_id: this.web3authClientId,
          verifier_id: oAuthVerifierId,
          verifier: oAuthVerifier,
          authenticator_attachment: authenticatorAttachment,
          rp: {
            name: this.rpName,
            id: this.rpID,
          },
          username,
          network: this.web3authNetwork,
          signatures,
        },
        {
          headers: {
            Authorization: `Bearer ${passkeyToken || ""}`,
          },
        }
      );
      if (response.success) {
        return response.data;
      }
      throw new Error("Error getting registration options");
    } catch (error) {
      if (error instanceof Response) {
        const res = await error.json();
        throw new Error(`Error getting registration options, reason: ${res.error || "unknown"}`);
      }
      log.error("error getting registration options", error);
      throw error;
    }
  }

  private async verifyRegistration(verificationResponse: RegistrationResponseJSON, signatures: string[], token: string, metadata: string) {
    if (!this.trackingId) throw new Error("trackingId is required, please restart the process again.");
    try {
      const response = await post<{ verified: boolean; error?: string; data?: { challenge_timestamp: string; credential_public_key: string } }>(
        this.endpoints.register.verify,
        {
          web3auth_client_id: this.web3authClientId,
          tracking_id: this.trackingId,
          verification_data: verificationResponse,
          network: this.web3authNetwork,
          signatures,
          metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );
      if (response.verified) {
        return response.data;
      }
      throw new Error(`Error verifying registration, error: ${response.error}`);
    } catch (error) {
      if (error instanceof Response) {
        const res = await error.json();
        throw new Error(`Error verifying registration, reason: ${res.error || "unknown"}`);
      }
      log.error("error verifying registration", error);
      throw error;
    }
  }

  private async getAuthenticationOptions(authenticatorId?: string) {
    try {
      const response = await post<{ success: boolean; data: { options: PublicKeyCredentialCreationOptionsJSON; trackingId: string } }>(
        this.endpoints.authenticate.options,
        {
          web3auth_client_id: this.web3authClientId,
          rp_id: this.rpID,
          authenticator_id: authenticatorId,
          network: this.web3authNetwork,
        }
      );
      if (response.success) {
        return response.data;
      }
      throw new Error("Error getting authentication options");
    } catch (error) {
      if (error instanceof Response) {
        const res = await error.json();
        throw new Error(`Error getting authentication options, reason: ${res.error || "unknown"}`);
      }
      log.error("error getting authentication options", error);
      throw error;
    }
  }

  private async verifyAuthentication(verificationResponse: AuthenticationResponseJSON) {
    if (!verificationResponse) throw new Error("verificationResponse is required.");
    try {
      const response = await post<{
        verified: boolean;
        data?: {
          challenge_timestamp: string;
          transports: AuthenticatorTransportFuture[];
          credential_public_key: string;
          rpID: string;
          id_token: string;
          metadata: string;
          verifier_id: string;
        };
        error?: string;
      }>(this.endpoints.authenticate.verify, {
        web3auth_client_id: this.web3authClientId,
        tracking_id: this.trackingId,
        verification_data: verificationResponse,
        network: this.web3authNetwork,
      });
      if (response.verified) {
        return { data: response.data, verified: response.verified };
      }
      throw new Error(`Error verifying authentication, error: ${response.error}`);
    } catch (error: unknown) {
      if (error instanceof Response) {
        const res = await error.json();
        throw new Error(`Error verifying authentication, reason: ${res.error || "unknown"}`);
      }
      log.error("error verifying authentication", error);
      throw error;
    }
  }
}
