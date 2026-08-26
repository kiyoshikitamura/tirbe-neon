# Mission Mobile Human Acceptance — Review Guide

Status: **DEFERRED TO FINAL UI ACCEPTANCE** (This is not a Mission failure; Mobile Human PASS is intentionally not asserted.)

## Acceptance status

- Mission Production Master: **PASS / FROZEN**
- Mission Runtime Integration: **PASS / CLOSED**
- Mission Automated Validation: **PASS**
- Mission PC Human Acceptance: **PASS**
- Mission Mobile Human Acceptance: **DEFERRED TO FINAL UI ACCEPTANCE**

PC Human Acceptance confirmed that Mission master data, runtime integration, state transitions, and Claim behavior are release-ready. The following observations are deferred common UX polish and do not reopen Mission Integration:

- Claim processing has no explicit feedback between the disabled/darkened state and the reward dialog, which can resemble a freeze.
- The reward-acquired dialog is not visually standardized with existing game dialogs.

Track these as **Common Async Feedback / Modal Polish — DEFERRED NON-BLOCKER**. Do not implement a Mission-specific loading treatment or reward dialog redesign as part of this acceptance gate. Future standardization should be shared by Mission, Present, Gacha, Shop, Character Growth, and Skill/Equipment Growth.

## Environment and fixture

Use Local Mock only. Preview and Production must remain untouched.

1. Start a Local Mock session from PowerShell:
   ` $env:NEXT_PUBLIC_USE_MOCK_DB='true'; npm.cmd run dev `
2. Open the local app and create or sign in to a Mock player once.
3. Run `npm.cmd run prepare:mission-mobile-acceptance`.
4. Copy the generated `apply-mission-acceptance-fixture.js` contents into the browser DevTools Console. The page reloads with the acceptance state.
5. To restore the prior Local Mock state, paste the generated `restore-mission-acceptance-fixture.js` into the Console.

The fixture changes Local browser storage only. It does not connect to Development, Preview, or Production.

## Previously accepted PC flow

The functional flows below passed PC Human Acceptance. They remain documented for fixture context and are not the scope of the remaining Mobile gate.

### Daily and claim

- Open Mission and select DAILY. Confirm exactly four cards.
- Confirm CLAIMED, CLEAR, and IN_PROGRESS states, progress numbers/bars, reward labels, CTA, Claim, and Claim All.
- Claim one CLEAR card and confirm `CLEAR → CLAIMED`.
- Reload/reapply the fixture, then use Claim All and confirm multiple CLEAR cards become CLAIMED.
- Confirm Mission claim creates Present delivery and does not imply immediate Inventory delivery.

### Normal and prerequisite

- Select NORMAL and confirm 33 cards are projected, including absent server rows as LOCKED.
- The fixture records the `first_growth` milestone early while `ob_funnel_gacha_01` is CLEAR and `ob_funnel_growth_01` remains LOCKED.
- Claim `ob_funnel_gacha_01`.
- Confirm `ob_funnel_growth_01` unlocks and becomes CLEAR immediately without repeating growth activity.

### Reward and CTA

- Confirm display names—not internal IDs or the generic fallback—for CASH, DIAMOND, Character EXP, Equipment EXP, Equipment LB Part, Skill Manual, and Character Normal Gacha Ticket.
- Confirm Patrol routes to Patrol; Character/Equipment/Skill progression routes to Character; Guild Join routes to Guild; Funnel and Guild Chat CTAs work; Invite has no CTA.

## Deferred final cross-screen layout scope

Do not run this as an intermediate Mission gate. Review it with the final cross-screen Mobile Human Acceptance at both 390×844 (iPhone 13 equivalent) and 412×915 (Pixel 7 equivalent):

- DAILY / NORMAL tab visibility
- Mission card width
- title and description line wrapping
- Reward label and quantity overflow
- progress bar and numeric progress/target
- CTA, Claim, and Claim All button accessibility
- LOCKED, IN_PROGRESS, CLEAR, and CLAIMED state visibility
- vertical scrolling
- safe area
- footer and close-button overlap
- long-text clipping
- no regression to M9-X Human PASS presentation

### Release decision

The following are Mission release blockers: mobile clipping, inaccessible buttons, unreadable reward/text content, broken card layout, safe-area problems, missing state display, inoperable CTA, or inoperable Claim actions.

The following are non-blocking polish: missing processing feedback before Claim completion and reward-dialog visual inconsistency. These remain in the shared UX backlog and do not fail Mission acceptance.

Record the Mobile Human result separately during Final Cross-Screen Mobile Human Acceptance as PASS or remediation required. Codex must not assert Human PASS. Deferral does not reopen the frozen Mission master or closed Runtime integration.
