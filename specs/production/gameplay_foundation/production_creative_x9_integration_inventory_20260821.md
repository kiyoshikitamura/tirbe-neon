# Production Creative x9 Integration Inventory

Date: 2026-08-21
Scope: repository/runtime inventory only. No Creative adoption, generation, replacement, UI redesign, DB change, or deployment was performed.

## 1. Scope

The expected Production Creative delivery contains nine assets:

- Gacha: SP Character, SP Skill, SP Equipment, Normal Character, Normal Skill, Normal Equipment
- My Page: rotation banner 01, 02, 03

Creative copy, art direction, promotion claims, and destinations remain owned by the separate Creative line.

## 2. `public/promotion/` inventory

| File | Dimensions | Format | Alpha | Likely purpose | Runtime reference | Classification |
|---|---:|---|---|---|---|---|
| `X_chara_ageha.png` | 1086x1448 | PNG / RGB | None | X/social Character introduction | None | C. Existing unrelated promotion asset |
| `X_chara_gou.png` | 1086x1448 | PNG / RGB | None | X/social Character introduction | None | C. Existing unrelated promotion asset |
| `X_chara_kaede.png` | 1024x1536 | PNG / RGB | None | X/social Character introduction | None | C. Existing unrelated promotion asset |
| `X_chara_karen.png` | 1086x1448 | PNG / RGB | None | X/social Character introduction | None | C. Existing unrelated promotion asset |
| `X_chara_reiji.png` | 1086x1448 | PNG / RGB | None | X/social Character introduction | None | C. Existing unrelated promotion asset |

The classification is based on the `X_chara_*` naming, the Character-introduction composition, the embedded acquisition copy, the portrait aspect ratio, and the absence of any Runtime reference. It is not a Production-adoption decision. These files remain untracked and untouched.

## 3. Gacha Promotion runtime inventory

### Runtime ownership

- Component: `src/app/components/GachaTab.tsx`
- Styling: `src/app/components/GachaTab.css`
- Shared mobile/desktop source: the same component is used in both cases; the app shell is capped at 430px.
- Gameplay master IDs:
  - `CHAR_SPECIAL` / `CHAR_NORMAL`
  - `SKILL_SPECIAL` / `SKILL_NORMAL`
  - `EQUIP_SPECIAL` / `EQUIP_NORMAL`
- Banner master schema: `public.gacha_banner_master`, introduced by `supabase/migrations/20260804000007_gacha_banners.sql`
- Existing fallback/background assets: `/gacha/bg_gacha_normal.png`, `/gacha/bg_gacha_sr.png`, `/gacha/bg_gacha_ssr.png`

### Current behavior

| Slot | Current visual | Asset source | Display condition | Dedicated image slot |
|---|---|---|---|---|
| SP Character | Text-only Special card | None | Character tab and `SPECIAL_GACHA=OPEN` | No |
| SP Skill | Text-only Special card | None | Skill tab and `SPECIAL_GACHA=OPEN` | No |
| SP Equipment | Text-only Special card | None | Equipment tab and `SPECIAL_GACHA=OPEN` | No |
| Normal Character | Shared Normal background/copy | Hardcoded `/gacha/bg_gacha_normal.png` | Character tab | No category-specific slot |
| Normal Skill | Shared Normal background/copy | Hardcoded `/gacha/bg_gacha_normal.png` | Skill tab | No category-specific slot |
| Normal Equipment | Shared Normal background/copy | Hardcoded `/gacha/bg_gacha_normal.png` | Equipment tab | No category-specific slot |

`activeBanners` has a separate pickup-card path, but it is not a usable Production Creative x9 connection:

1. `GameContext.tsx` declares and exports `activeBanners`, but does not fetch `gacha_banner_master` or populate the state.
2. `GachaTab.tsx` renders `banner_image_url` as the text `[バナー画像: ...]`, not as an image.
3. The UI requires `gacha_banner_master.id` to match a `gacha_masters.id`; the historical seed uses `banner_pickup_char_01`, so it is filtered out.
4. The pickup path is distinct from the six permanent SP/Normal category cards.

The six gameplay cards and their Normal/SP/category distinctions exist. The six Creative image sub-slots do not. Connecting the delivery therefore requires a minimal, shared image-slot wiring inside the existing cards; the current presentation hierarchy, buttons, pricing, probability, ceiling, pool, and animation must remain unchanged.

## 4. My Page rotation runtime inventory

- Component: `src/app/components/HomeTab.tsx`
- Styling: `src/app/components/HomeTab.css`
- Master: `public.home_banner_master`, introduced by `supabase/migrations/20260807000094_home_banner_master.sql`
- Shared mobile/desktop source: the same component and carousel are used; the app shell is capped at 430px.
- Rotation: ascending array index, automatically every 4000ms; left/right arrows also rotate.
- Click: `destination_value` is split as `tab[:subTab]` and passed to `navigateTab`.
- Fallback array: two entries (`pickup_ssr_go` -> `gacha`, `raid_raijin` -> `raid`).
- DB seed: four entries, but Runtime filters `shop` and `gvg`, leaving the same two released destinations.
- Image behavior: `<img>` with `width/height: 100%`, `object-fit: cover`; card height is 54px.
- Title behavior: Runtime title overlay with nowrap/ellipsis.

The carousel architecture accepts any array length, so three Production assets can use it without a carousel or layout redesign. The current effective configuration has only two banners. A third entry and all three Creative destinations must be supplied by an approved static/config manifest. This can be repository configuration and does not require a DB schema migration. The existing DB master can remain as an operational source only if its Production rows are separately reconciled through the approved environment workflow.

## 5. Proposed canonical paths and mapping

No file has been created at these paths.

