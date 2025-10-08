export type RedactRule = { path: string; replaceWith?: string };

export function redact(obj: any, rules: RedactRule[] = []) {
  const clone = JSON.parse(JSON.stringify(obj ?? {}));
  for (const r of rules) setDeep(clone, r.path, r.replaceWith ?? "***");
  return clone;
}

function setDeep(obj: any, path: string, value: any) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur || typeof cur !== "object") return;
    cur = cur[k];
  }
  const last = parts[parts.length - 1];
  if (cur && typeof cur === "object" && last in cur) {
    cur[last] = value;
  }
}

// Convenient rule sets
export const REDACT_AUTH = [
  { path: "password" },
  { path: "passwordHash" },
  { path: "token" },
];

export const REDACT_FILE = [
  { path: "file.buffer", replaceWith: "[bytes]" },
];
