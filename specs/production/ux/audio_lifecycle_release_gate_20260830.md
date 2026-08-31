# GAME03 / TRIBE NEON — Audio Lifecycle Release-Gate Preparation

Date: 2026-08-30
Scope: read-only implementation audit + QA-only harness + human acceptance procedure
Baseline: `origin/main` / `0d76e114793e9f65a4012186adacbb76b1853910`
Production Audio implementation change: **none**

## A. Current Audio Architecture

- Authority: `src/audio/audioContract.ts`. `BGM_ASSETS` / `SE_ASSETS` and their existing filenames are canonical. No new audio was generated.
- Runtime owner: one root `AudioProvider` in `src/app/page.tsx`. It owns one lazy Web Audio `AudioContext`, decoded-buffer cache, desired BGM scene, active looping `AudioBufferSourceNode`, BGM gain, and per-SE one-shot source/gain.
- Browser compatibility: `window.AudioContext` with `window.webkitAudioContext` fallback.
- Autoplay unlock: `unlockAudio()` creates/resumes the context. Title start/continue and `navigateTab()` call it from a user interaction. A failed resume is swallowed and a later gesture can retry.
- BGM transition: the requested scene becomes `desiredSceneRef`; async decode is invalidated by a transition serial; the previous source fades to zero over 0.3s and stops; the new loop fades in. Scenes sharing one file do not restart an active source.
- Lifecycle: `visibilitychange` suspends the context while hidden, resumes it when visible only after provider `unlocked`, then asks the desired BGM to continue. Provider unmount stops BGM immediately and closes the context.
- Settings: BGM/SE enable and independent volume are kept in Provider state. Values are clamped to 0..1. Current defaults are BGM ON / 45%, SE ON / 70%.
- Persistence: settings are local-origin persistence at `localStorage["tribe_neon_audio_settings_v1"]`. This is not server persistence and is not keyed by user ID.
- Failure mode: missing/failing fetch or decode returns silence without blocking game interaction.

Canonical BGM files present under `public/sounds/bgm`:

| File | Bytes | Registry use |
|---|---:|---|
| `bgm_title.mp3` | 1,999,097 | TITLE |
| `bgm_mypage.mp3` | 2,181,746 | HOME, GUILD, QUEST |
| `bgm_battle.mp3` | 1,923,029 | BATTLE, PVP |
| `bgm_raid.mp3` | 2,178,820 | RAID |
| `bgm_gvg.mp3` | 1,859,081 | GVG |

The registry references 25 unique files total: 5 BGM and 20 SE. Physical SE files not referenced by the canonical registry (`se_battle_buff`, `se_battle_debuff`, `se_battle_defeat`, `se_ui_error`) are not promoted or used by this preparation.

## B. BGM / SE Consumer Map

### BGM

| Runtime state | Requested scene | File | Consumer |
|---|---|---|---|
| Title visible | TITLE | `bgm_title.mp3` | `src/app/page.tsx` |
| Normal Home and most tabs | HOME | `bgm_mypage.mp3` | fallback in `src/app/page.tsx` |
| Any `battleState` including Raid battle | BATTLE | `bgm_battle.mp3` | `src/app/page.tsx` |
| PvP tab outside battle | PVP | `bgm_battle.mp3` | `src/app/page.tsx` |
| Guild tab | GUILD | `bgm_mypage.mp3` | `src/app/page.tsx` |
| Raid tab outside battle | HOME | `bgm_mypage.mp3` | current fallback in `src/app/page.tsx` |
| Registry-only | QUEST / RAID / GVG | canonical files above | no current production scene-selection branch |

### SE

| Area | Semantic events / legacy mapping | Main consumers |
|---|---|---|
| Global UI/navigation | `click→UI_TAP`, `error→UI_MODAL_OPEN`, UI back/open/close | `useNavigation`, buttons, panels, tabs, modals |
| Skill/battle | BATTLE_START, ATTACK, SLASH, GUN, SKILL, DAMAGE, CRITICAL, WEAK, VICTORY, DEFEAT, REWARD; `attack`/`hit` legacy | `CardBattleView`, `QuestBattleViewer`, `BattleResultSummary`, `useBattle` |
| Gacha | GACHA_START, REVEAL, SR, SSR; `gacha` legacy | `GachaTab`, `CommonModals`, progression/inventory flows |
| Growth/formation | GROWTH_START, LEVEL_UP, FORMATION_CONFIRM | `useCharacterProgression`, `CharacterTab` |
| Quest | QUEST_START, QUEST_INSTANT | `usePatrol` |
| Mission/reward | MISSION_REWARD | `useInventory`; reward file is shared by reward events |
| Guild | GUILD_JOIN | `useGuild` |

