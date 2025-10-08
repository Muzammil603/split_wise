export function inc(map: Map<string, bigint>, key: string, delta: bigint) {
  map.set(key, (map.get(key) ?? 0n) + delta);
}

export const toCents = (n: number | string | bigint) => BigInt(n);
