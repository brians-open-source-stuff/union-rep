const DB_NAME = "ur_keystore";
const DB_VERSION = 2;
const STORE_NAME = "device_keys";

type StoredDeviceKey = {
  keyId: string;
  userId?: string;
  privateKey?: CryptoKey;
  privateKeyJwk?: JsonWebKey;
  publicKeyJwk: JsonWebKey;
  algorithm: string;
  createdAt: string;
};

const ACTIVE_USER_STORAGE_KEY = "ur_active_user_id";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "keyId" });
        store.createIndex("userId", "userId", { unique: false });
        return;
      }

      const tx = req.transaction;
      if (!tx) return;

      const existingStore = tx.objectStore(STORE_NAME);

      // If schema is not keyId-based (legacy), rebuild store with the correct schema.
      if (existingStore.keyPath !== "keyId") {
        db.deleteObjectStore(STORE_NAME);
        const recreated = db.createObjectStore(STORE_NAME, { keyPath: "keyId" });
        recreated.createIndex("userId", "userId", { unique: false });
        return;
      }

      if (!existingStore.indexNames.contains("userId")) {
        existingStore.createIndex("userId", "userId", { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };
    req.onblocked = () => {
      reject(new Error("IndexedDB upgrade blocked by another open tab/connection"));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function generateAndStoreDeviceKey(userId?: string): Promise<{
  keyId: string;
  publicKeyJwk: JsonWebKey;
  algorithm: string;
}> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["wrapKey", "unwrapKey"]
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const keyId = crypto.randomUUID();
  const algorithm = "RSA-OAEP-256";

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      keyId,
      userId,
      privateKeyJwk,
      publicKeyJwk,
      algorithm,
      createdAt: new Date().toISOString(),
    } satisfies StoredDeviceKey);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });

  return { keyId, publicKeyJwk, algorithm };
}

export async function getDeviceKey(keyId: string): Promise<StoredDeviceKey | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(keyId);
    req.onsuccess = () => resolve((req.result as StoredDeviceKey) ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
    tx.onabort = () => db.close();
  });
}

export async function getDeviceKeysForUser(userId: string): Promise<StoredDeviceKey[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.indexNames.contains("userId") ? store.index("userId").getAll(userId) : store.getAll();
    req.onsuccess = () => {
      const keys = req.result as StoredDeviceKey[];
      if (store.indexNames.contains("userId")) {
        resolve(keys);
        return;
      }

      resolve(keys.filter((k) => k.userId === userId));
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
    tx.onabort = () => db.close();
  });
}

export function setActiveDeviceUser(userId: string) {
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
}

export function getActiveDeviceUser(): string | null {
  return localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
}

function b64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Unwraps a base64url-encoded wrapped DEK using the stored RSA-OAEP private key.
 * Returns a non-extractable AES-GCM CryptoKey ready for decryption.
 */
export async function unwrapDek(edk: string, keyId: string): Promise<CryptoKey> {
  const stored = await getDeviceKey(keyId);
  if (!stored) throw new Error(`No device key found for keyId: ${keyId}`);

  const privateKey = stored.privateKey
    ? stored.privateKey
    : stored.privateKeyJwk
      ? await crypto.subtle.importKey(
        "jwk",
        stored.privateKeyJwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["unwrapKey"]
      )
      : null;

  if (!privateKey) {
    throw new Error(`No private key material found for keyId: ${keyId}`);
  }

  const wrappedBytes: ArrayBuffer = new Uint8Array(b64urlDecode(edk)).buffer as ArrayBuffer;

  return crypto.subtle.unwrapKey(
    "raw",
    wrappedBytes,
    privateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function getActiveDeviceKeyId(): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const keys = req.result as StoredDeviceKey[];
      if (keys.length === 0) {
        resolve(null);
        return;
      }

      const activeUserId = getActiveDeviceUser();
      if (activeUserId) {
        const activeUserKeys = keys.filter((k) => k.userId === activeUserId);
        if (activeUserKeys.length > 0) {
          resolve(activeUserKeys[activeUserKeys.length - 1].keyId);
          return;
        }
      }

      // Backwards compatibility for keys created before user scoping.
      resolve(keys[keys.length - 1].keyId);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
    tx.onabort = () => db.close();
  });
}
