export const CHARACTER_AWAKENING_COPY_EQUIVALENT_REQUIREMENTS = Object.freeze([1, 1, 2, 3, 4] as const);
export const CHARACTER_AWAKENING_MAX_LEVEL = 5;

export type CharacterAwakeningProgress = {
  awakeningLevel: number;
  awakeningProgress: number;
  nextRequired: number;
  levelsAdvanced: number;
};

export function canonicalCharacterAwakeningRequired(awakeningLevel: number): number {
  const level = Math.max(0, Math.min(CHARACTER_AWAKENING_MAX_LEVEL, Math.trunc(awakeningLevel || 0)));
  return level >= CHARACTER_AWAKENING_MAX_LEVEL
    ? 0
    : CHARACTER_AWAKENING_COPY_EQUIVALENT_REQUIREMENTS[level];
}

export function applyCharacterAwakeningCopyEquivalent(
  awakeningLevel: number,
  awakeningProgress: number,
  equivalents = 1,
): CharacterAwakeningProgress {
  let level = Math.max(0, Math.min(CHARACTER_AWAKENING_MAX_LEVEL, Math.trunc(awakeningLevel || 0)));
  let progress = level >= CHARACTER_AWAKENING_MAX_LEVEL ? 0 : Math.max(0, Math.trunc(awakeningProgress || 0));
  let remaining = Math.max(0, Math.trunc(equivalents || 0));
  let levelsAdvanced = 0;

  while (remaining > 0 && level < CHARACTER_AWAKENING_MAX_LEVEL) {
    progress += 1;
    remaining -= 1;
    const required = canonicalCharacterAwakeningRequired(level);
    if (progress >= required) {
      progress -= required;
      level += 1;
      levelsAdvanced += 1;
      if (level >= CHARACTER_AWAKENING_MAX_LEVEL) progress = 0;
    }
  }

  return {
    awakeningLevel: level,
    awakeningProgress: progress,
    nextRequired: canonicalCharacterAwakeningRequired(level),
    levelsAdvanced,
  };
}
