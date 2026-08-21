# Character Alpha Release Audit — 2026-08-21

Status: **CHARACTER ALPHA RELEASE GATE PASS**

## Authority and scope

- Canonical roster: `src/domain/gameplay/canonical/data/characters_20260821.json`
- Runtime asset resolution: `src/utils/game_constants.ts` (`char_<slug>_01` → `/characters/<slug>_transparent_asset.png`, with the established `yuji` → `yuuji` filename compatibility mapping)
- Production assets: `public/characters/*_transparent_asset.png`
- Source assets used for remediation: `public/raw_assets/<slug>_raw.jpg`

The Canonical roster contains 60 characters and resolves to exactly 60 Production PNG files. There are no missing or unexpected Production character assets. All 60 assets are RGBA PNG, 768×1376.

## Automated and visual audit

`scripts/audit_character_alpha.mjs` records dimensions, RGBA presence, transparent/partial/opaque ratios, non-transparent bounding box, enclosed transparent components, foreground component fragmentation, and green-residue candidates. Its machine report is written to `test-results/m9x-character-alpha-audit.json`.

The complete roster was also inspected on a checker background using `test-results/m9x-character-alpha-contact-sheet-after.png`. Background transparency is preserved; no unresolved body/clothing holes, abnormal body transparency, or major silhouette loss remains.

## Classification

### A. PASS (55)

`char_go_01` ゴウ, `char_kengo_01` ケンゴ, `char_koharu_01` コハル, `char_reiji_01` レイジ, `char_ageha_01` アゲハ, `char_leo_01` レオ, `char_karen_01` カレン, `char_kaede_01` カエデ, `char_mio_01` ミオ, `char_tetsu_01` テツ, `char_takuro_01` タクロウ, `char_lucas_01` ルーカス, `char_leon_01` レオン, `char_takeshi_01` タケシ, `char_genji_01` ゲンジ, `char_riki_01` リキ, `char_long_01` ロン, `char_sora_01` ソラ, `char_reina_01` レイナ, `char_noa_01` ノア, `char_taiga_01` タイガ, `char_alice_01` アリス, `char_rui_01` ルイ, `char_seiya_01` セイヤ, `char_sakura_01` サクラ, `char_kageyama_01` カゲヤマ, `char_cecile_01` セシル, `char_chang_01` チャン, `char_daimon_01` ダイモン, `char_mark_01` マーク, `char_yuji_01` ユウジ, `char_joe_01` ジョー, `char_ren_male_01` カズヤ, `char_shin_01` シン, `char_yuki_01` ユウキ, `char_jihoon_01` ジフン, `char_kaito_01` カイト, `char_minami_01` ミナミ, `char_yukina_01` ユキナ, `char_aoi_01` アオイ, `char_mei_01` メイ, `char_ren_01` レン, `char_serika_01` セリカ, `char_makoto_01` マコト, `char_momoko_01` モモコ, `char_rin_01` リン, `char_shion_01` シオン, `char_gou_01` ダイスケ, `char_kenji_01` ケンジ, `char_shun_01` シュン, `char_tatsuya_01` タツヤ, `char_naoto_01` ナオト, `char_sawat_01` サワット, `char_yoshihiko_01` ヨシヒコ, `char_tomoya_01` トモヤ.

### B. REMEDIATED (5)

| Character | Production PNG | Source | Source resolution/format | Result |
| --- | --- | --- | --- | --- |
| `char_miyabi_01` ミヤビ | `public/characters/miyabi_transparent_asset.png` | `public/raw_assets/miyabi_raw.jpg` | 768×1376 JPEG | Body/clothing partial-alpha loss restored |
| `char_maya_01` マヤ | `public/characters/maya_transparent_asset.png` | `public/raw_assets/maya_raw.jpg` | 768×1376 JPEG | Green dress transparency holes restored |
| `char_martina_01` マルティナ | `public/characters/martina_transparent_asset.png` | `public/raw_assets/martina_raw.jpg` | 768×1376 JPEG | Body/clothing partial-alpha loss restored |
| `char_masato_01` マサト | `public/characters/masato_transparent_asset.png` | `public/raw_assets/masato_raw.jpg` | 768×1376 JPEG | Shirt/accessory transparency loss restored |
| `char_souta_01` ソウタ | `public/characters/souta_transparent_asset.png` | `public/raw_assets/souta_raw.jpg` | 768×1376 JPEG | Body/clothing partial-alpha loss restored |

`scripts/remediate_character_alpha_from_source.mjs` uses the intact same-character source, row-local source background sampling, and exterior-connected background removal. It preserves the existing Production silhouette edge band and restores only non-background body/clothing pixels. No character generation, redesign, substitution, path change, CSS workaround, UI change, or DB change was used.

### C. SOURCE REQUIRED (0)

None.

### D. MANUAL HUMAN REVIEW (0)

All machine candidates were resolved by checker-background inspection against the same-character source.

### E. ASSET MISSING (0)

None.

## Release gate

- Production-enabled Character: **60 / 60**
- Asset existence: **60 / 60**
- Unexpected transparency holes: **0**
- Abnormal body/clothing transparency: **0**
- Major silhouette loss: **0**
- Unresolved SOURCE REQUIRED: **0**
- MANUAL HUMAN REVIEW: **0**
- ASSET MISSING: **0**

Character Alpha Release Gate: **PASS**
