import source from "./data/ssr_gacha_quotes_20260824.json" with { type: "json" };

export type SsrGachaQuote = Readonly<{
  characterId: string;
  quote: string;
  enabled: boolean;
}>;

export const SSR_GACHA_QUOTES: readonly SsrGachaQuote[] = Object.freeze(
  source.quotes.map((entry) => Object.freeze({ ...entry })),
);

const enabledQuoteByCharacter = new Map(
  SSR_GACHA_QUOTES.filter((entry) => entry.enabled).map((entry) => [entry.characterId, entry.quote]),
);

export function resolveSsrGachaQuote(characterId: string | null | undefined): string | null {
  if (!characterId) return null;
  return enabledQuoteByCharacter.get(characterId) ?? null;
}