| Creative slot | Expected repository path | Current asset | Runtime reference | Replacement/connection method | UI component | CTA/destination | Human acceptance |
|---|---|---|---|---|---|---|---|
| SP Character | `/promotion/gacha_sp_character.png` | Text-only | `CHAR_SPECIAL` | Minimal shared image slot + static category mapping | `GachaTab.tsx` | Existing Character SP pull controls; image itself non-CTA | Required |
| SP Skill | `/promotion/gacha_sp_skill.png` | Text-only | `SKILL_SPECIAL` | Same | `GachaTab.tsx` | Existing Skill SP pull controls; image itself non-CTA | Required |
| SP Equipment | `/promotion/gacha_sp_equipment.png` | Text-only | `EQUIP_SPECIAL` | Same | `GachaTab.tsx` | Existing Equipment SP pull controls; image itself non-CTA | Required |
| Normal Character | `/promotion/gacha_normal_character.png` | Shared `/gacha/bg_gacha_normal.png` | `CHAR_NORMAL` | Category-specific static mapping into existing Normal visual zone | `GachaTab.tsx` | Existing Character Normal pull controls; image itself non-CTA | Required |
| Normal Skill | `/promotion/gacha_normal_skill.png` | Shared `/gacha/bg_gacha_normal.png` | `SKILL_NORMAL` | Same | `GachaTab.tsx` | Existing Skill Normal pull controls; image itself non-CTA | Required |
| Normal Equipment | `/promotion/gacha_normal_equipment.png` | Shared `/gacha/bg_gacha_normal.png` | `EQUIP_NORMAL` | Same | `GachaTab.tsx` | Existing Equipment Normal pull controls; image itself non-CTA | Required |
| My Page 01 | `/promotion/mypage_banner_01.png` | `pickup_ssr_go` fallback/master | Carousel index 0 | Replace via approved three-entry static/config manifest | `HomeTab.tsx` | Await Creative delivery manifest | Required |
| My Page 02 | `/promotion/mypage_banner_02.png` | `raid_raijin` fallback/master | Carousel index 1 | Same | `HomeTab.tsx` | Await Creative delivery manifest | Required |
| My Page 03 | `/promotion/mypage_banner_03.png` | None | None | Add third item to the same manifest/array | `HomeTab.tsx` | Await Creative delivery manifest | Required |

Existing repository naming uses lowercase snake_case PNG paths. The proposed names follow that convention and do not collide with current files.

## 6. Technical asset contract

### My Page rotation banners (confirmed from the current slot)

- Recommended source: 1200x200 (6:1), PNG, RGB, no alpha required.
- Current rendered card: approximately 302x54 at 390px viewport, 324x54 at 412px, and 342x54 at the 430px desktop-shell cap.
- Behavior: `object-fit: cover`, centered; small horizontal or vertical crop varies by viewport.
- Safe area: keep critical art/copy inside the central 80% width and 70% height. The Runtime title overlay occupies the left side, so embedded copy should not compete with it.
- Maximum practical transfer size: target <= 300KB per banner; <= 500KB maximum after optimization.

### Gacha Promotions (provisional until the missing image slot is approved)

- The current Normal visual zone is 96px tall and roughly 358-398px wide across supported viewports (about 4:1). SP has no corresponding zone.
- If the existing 96px visual zone is approved as the shared slot, recommended source is 1200x300 (4:1), PNG, RGB, no alpha required, central 80% safe area, target <= 500KB and <= 750KB maximum.
- `object-fit: cover` with centered crop is the minimal expected behavior, but it is not currently implemented for these six assets.
- A final Gacha export contract cannot be declared Production-ready until the shared slot height/crop is approved without altering the Human-PASS presentation.

The existing 768x1376 portrait Gacha backgrounds are broad scene backgrounds and are heavily cropped in cards; they are not a suitable technical template for the six horizontal promotion creatives.

## 7. Impact and operations

- DB schema migration: none expected.
- DB data: not required if an approved repository static/config manifest is used. If Operations requires DB-driven Gacha/My Page replacement, master-row reconciliation must be separately approved and must not reuse historical migration edits.
- UI: My Page needs configuration-only wiring. Gacha requires the missing image sub-slot and mapping, but no hierarchy, CTA, typography, animation, or presentation redesign.
- Monetization: no price, probability, ceiling, pool, paid/free, ticket, or tutorial contract change.
- Operations: deploy optimized files at stable canonical paths, update the approved mapping/manifest, verify destinations and feature gates, then invalidate CDN/cache as applicable. My Page can retain the existing 4-second rotation and master fallback behavior.
- Production/Preview: untouched.

## 8. Human acceptance plan after Creative delivery

Verify all nine files exist and appear in the correct Normal/SP and Character/Skill/Equipment slots; no stretch, clipping, unintended crop, unreadable text, or mismatch with the authoritative Gacha contract; existing CTA/action remains correct; My Page rotates all three in stable order at 4 seconds and routes each approved destination correctly. Run at 390x844, 412x915, and desktop-shell width. Confirm tutorial Gacha and all Human-PASS presentation remain unchanged.

## 9. Blockers / readiness

Inventory is complete. Integration is not yet ready for asset-only execution:

1. Six Gacha Creative image sub-slots are absent; current SP cards are text-only and Normal cards share one hardcoded background.
2. `activeBanners` is not loaded, its image path is displayed as text, and its historical seed ID does not satisfy the Runtime filter.
3. The final Gacha slot dimensions/crop must be approved against the frozen presentation before Creative exports can be accepted.
4. The three My Page Creative destinations/order are not present in this repository and must arrive with the Creative manifest; no destination is inferred here.

The slot and fallback gaps identified by this inventory were resolved by the frozen contract and static-manifest implementation recorded in `production_creative_x9_integration_contract_20260821.md`. Asset availability remains pending; no Creative asset was inferred or generated.
