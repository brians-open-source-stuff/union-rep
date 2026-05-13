/**
 * Client-side utilities for rewrapping encrypted data with new device keys
 * This runs in the browser where the user's private keys are available
 */

import { EncryptedCaseEnvelopeV1 } from "@/types";

type IndexedDbStoredDeviceKey = {
  privateKeyJwk?: JsonWebKey;
};

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

function b64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export type CaseForRewrap = {
  id: string;
  employeeId: string;
  payload: EncryptedCaseEnvelopeV1;
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
 * Rewrap a single case with all active device keys
 * 1. Import the old wrapped key (edk)
 * 2. Decrypt it with the user's private key
 * 3. Re-wrap with all active device keys
 */
export async function rewrapCaseWithAllKeys(
  caseData: CaseForRewrap,
  allActiveKeys: DeviceKeyForRewrap[],
  currentUserId?: string,
  userPrivateKeyJwk?: JsonWebKey
): Promise<WrappedKeyForRewrap[] | null> {
  try {
    if (!userPrivateKeyJwk || !currentUserId) {
      console.error("No key envelope found or private key unavailable");
      return null;
    }

    if (allActiveKeys.length === 0) {
      console.error("No active device keys available for rewrap");
      return null;
    }

    // Use the envelope that belongs to the currently signed-in user.
    const currentUserKeyEnvelope = caseData.keyEnvelopes.find(
      (envelope) => envelope.recipientUserId === currentUserId
    );

    if (!currentUserKeyEnvelope) {
      console.error(`No matching key envelope for current user on case ${caseData.id}`);
      return null;
    }

    // Import the user's private key
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      userPrivateKeyJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["unwrapKey"]
    );

    // Unwrap the Content Encryption Key (CEK)
    const wrappedCek = b64urlDecode(currentUserKeyEnvelope.edk);
    let cek: CryptoKey;

    try {
      cek = await crypto.subtle.unwrapKey(
        "raw",
        toArrayBuffer(wrappedCek),
        privateKey,
        { name: "RSA-OAEP" },
        { name: "AES-GCM", length: 256 },
        true,
        ["decrypt", "encrypt"]
      );
    } catch (error) {
      console.error("Failed to unwrap CEK:", error);
      return null;
    }

    // Re-wrap the CEK with all active device keys
    const rewrappedKeys = await Promise.all(
      allActiveKeys.map(async (key) => {
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

    // Filter out any failed wraps
    return rewrappedKeys.filter(
      (k): k is WrappedKeyForRewrap => k !== null
    );
  } catch (error) {
    console.error("Error rewrapping case:", error);
    return null;
  }
}

/**
 * Load a user's private key from IndexedDB
 */
export async function getUserPrivateKeyFromIndexedDB(
  userId: string
): Promise<JsonWebKey | null> {
  const DB_NAME = "ur_keystore";
  const STORE_NAME = "device_keys";

  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      // Get the first key for this user
      const index = store.index("userId");
      const query = index.getAll(userId);

      query.onsuccess = () => {
        const keys = query.result as IndexedDbStoredDeviceKey[];
        if (keys.length > 0) {
          resolve(keys[0].privateKeyJwk || null);
        } else {
          resolve(null);
        }
      };

      query.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    };

    req.onerror = () => resolve(null);
  });
}
