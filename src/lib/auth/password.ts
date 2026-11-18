/**
 * Password hashing with Node's built-in scrypt (memory-hard, no native dependency).
 * Format: scrypt$N$r$p$saltB64$hashB64 — parameters are stored so they can be raised later.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 128 * N * R * 2;

export const PASSWORD_MIN_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < PASSWORD_MIN_LENGTH) throw new RangeError(`password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  // Unknown user: verify against a dummy hash so timing does not reveal whether the e-mail exists.
  const target = stored ?? DUMMY_HASH;
  const parts = target.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
  const expected = Buffer.from(hashB64, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 128 * Number(n) * Number(r) * 2,
  });
  return stored != null && key.length === expected.length && timingSafeEqual(key, expected);
}

// scrypt of a random throwaway password; never matches anything.
const DUMMY_HASH =
  "scrypt$32768$8$1$c3VxYWx6bC1kdW1teS1zYWx0$" + Buffer.alloc(64, 7).toString("base64");
