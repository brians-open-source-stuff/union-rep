import { CaseAadV1, CasePayloadV1, EncryptedCaseEnvelopeV1 } from "@/types";

const enc = new TextEncoder();
const dec = new TextDecoder();

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

function buildAad(aad: CaseAadV1): string {
	// Fixed key order for canonical serialization
	const canonical = JSON.stringify({
		kind: aad.kind,
		employeeId: aad.employeeId,
		keyVersion: aad.keyVersion,
		kid: aad.kid,
	});
	return b64urlEncode(enc.encode(canonical));
}

export async function encryptCasePayload(
	plaintext: CasePayloadV1,
	params: { employeeId: string; keyVersion: number; kid: string; cek: CryptoKey }
): Promise<EncryptedCaseEnvelopeV1> {
	const { employeeId, keyVersion, kid, cek } = params;

	const aadStr = buildAad({ kind: "employee-case", employeeId, keyVersion, kid });
	const additionalData = toArrayBuffer(b64urlDecode(aadStr));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const plaintextBytes = toArrayBuffer(enc.encode(JSON.stringify(plaintext)));
	const ivBytes = toArrayBuffer(iv);

	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: ivBytes, tagLength: 128, additionalData },
		cek,
		plaintextBytes
	);

	return {
		v: 1,
		alg: "A256GCM",
		keyVersion,
		kid,
		iv: b64urlEncode(ivBytes),
		ct: b64urlEncode(ciphertext),
		aad: aadStr,
	};
}

export async function decryptCasePayload(
	envelope: EncryptedCaseEnvelopeV1,
	params: { employeeId: string; cek: CryptoKey }
): Promise<CasePayloadV1> {
	const { employeeId, cek } = params;

	// Verify AAD integrity: rebuild expected AAD and compare
	const expectedAad = buildAad({
		kind: "employee-case",
		employeeId,
		keyVersion: envelope.keyVersion,
		kid: envelope.kid,
	});

	if (expectedAad !== envelope.aad) {
		throw new Error("AAD mismatch: envelope does not belong to this employee or key");
	}

	const iv = toArrayBuffer(b64urlDecode(envelope.iv));
	const ct = toArrayBuffer(b64urlDecode(envelope.ct));
	const additionalData = toArrayBuffer(b64urlDecode(envelope.aad));

	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv, tagLength: 128, additionalData },
		cek,
		ct
	);

	return JSON.parse(dec.decode(plaintext)) as CasePayloadV1;
}

export async function importAesKeyFromRaw(raw32: Uint8Array): Promise<CryptoKey> {
	if (raw32.byteLength !== 32) {
		throw new Error("CEK must be exactly 32 bytes for AES-256-GCM");
	}
	return crypto.subtle.importKey(
		"raw",
		toArrayBuffer(raw32),
		{ name: "AES-GCM", length: 256 },
		false,          // not extractable
		["encrypt", "decrypt"]
	);
}
