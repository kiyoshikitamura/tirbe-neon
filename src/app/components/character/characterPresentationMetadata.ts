export type CharacterPresentationMetadata = {
  focalX: number;
  thumbnailFocalY: number;
  portraitFocalY: number;
  cardFocalY: number;
  thumbnailScale: number;
  thumbnailX: number;
  thumbnailY: number;
  cardScale: number;
  cardX: number;
  cardY: number;
  compactScale: number;
  compactX: number;
  compactY: number;
  revealScale: number;
  revealX: number;
  revealY: number;
  battleScale: number;
  battleX: number;
  battleY: number;
};

const DEFAULT_METADATA: CharacterPresentationMetadata = {
  focalX: 50,
  thumbnailFocalY: 0,
  portraitFocalY: 10,
  cardFocalY: 12,
  thumbnailScale: 2.15,
  thumbnailX: 50,
  thumbnailY: 0,
  cardScale: 1,
  cardX: 50,
  cardY: 12,
  compactScale: 1.58,
  compactX: 50,
  compactY: 0,
  revealScale: .96,
  revealX: 50,
  revealY: 100,
  battleScale: 1.34,
  battleX: 50,
  battleY: 20,
};

// Visual framing only. Gameplay and character master data remain server-side.
const CHARACTER_PRESENTATION_METADATA: Record<string, Partial<CharacterPresentationMetadata>> = {
  reiji: { focalX: 52 },
  rui: { focalX: 50 },
  chang: { focalX: 51 },
  ageha: { focalX: 48, portraitFocalY: 4, thumbnailScale: 2, thumbnailY: 4, cardScale: .94, cardY: 4, compactScale: 1.48, compactY: 4, revealScale: .92, battleScale: 1.24, battleY: 18 },
  alice: { focalX: 47 },
  kaito: { focalX: 51 },
  go: { focalX: 50, thumbnailScale: 2.05, compactScale: 1.5 },
  gou: { focalX: 50, thumbnailScale: 2.05, compactScale: 1.5 },
  kaede: { focalX: 49, thumbnailScale: 2.05 },
  karen: { focalX: 50, thumbnailScale: 2.05 },
  kengo: { focalX: 51, thumbnailScale: 2.05 },
  koharu: { focalX: 49, thumbnailScale: 2.05 },
  leo: { focalX: 54, thumbnailScale: 2.05 },
  leon: { focalX: 54, thumbnailScale: 2.05 },
  mio: { focalX: 50, thumbnailScale: 2.05 },
  miyabi: { focalX: 50, thumbnailScale: 2.05 },
  sakura: { focalX: 52 },
  yuki: { focalX: 49 },
};

function publicAssetIdentifier(src: string) {
  const filename = src.split("?")[0].split("/").pop() || "";
  return filename.replace(/_transparent_asset\.png$/i, "").toLowerCase();
}

export function getCharacterPresentationMetadata(src: string): CharacterPresentationMetadata {
  const override = CHARACTER_PRESENTATION_METADATA[publicAssetIdentifier(src)] || {};
  const focalX = override.focalX ?? DEFAULT_METADATA.focalX;
  const thumbnailY = override.thumbnailFocalY ?? DEFAULT_METADATA.thumbnailFocalY;
  const cardY = override.cardFocalY ?? DEFAULT_METADATA.cardFocalY;
  return {
    ...DEFAULT_METADATA,
    ...override,
    thumbnailX: override.thumbnailX ?? focalX,
    thumbnailY: override.thumbnailY ?? thumbnailY,
    cardX: override.cardX ?? focalX,
    cardY: override.cardY ?? cardY,
    compactX: override.compactX ?? focalX,
    compactY: override.compactY ?? thumbnailY,
    revealX: override.revealX ?? focalX,
    battleX: override.battleX ?? focalX,
  };
}
