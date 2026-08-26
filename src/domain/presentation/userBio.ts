export const USER_BIO_MAX_LENGTH = 200;

const LEGACY_BIO_VALUES = new Set([
  "歌舞伎町の覇権を握るため立ち上がる。",
  "歌舞伎町の覇権を握る。",
]);

export function normalizeUserBio(value: unknown): string {
  const bio = typeof value === "string" ? value.trim() : "";
  return LEGACY_BIO_VALUES.has(bio) ? "" : bio;
}
