/**
 * Client-side utilities for rewrapping encrypted data with new device keys
 * This runs in the browser where device private keys are available
 */

import { unwrapDek } from "@/lib/device-crypto";
import { EncryptedCaseEnvelopeV1, EncryptedSalaryEnvelopeV1 } from "@/types";

// Helper functions (from case-crypto.ts but needed here)
function toArrayBuffer(input: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input;
  }
  const bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  return bytes.slice().buffer;
}

function b64urlEncode(buf: ArrayBuffer | ArrayBufferView): string {
  const bytes = new Uint8Array(toArrayBuffer(buf));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}


export type RecordForRewrap = {
  id: string;
  employeeId: string;
  payload: EncryptedCaseEnvelopeV1 | EncryptedSalaryEnvelopeV1;
  keyEnvelopes: Array<{
    recipientKeyId: string;
    recipientUserId: string;
    edk: string;
    wrapAlg: string;
  }>;
};

export type DeviceKeyForRewrap = {
  keyId: string;
  userId: string;
  publicKey: JsonWebKey;
  algorithm: string;
};

type WrappedKeyForRewrap = {
  userId: string;
  keyId: string;
  edk: string;
  wrapAlg: "RSA-OAEP-256";
};

/**
 * Try unwrapping a CEK with any local private key that matches one of the
 * record's existing envelopes. This supports multi-user/browser-shared devices.
 */
export async function unwrapDekWithAnyEnvelope(
  keyEnvelopes: RecordForRewrap["keyEnvelopes"]
): Promise<CryptoKey | null> {
  for (const envelope of keyEnvelopes) {
    try {
      return await unwrapDek(envelope.edk, envelope.recipientKeyId);
    } catch {
      // Continue trying other envelopes until one matches a local private key.
    }
  }

  return null;
}

/**
 * Re-wrap a CEK for all currently relevant device keys.
 */
export async function wrapDekForRecipients(
  cek: CryptoKey,
  recipients: DeviceKeyForRewrap[]
): Promise<WrappedKeyForRewrap[]> {
  const rewrappedKeys = await Promise.all(
    recipients.map(async (key) => {
      try {
        const publicKey = await crypto.subtle.importKey(
          "jwk",
          key.publicKey,
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["wrapKey"]
        );

        const wrapped = await crypto.subtle.wrapKey("raw", cek, publicKey, {
          name: "RSA-OAEP",
        });

        return {
          userId: key.userId,
          keyId: key.keyId,
          edk: b64urlEncode(wrapped),
          wrapAlg: "RSA-OAEP-256" as const,
        };
      } catch (error) {
        console.error(`Failed to wrap key for user ${key.userId}:`, error);
        return null;
      }
    })
  );

  return rewrappedKeys.filter((k): k is WrappedKeyForRewrap => k !== null);
}

/**
 * Full record rewrap flow used by employee view pages.
 */
export async function rewrapRecordWithAccessKeys(
  record: RecordForRewrap,
  recipients: DeviceKeyForRewrap[]
): Promise<WrappedKeyForRewrap[] | null> {
  if (recipients.length === 0) {
    return null;
  }

  const cek = await unwrapDekWithAnyEnvelope(record.keyEnvelopes);
  if (!cek) {
    return null;
  }

  const wrappedKeys = await wrapDekForRecipients(cek, recipients);
  if (wrappedKeys.length === 0) {
    return null;
  }

  return wrappedKeys;
}
