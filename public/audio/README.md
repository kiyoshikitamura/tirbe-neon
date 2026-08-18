# TRIBE NEON audio asset contract

Audio files are supplied by the separate sound-production line. The application
uses the semantic mappings in `src/audio/audioContract.ts`; UI components must
not reference these paths directly.

- `bgm/`: title, home, battle, and guild loop tracks
- `se/`: semantic UI, gacha, growth, quest, battle, reward, mission, and guild events

Missing files intentionally resolve to silence and never block gameplay. Do not
commit generated or placeholder audio to these directories.
