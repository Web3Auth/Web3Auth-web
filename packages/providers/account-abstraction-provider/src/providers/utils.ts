import { addHexPrefix, isHexString } from "@ethereumjs/util";
import { sleep } from "@toruslabs/base-controllers";
import { JRPCRequest, providerErrors } from "@web3auth/auth";
import { IProvider, log } from "@web3auth/base";
import { IProviderHandlers, MessageParams, SignTypedDataMessageV4, TransactionParams, TypedMessageParams } from "@web3auth/ethereum-provider";
import { Chain, createWalletClient, Hex, http } from "viem";
import { BundlerClient, SendUserOperationParameters, SmartAccount } from "viem/account-abstraction";

type PollOptions<data> = {
  // Whether or not to emit when the polling starts.
  emitOnBegin?: boolean | undefined;
  // The initial wait time (in ms) before polling.
  initialWaitTime?: ((data: data | void) => Promise<number>) | undefined;
  // The interval (in ms).
  interval: number;
};

/**
 * Polls a function at a specified interval.
 * same poll function as viem/utils/poll
 */
export function poll<data>(
  fn: ({ unpoll }: { unpoll: () => void }) => Promise<data | void>,
  { emitOnBegin, initialWaitTime, interval }: PollOptions<data>
) {
  let active = true;

  const unwatch = () => (active = false);

  const watch = async () => {
    let data: data | void;
    if (emitOnBegin) data = await fn({ unpoll: unwatch });

    const initialWait = (await initialWaitTime?.(data)) ?? interval;
    await sleep(initialWait);

    const _poll = async () => {
      if (!active) return;
      await fn({ unpoll: unwatch });
      await sleep(interval);
      _poll();
    };

    _poll();
  };
  watch();

  return unwatch;
}

export function getProviderHandlers({
  bundlerClient,
  smartAccount,
  chain,
  eoaProvider,
}: {
  smartAccount: SmartAccount;
  bundlerClient: BundlerClient;
  chain: Chain;
  eoaProvider: IProvider;
}): IProviderHandlers {
  const walletClient = createWalletClient({
    account: smartAccount,
    chain,
    transport: http(),
  });

  return {
    getAccounts: async (_: JRPCRequest<unknown>) => {
      const [smartAccounts, eoaAccounts] = await Promise.all([
        smartAccount.getAddress(),
        eoaProvider.request<never, string[]>({ method: "eth_accounts" }),
      ]);
      log.info("smartAccounts", smartAccounts);
      log.info("eoaAccounts", eoaAccounts);
      return [smartAccounts, ...eoaAccounts];
    },
    getPrivateKey: async (_: JRPCRequest<unknown>) => {
      throw providerErrors.custom({
        message: "Smart accounts do not have private key",
        code: 4903,
      });
    },
    getPublicKey: async (_: JRPCRequest<unknown>) => {
      throw providerErrors.custom({
        message: "Smart accounts do not have a public key. Use address instead.",
        code: 4903,
      });
    },
    processTransaction: async (txParams: TransactionParams & { gas?: string }): Promise<string> => {
      if (txParams.input && !txParams.data) txParams.data = addHexPrefix(txParams.input);
      const { to, value, data } = txParams;
      const userOperationParams: SendUserOperationParameters = {
        account: smartAccount,
        calls: [
          {
            to,
            // Explicit conversation required to avoid value being passed as hex
            value: BigInt(value),
            data,
          },
        ],
        // should not use maxFeePerGas/maxPriorityFeePerGas from transaction params since that's fee for transaction not user operation and let bundler handle it instead
      };
      // @ts-expect-error viem types are too deep
      const userOpHash = await bundlerClient.sendUserOperation(userOperationParams);

      const timeout = 120_000;
      return new Promise((resolve, reject) => {
        const done = (fn: () => void) => {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define, no-use-before-define
          unpoll();
          fn();
        };

        const unpoll = poll(
          async () => {
            // keep checking for user operation until it is online to return the transaction hash
            // without needing to wait for the receipt
            try {
              const receipt = await bundlerClient.getUserOperation({ hash: userOpHash });
              done(() => resolve(receipt.transactionHash));
            } catch (error) {
              if (!(error instanceof Error && error?.message?.toLowerCase()?.includes("could not be found"))) {
                done(() => reject(error));
              }
            }
          },
          {
            interval: 1000,
          }
        );

        setTimeout(() => {
          done(() =>
            reject(
              providerErrors.custom({
                message: "Process transaction wait timeout.",
                code: 4904,
              })
            )
          );
        }, timeout);
      });
    },
    processSignTransaction: async (txParams: TransactionParams): Promise<string> => {
      const { to, value, data } = txParams;
      const request = await bundlerClient.prepareUserOperation({
        account: smartAccount,
        calls: [
          {
            to,
            value: BigInt(value),
            data,
          },
        ],
      });
      const signature = await smartAccount.signUserOperation({
        callData: request.callData,
        callGasLimit: request.callGasLimit,
        maxFeePerGas: request.maxFeePerGas,
        maxPriorityFeePerGas: request.maxPriorityFeePerGas,
        nonce: request.nonce,
        preVerificationGas: request.preVerificationGas,
        verificationGasLimit: request.verificationGasLimit,
        signature: request.signature,
      });
      return signature;
    },
    processEthSignMessage: async (_: MessageParams<string>, req: JRPCRequest<unknown>): Promise<string> => {
      return eoaProvider.request(req);
    },
    processPersonalMessage: async (msgParams: MessageParams<string>, _: JRPCRequest<unknown>): Promise<string> => {
      const message = msgParams.data;
      return walletClient.signMessage({
        account: smartAccount,
        message: isHexString(message)
          ? {
              raw: message,
            }
          : message,
      });
    },
    processTypedMessageV4: async (msgParams: TypedMessageParams, _: JRPCRequest<unknown>): Promise<string> => {
      try {
        const data: SignTypedDataMessageV4 & { primaryType: string } =
          typeof msgParams.data === "string" ? JSON.parse(msgParams.data) : msgParams.data;
        const signature = await walletClient.signTypedData({
          account: smartAccount,
          domain: {
            ...data.domain,
            verifyingContract: data.domain.verifyingContract as Hex,
            salt: data.domain.salt as Hex,
            chainId: Number(data.domain.chainId),
          },
          primaryType: data.primaryType,
          types: data.types,
          message: data.message,
        });
        return signature;
      } catch (error) {
        throw providerErrors.custom({
          message: error instanceof Error ? error.message : "Failed to sign typed data",
          code: 4905,
        });
      }
    },
  };
}
