// Single-use secrets sent in emailed links (invites). Only the hash is stored, so a copy of the
// database can't be turned into working links.
import { createHash, randomBytes } from "node:crypto";

/** SHA-256 in hex. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 32 random bytes (256 bits) as URL-safe text, plus the hash to store. */
export function createToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}
