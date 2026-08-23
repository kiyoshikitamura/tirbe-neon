# Phase C1 Human Acceptance

Status: `AUTOMATED GATE PASS / HUMAN REVIEW REQUIRED`

This checklist verifies presentation and interaction only. Gameplay masters, rewards, probabilities, resource recovery, Battle Runtime, and Operations feature states remain frozen.

## Viewports

- Desktop: current mobile-width application shell centered in the viewport
- iPhone 13 equivalent: `390 × 844`
- Pixel 7 equivalent: `412 × 915`

At every viewport confirm there is no horizontal clipping, inaccessible CTA, nested-scroll trap, modal trap, or safe-area overlap.

## Journey

1. Entry → World Introduction → Name → Tutorial → Free Gacha.
2. Formation shows five slots, no Friend Helper slot, total power, and immediate save feedback.
3. First Quest CTA is unambiguous; start, Battle, result, reward, and return transitions remain understandable.
4. Home shows only open pre-open features and one primary next-action CTA.
5. Mission DAILY/NORMAL states (`LOCKED`, `IN_PROGRESS`, `CLEAR`, `CLAIMED`) wrap correctly. Claim and Claim All immediately show `受取中…` and finish in the common reward dialog.
6. Guild recommendation cards show level, members/cap, seven-day activity, recruitment mode, and a data-derived recommendation reason.
7. Open Join completes into Welcome → TRIBE Chat. Application mode explains the pending state. Chat input remains visible; sending shows `送信中…`; no automatic post is sent.
8. Character, Skill, and Equipment growth explain current/next state and show pending/success feedback without changing gameplay values.
9. Quest, PvP, Raid, and Ranking remain navigable and readable on mobile.
10. Present Claim/Claim All use the same pending and reward-result language as Mission.
11. Maintenance shows a readable message and reload action without an escape loop.

## Severity

Blocker: operation impossible, clipped CTA/text, infinite loading, missing action feedback, wrong navigation/exposure, modal trap, or safe-area failure.

Non-blocker: minor spacing, subtle animation, final sound, promotional creative, or small visual polish.

Human acceptance must be recorded by the reviewer; automated checks do not set Human PASS.
