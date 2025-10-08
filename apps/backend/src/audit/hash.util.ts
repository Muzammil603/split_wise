import crypto from "crypto";

export function sha256Hex(s: string | Buffer) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function chain(prevHash: string | null, payload: any) {
  const base = JSON.stringify(payload);
  const root = sha256Hex(base);
  const combined = prevHash ? `${prevHash}:${root}` : root;
  return { root, chainHash: sha256Hex(combined) };
}
