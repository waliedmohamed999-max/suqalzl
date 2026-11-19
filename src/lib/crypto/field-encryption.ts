/**
 * Application-level field encryption (SPEC §9, devops.md §6.2) for IBANs and sensitive document
 * metadata. AES-256-GCM with a key separate from every other secret, versioned for rotation:
 *   ciphertext = "<keyId>:<ivB64>:<tagB64>:<dataB64>"
 * FIELD_ENCRYPTION_KEY (current, encrypt+decrypt), FIELD_ENCRYPTION_KEY_ID (its id),
 * FIELD_ENCRYPTION_PREVIOUS_KEYS ("v0:<b64>,..." decrypt only, during rotation).
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function parseKey(b64: string): Buffer {
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error("field encryption key must be 32 bytes (base64)");
  return k;
}

function keyring(): { currentId: string; keys: Map<string, Buffer> } {
  const cur = process.env.FIELD_ENCRYPTION_KEY;
  if (!cur) throw new Error("FIELD_ENCRYPTION_KEY is not set");
  const currentId = process.env.FIELD_ENCRYPTION_KEY_ID || "v1";
  const keys = new Map<string, Buffer>([[currentId, parseKey(cur)]]);
  for (const part of (process.env.FIELD_ENCRYPTION_PREVIOUS_KEYS ?? "").split(",").filter(Boolean)) {
    const [id, b64] = part.split(":");
    if (id && b64 && !keys.has(id)) keys.set(id, parseKey(b64));
  }
  return { currentId, keys };
}

export function encryptField(plaintext: string, aad = ""): string {
  const { currentId, keys } = keyring();
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keys.get(currentId)!, iv);
  c.setAAD(Buffer.from(`${currentId}|${aad}`));
  const data = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return [currentId, iv.toString("base64"), c.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptField(ciphertext: string, aad = ""): string {
  const [id, ivB64, tagB64, dataB64] = ciphertext.split(":");
  if (!id || !ivB64 || !tagB64 || dataB64 === undefined) throw new Error("malformed ciphertext");
  const key = keyring().keys.get(id);
  if (!key) throw new Error(`unknown field encryption key id ${id}`);
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  d.setAAD(Buffer.from(`${id}|${aad}`));
  d.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([d.update(Buffer.from(dataB64, "base64")), d.final()]).toString("utf8");
}

/** True when the value was encrypted with an older key and should be re-encrypted. */
export function needsReencryption(ciphertext: string): boolean {
  return ciphertext.split(":")[0] !== (process.env.FIELD_ENCRYPTION_KEY_ID || "v1");
}
