export type PageParams = {
  limit?: number;               // default 20, max 100
  cursor?: string | null;       // encoded "<createdAt>|<id>"
};

export type PageResult<T> = {
  items: T[];
  nextCursor: string | null;
};

/** Encode/decode a composite cursor "<createdAt>|<id>" */
export function encodeCursor(createdAt: Date, id: string) {
  return `${createdAt.toISOString()}|${id}`;
}

export function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;
  const [iso, id] = cursor.split("|");
  return { createdAt: new Date(iso), id };
}

/** normalize limit */
export function clampLimit(limit?: number, def = 20, max = 100) {
  if (!limit || limit <= 0) return def;
  return Math.min(limit, max);
}
