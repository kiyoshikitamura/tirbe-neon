# TRIBE NEON — Gameplay Foundation Production Freeze Snapshot

Version: 2026-08-21  
Status: **PRODUCTION FROZEN — DATA PRESERVATION SNAPSHOT**

## Authority
- 2026-08-20〜21にユーザーがFIXした最新仕様のみを正とする。
- それ以前のCharacter / Skill / Equipment Gameplay仕様は破棄対象。
- 旧Master / 旧DB / 旧Runtimeから値を補完しない。
- 本Snapshot保存時点では旧Master / Runtime / DBを変更しない。

## Frozen Scope
- Character 60: FROZEN
- Skill 70: FROZEN
- Equipment 170 Gameplay: FROZEN
- Equipment Limit Break: FROZEN

## Machine Snapshots
- characters_20260821.json
- skills_20260821.json
- equipment_limit_break_20260821.json

## Character
Awakening:
- HP / ATK / DEF = 1.00 / 1.08 / 1.15 / 1.32 / 1.50 / 1.75
- SPD / LUK = 1.00 / 1.03 / 1.06 / 1.10 / 1.15 / 1.20
- Skill Slots = 3 / 4 / 5 / 5 / 5 / 6

Name overrides:
- char_go_01 = ゴウ
- char_gou_01 = ダイスケ
- char_ren_male_01 = カズヤ
- char_ren_01 = レン

## Skill final additions
SKILL_001〜010:
- 001 90% ATK
- 002 Shield 10% MaxHP / 2T
- 003 Heal 10% target MaxHP
- 004 SPD +12% / 2T
- 005 55% ATK + Poison 70% / 2T
- 006 DEF +15% / 2T
- 007 Taunt 80% / 1T
- 008 100% ATK
- 009 ATK +15% / 2T
- 010 Blind 60% / 1T
- 全件 cooldown=3 / available_from_round=1

Cooldown Contract:
- fixed_initial_cd 0 → available_from_round 1
- fixed_initial_cd 1 → available_from_round 2
- fixed_initial_cd 2 → available_from_round 3
- fixed_initial_cd 3 → available_from_round 4
- Round N使用 / cooldown=C → 次回使用可能Round=N+C
- Trigger Skill = cooldown null / available_from_round 1

Local completion:
- SKILL_049 SPD-20% / 3T
- SKILL_053 Shield35% MaxHP /2T; Taunt100% /2T; DEF+30% /2T
- SKILL_056 SELF SPD+25% /3T
- SKILL_058 ENEMY_ALL; SPD-25% /2T
- SKILL_060 Regen7% MaxHP/Turn /3T
- SKILL_061 DEF-22% /2T
- SKILL_062 HP100%=190%, HP50%=215%, HP25%=240%, linear interpolation, HP25%以下=240%
- SKILL_063 SELF; DEF+22% /2T
- SKILL_064 SELF; Counter100% ATK /2T
- SKILL_066 SELF SPD+20% /2T
- SKILL_067 ENEMY_SINGLE; SPD-20% /2T
- SKILL_070 ENEMY_SINGLE; ATK-22% /2T

Critical:
- SKILL_051 = 320% ATK + Ignore DEF 55%
- 旧50% capへ戻さない。

## Equipment
- Gameplay本体170件は 2026-08-21 Equipment Gameplay Master のFIX済み本体を維持。
- ACCESSORY_049 = フェイト・チャーム
- ACCESSORY_050 = クイーンズ・シグネット
- LB = +0〜+10 / +4% flat stat per step / fixed +3,+5,+10 options / Random Optionなし / total cost 25

## Repository write status
GitHub connector write operations returned HTTP 403 during snapshot preservation.
No legacy file, DB, runtime, or branch was modified.
Repository write remains pending; this local bundle is the preservation source until write access is restored.
