import crypto from "crypto";

/** JSON stringify with stable key order (so same payload -> same hash) */
export function stableStringify(obj: any): string {
  return JSON.stringify(sortKeys(obj));
}

function sortKeys(x: any): any {
  if (Array.isArray(x)) return x.map(sortKeys);
  if (x && typeof x === "object" && x.constructor === Object) {
    return Object.keys(x).sort().reduce((acc: any, k) => { 
      acc[k] = sortKeys(x[k]); 
      return acc; 
    }, {});
  }
  return x;
}

export function sha256Base64(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("base64");
}