SE flood control is event-specific cooldown for UI_TAP/attack/damage/critical/weak plus a 180ms lower-priority suppression window. Equal-priority events are not globally deduplicated.

## C. Safari Lifecycle Risk

| Risk | Level | Evidence / acceptance focus |
|---|---|---|
| OAuth/full reload loses in-memory `unlocked` state | High | AudioContext and provider state are recreated. Return may remain silent until the next unlock-capable user gesture. Execute I separately. |
| iOS lock/app switch does not always map cleanly to one `visibilitychange` pair | High | Runtime listens only to `visibilitychange`; no `pagehide`, `pageshow`, `freeze`, audio interruption, or AudioContext `statechange` recovery handler. Execute F/G/H on hardware. |
| RAID/GVG/QUEST registry scenes are not selected by production routing | High | Raid lobby currently falls through to HOME and Raid battle selects BATTLE. Acceptance must record actual result; do not call `bgm_raid.mp3` a production pass. |
| Settings are origin-local, not user-scoped server persistence | Medium | Same Safari origin/account container shares the key; private browsing/storage eviction may reset defaults. J/K/L/M cover ordinary persistence only. |
| Async scene transition during rapid routes | Medium | Serial guards stale decodes, but only human ears can exclude short overlap/residue on iPhone Safari. D/E/N target this. |
| Source timeline across suspend/resume | Medium | Active looping source is retained while context suspends. Resume calls `startDesiredBgm`, which intentionally avoids a duplicate when the same path/source is active. |
| SE double firing | Medium | Some UI layers explicitly trigger legacy click and reusable controls may also trigger click. One physical tap must be checked against one audible sound and source-start delta. |
| Long-session buffer/source behavior | Medium | Decoded buffers remain cached for Provider lifetime; SE nodes are not explicitly disconnected after end. O checks degradation and unexpected doubles. |

## D. Acceptance Matrix

Common fail signals for every applicable row: autoplay blocked after the required gesture, silence, double BGM, previous BGM residue, context left suspended, double SE, volume reset, or lost settings.

| ID | Scenario | Setup / action | Expected evidence |
|---|---|---|---|
| A | fresh load | Clear site data; open the target in a new Safari tab; do not tap | No BGM/SE before gesture; QA probe says context not created before arming |
| B | first user gesture | Tap Title start/continue once | Context becomes running; Title BGM starts once; one UI SE at most |
| C | Title → Home | Continue from Title | Title loop fades/stops; Home loop starts; no overlap/residue |
| D | Home → Battle → Home | Start a normal battle, finish/return | Home→Battle→Home is audible once per leg; previous loop does not remain |
| E | Home → Raid → Home | Enter Raid, enter/leave Raid battle, return Home | Record actual lobby/battle tracks; no overlap or silence. Known routing gap remains observable |
| F | tab/background → foreground | While BGM plays, switch Safari tab / background for 10s, return | Context suspends hidden and runs on return; exactly one BGM continues |
| G | screen lock → unlock | Lock for 30s, unlock to same page | BGM returns without another copy; SE works on next tap |
| H | Safari app switch → return | Switch to another app for 30s, return | Same as G; no stale previous BGM |
| I | OAuth → return | Start Google OAuth and return to callback/app | Gameplay remains usable; record whether audio resumes automatically or only after next gesture; no double context/BGM |
| J | reload | Set non-default volumes/toggles; reload | Values persist; autoplay remains policy-compliant; next accepted gesture unlocks one context |
| K | BGM OFF → ON | Disable during playback; wait 2s; enable | Fade/stop on OFF; desired scene starts once on ON at saved volume |
| L | SE OFF → ON | Disable, tap UI/skill controls, re-enable, repeat | No SE while OFF; exactly one correct SE per tap after ON |
| M | volume change | Test BGM 20→80%, SE 20→80%; navigate and reload | Audible change is independent; displayed/storage values persist |
| N | consecutive Battle | Run Battle→Home→Battle with short dwell | Correct single loop each leg; no accumulation; skill SE remains single |
| O | long session | 30–60min mixed navigation, 10+ battles/SE checks, background twice | No progressive doubling, silence, stuck suspended state, volume reset, or material degradation |

## E. Human Test Procedure

### Device record

Before testing, record iPhone model, iOS version, Safari version (same as iOS WebKit), normal/private mode, target URL and deployment SHA, ringer/silent state, media volume, Bluetooth route, Low Power Mode, and network. Use the phone speaker for the baseline; repeat critical failures once without Bluetooth.

### Harness preflight

