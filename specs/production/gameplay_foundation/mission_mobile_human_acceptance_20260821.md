# Mission Mobile Human Acceptance — Review Guide

Status: **READY FOR HUMAN REVIEW** (Human PASS is intentionally not asserted.)

## Environment and fixture

Use Local Mock only. Preview and Production must remain untouched.

1. Start a Local Mock session from PowerShell:
   ` $env:NEXT_PUBLIC_USE_MOCK_DB='true'; npm.cmd run dev `
2. Open the local app and create or sign in to a Mock player once.
3. Run `npm.cmd run prepare:mission-mobile-acceptance`.
4. Copy the generated `apply-mission-acceptance-fixture.js` contents into the browser DevTools Console. The page reloads with the acceptance state.
5. To restore the prior Local Mock state, paste the generated `restore-mission-acceptance-fixture.js` into the Console.

The fixture changes Local browser storage only. It does not connect to Development, Preview, or Production.

## Review flow

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

## Mobile viewport checklist

Review both 390×844 (iPhone 13 equivalent) and 412×915 (Pixel 7 equivalent):

- safe area and tab visibility
- card/reward/CTA clipping
- Claim and Claim All buttons
- LOCKED state
- progress bar and numeric progress
- long title/description wrapping
- vertical scrolling
- overlap with fixed controls
- no regression to M9-X Human PASS presentation

Record Human result separately as PASS or remediation required. Automated validation being PASS does not close this Human gate.
