# Release Board

## RELEASE GATE

### Pre-Open GO

`NOT READY`

理由:

- Battle Presentation V2 Human PASS required
- Login Bonus UX required

## ACTIVE WORKSTREAMS

### BATTLE-PRES-V2

**PRIORITY:** P1 / PRE-OPEN BLOCKER  
**STATUS:** READY

**PURPOSE:**

Canonical Replayを変更せず、high Skill loadでもHumanが理解できるBattle Presentationへ改善する。

**DO NOT TOUCH:**

- Battle Formula
- Replay Authority
- Canonical Master
- Damage authority
- Target authority
- Battle Result authority

**GATE:**

```text
Machine Validation
→ Human Acceptance
→ PASS
```

### LOGIN-BONUS-UX

**PRIORITY:** P1 / PRE-OPEN BLOCKER  
**STATUS:** READY

**PURPOSE:**

Login Bonusをユーザーが認知し、翌日以降も何が獲得できるか理解できる状態にする。

**MUST:**

- 当日受取だけでは不足。
- 翌日以降のReward Scheduleを確認可能にする。

**DO NOT:**

- Economy値を推測で変更しない。
- Canonical reward masterを勝手に変更しない。

### INVITE-OMISSION

**PRIORITY:** P1  
**STATUS:** READY

**RELEASE DECISION:**

Pre-OpenからInvite機能を`OMIT`する。

**PURPOSE:**

未完成または実質利用不能なInvitation導線をPre-Open User Journeyから除外する。

**DO NOT:**

- Invitation systemそのものを不用意に削除しない。
- 将来復旧可能性を保持する。
- DB破壊・migration rollbackを行わない。

## AVAILABLE PARALLEL SLOT

### SLOT-4

`UNASSIGNED`

Main AI Agentがdependency / file overlapを確認してから割り当てること。