1. Deploy this branch to a Preview or run Development. Production environment intentionally returns 404 for `/qa/audio`.
2. Open `/qa/audio`. Before touching it, confirm silence and `Context state: not created`.
3. Tap **Arm probe + unlock** once. Confirm Provider unlocked `true`, context count `1`, context state `running`, resume count `1`.
4. Tap TITLE, HOME, BATTLE, RAID individually and identify each canonical filename by the registry shown on the page. Use STOP between tracks if identity is unclear.
5. Tap UI_TAP and BATTLE_SKILL once each. After the first decode/cache, one tap should add one source start and sound once.
6. Exercise BGM/SE toggles and both sliders, reload, and confirm the displayed localStorage JSON.
7. Use the built-in A–O result sheet for notes. It persists under a QA-only key in this origin.

The Harness validates assets, direct Provider controls and browser lifecycle telemetry. It does **not** replace the production-route acceptance below.

### Production-flow run

1. With site data cleared, execute A→E in order on the real app UI. Do not use Harness scene buttons as route evidence.
2. From stable Home BGM execute F, G and H separately. Wait at least 10s (F) / 30s (G/H), and note the first audible frame after return.
3. Execute I with a QA OAuth account. Note whether the callback returns through Title and which exact gesture unlocks audio.
4. Set BGM 25%, SE 60%, toggle both states, then execute J→M. Inspect the Settings UI after reload; Harness localStorage is supplemental evidence only.
5. Execute N twice: normal Battle and Raid Battle if available. Record route, selected track by ear, any overlap window, and one-tap skill SE behavior.
6. Execute O last without clearing data. Every 10 minutes note context state, current route, source start/stop counts in Harness (if using the QA page) and any audible anomaly.
7. A row is PASS only when its expected evidence is observed on hardware. Automation/preflight cannot turn F–O into Human PASS.

### Failure capture

For a FAIL record: matrix ID, wall-clock time, exact tap/lock/app-switch sequence, route before/after, BGM/SE toggles and volume, context state/count/resume/suspend/start/stop shown by Harness, whether a second gesture recovers it, screen recording if audible on recording, and a fresh-load reproduction result. Never change Audio implementation during the gate run.

## F. Harness / Files

- `/qa/audio` — Preview/Development-only human lifecycle harness; no Production navigation link.
- `src/app/qa/audio/page.tsx` — reuses `isQaHarnessAvailable`; returns Next.js 404 when disabled.
- `src/app/qa/audio/AudioLifecycleHarness.tsx` — canonical scene/SE controls, AudioContext/source telemetry, lifecycle log, persistence display, A–O result sheet.
- `src/app/qa/audio/audio-lifecycle.css` — QA-only mobile layout.
- `scripts/verify_audio_release_gate.mjs` — targeted static gate: canonical assets, lifecycle tokens, route guard and matrix completeness.
- `npm run prepare:audio-lifecycle-release-gate` — targeted release-gate preparation verification.
- Existing `tests/e2e/audio-foundation.spec.ts` — mocked autoplay unlock, visibility suspend/resume, missing-asset resilience and settings reload coverage.
- `tests/e2e/audio-lifecycle-harness.spec.ts` — QA route, canonical controls, probe state and matrix smoke coverage.
- Existing `npm run verify:sound-assets` — canonical path existence verification.

## G. Current Known Gaps

1. Human iPhone Safari results are pending; this preparation does not claim hardware PASS.
2. Raid lobby and Raid battle do not select the registered RAID scene in current production routing. GVG and QUEST scenes also have no production selection branch.
3. Lifecycle recovery is based only on `visibilitychange`; page lifecycle and iOS audio interruption edge cases have no dedicated runtime handler.
4. OAuth/full reload destroys the old AudioContext and resets in-memory `unlocked`; post-return recovery depends on a later accepted gesture.
5. Audio settings are per-origin localStorage, not authenticated-user/server persistence as described by the settings product specification.
6. The automated foundation uses a fake AudioContext and cannot prove audible output, WebKit policy, lock/unlock, app switch, Bluetooth routing or long-session stability.
7. The Harness counts all Web Audio sources; it cannot label a native source as BGM versus SE. Pair count deltas with the commanded scene/event and human ears.

## H. Git Status

- Worktree: `C:\Users\Kiyoshi Kitamura\Documents\Codex\2026-08-30\game03-tribe-neon-audio-lifecycle-release`
- Branch: `codex/audio-lifecycle-release-20260830`, tracking `origin/main` at the baseline above.
- Main worktree was not edited. No commit and no push are part of this preparation.
- Expected changes are limited to this document, the QA-only route/harness, QA-only tests, the targeted verifier, and one package script entry.

## I. Production Impact = 0

- Audio contract, assets, `AudioProvider`, scene-selection logic, Settings UI, consumers and Production UI are unchanged.
- No audio file was created, replaced, renamed or removed.
- No Production UI QA entry point was added.
- `/qa/audio` uses the repository's existing environment guard and resolves to 404 in Production.
- No database, API, auth, master data or deployment configuration change is included.
