export type CharacterPresentationMetadata = {
  focalX: number;
  thumbnailFocalY: number;
  portraitFocalY: number;
  cardFocalY: number;
};

const DEFAULT_METADATA: CharacterPresentationMetadata = {
  focalX: 50,
  thumbnailFocalY: 0,
  portraitFocalY: 10,
  cardFocalY: 12,
};

// Visual framing only. Gameplay and character master data remain server-side.
const CHARACTER_PRESENTATION_METADATA: Record<string, Partial<CharacterPresentationMetadata>> = {
  reiji: { focalX: 52 },
  rui: { focalX: 50 },
  chang: { focalX: 51 },
  ageha: { focalX: 48, portraitFocalY: 4 },
  alice: { focalX: 47 },
  kaito: { focalX: 51 },
  koharu: { focalX: 49 },
  leon: { focalX: 54 },
  sakura: { focalX: 52 },
  yuki: { focalX: 49 },
};

function publicAssetIdentifier(src: string) {
  const filename = src.split("?")[0].split("/").pop() || "";
  return filename.replace(/_transparent_asset\.png$/i, "").toLowerCase();
}

export function getCharacterPresentationMetadata(src: string): CharacterPresentationMetadata {
  return { ...DEFAULT_METADATA, ...(CHARACTER_PRESENTATION_METADATA[publicAssetIdentifier(src)] || {}) };
}
