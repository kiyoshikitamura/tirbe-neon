# Release Board

## RELEASE GATE

### Pre-Open GO

`NOT READY`

2026-09-02時点の判定。Machine ValidationとHuman PASSを同一視しない。

Blocker:

- Battle Presentation V2 full Skill load stress Human PASS未記録
- Login Bonus UX Human PASS未記録
- Final Cross-Screen Human Acceptance未完了（Desktop / 390×844 / 412×915）
- iPhone Safari / Android Chrome / PC ChromeのProduction候補実機QA未完了
- Audio Lifecycle A–O Human Acceptance未完了
- Production Smoke未完了
- Analytics、広告CV計測、エラー監視のprovider / ID / DSN未確定・未検証
- OGP / favicon / robotsのRelease確認未完了

Machine evidence:

- Battle Full Skill Load fixture / Battle Presentation contract: `PASS`
- Login Bonus recognition contract: `PASS`
- Operations exposure contract: `PASS`
- Final asset technical integrity / Production Creative x9 contract: `PASS`

上記Machine PASSは作業中treeの結果を含む。Release Candidate SHA固定後に同一SHAで再実行し、証跡へ記録する。

詳細判定は [Pre-Release GO / NO-GO Checklist](pre_release_go_no_go_checklist.md)、未確定入力は [Release Gate Input Record](release_gate_input_record.md) を正とする。

## ACTIVE WORKSTREAMS

### BATTLE-PRES-V2

**PRIORITY:** P1 / PRE-OPEN BLOCKER  
**STATUS:** MACHINE PASS / HUMAN REVIEW REQUIRED

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

**CURRENT EVIDENCE:**

- Canonical Replay固定fixture、5対5、high Skill loadのMachine ValidationはPASS
- Production QA routeは公開せず、Preview / DevelopmentのQA routeでHuman確認する
- Actor → Target → Attack → Impact → Damage → HP Transition → DefeatのHuman追跡可否は未判定

### LOGIN-BONUS-UX

**PRIORITY:** P1 / PRE-OPEN BLOCKER  
**STATUS:** MACHINE PASS / HUMAN REVIEW REQUIRED

**PURPOSE:**

Login Bonusをユーザーが認知し、翌日以降も何が獲得できるか理解できる状態にする。

**MUST:**

- 当日受取だけでは不足。
- 翌日以降のReward Scheduleを確認可能にする。

**DO NOT:**

- Economy値を推測で変更しない。
- Canonical reward masterを勝手に変更しない。

**CURRENT EVIDENCE:**

- 30日cycle、当日・翌日・未来・受取済み表示、同日冪等性のMachine ValidationはPASS
- 390×844 / 412×915のautomated coverageは存在する
- 当日獲得の認知、翌日以降の理解、overflow / tap targetのHuman Visual / UX PASSは未記録

### INVITE-OMISSION

**PRIORITY:** P1  
**STATUS:** MACHINE PASS / HUMAN REVIEW REQUIRED

**RELEASE DECISION:**

Pre-OpenからInvite機能を`OMIT`する。

**PURPOSE:**

未完成または実質利用不能なInvitation導線をPre-Open User Journeyから除外する。

**DO NOT:**

- Invitation systemそのものを不用意に削除しない。
- 将来復旧可能性を保持する。
- DB破壊・migration rollbackを行わない。

**CURRENT RELEASE MATRIX:**

- `INVITE` / `FRIEND` / `FRIEND_HELPER`: `OMIT`
- `SHOP` / `GVG`: `UPCOMING`
- `PAYMENT` / `SPECIAL_GACHA`: `CLOSED`
- `GUILD_COMBAT_BUFF`: `OMIT`
- `PVP` / `RAID` / `GUILD`: `OPEN`

現行Operations feature-stateをAuthorityとする。旧文書の露出表と矛盾する場合、旧表をRelease証拠に使用しない。Desktop / 390×844 / 412×915で非表示、dead navigation不在、safe-area、戻る・進む、OPEN機能の継続露出をHuman確認する。

## AVAILABLE PARALLEL SLOT

### SLOT-4

`UNASSIGNED`

Main AI Agentがdependency / file overlapを確認してから割り当てること。
