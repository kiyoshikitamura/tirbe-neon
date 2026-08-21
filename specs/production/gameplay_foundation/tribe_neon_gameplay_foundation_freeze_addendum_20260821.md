# TRIBE NEON --- Gameplay Foundation Freeze Addendum / 次チャット引継ぎ

Version: 2026-08-21\
Status: **FIXED / RECOVERED**

## 最優先ルール

旧案はすべて破棄。2026-08-20〜21の最新FIX値だけを正とする。Character /
Skill / Equipmentを再設計しない。

## Character 60 --- CLOSE

以下は60/60 FIX済み。 - 正式名称 - Rarity: SSR10 / SR20 / R20 / N10 -
Attribute: JUSTICE15 / ORDER15 / EVIL15 / CHAOS15 - Hometown: 新宿10 /
渋谷10 / 池袋6 / 六本木10 / 秋葉原10 / 川崎9 / 横浜5 - Growth Pattern -
Lv1 HP / ATK / DEF / SPD / LUK - Lv100 HP / ATK / DEF / SPD / LUK

最新名称Override: - char_go_01 = ゴウ - char_gou_01 = ダイスケ -
char_ren_male_01 = カズヤ - char_ren_01 = レン

Awakening: - HP/ATK/DEF = 1.00 / 1.08 / 1.15 / 1.32 / 1.50 / 1.75 -
SPD/LUK = 1.00 / 1.03 / 1.06 / 1.10 / 1.15 / 1.20 - Skill Slots = 3 / 4
/ 5 / 5 / 5 / 6

Attribute定義: - JUSTICE = 自分なりの正義・仲間・義理 - ORDER =
規律・統制・計算・プロフェッショナル - EVIL =
欲望・暴力・支配・反社会性 - CHAOS =
自由・反骨・予測不能・既成秩序からの逸脱

## Skill 70 --- CLOSE

Normal N10 / R10 / SR15 / SSR15 + Exclusive SSR10 / SR10
の全実数値をFIX済み。 今回会話の最新値を既存
`skill_gameplay_master_20260821.md` より優先する。

重要な最新値: - SKILL_051 ゴウ「剛拳・一撃必倒」= 320% ATK +
DEF無視55% - レイジCounter = 150% ATK / 最大1回 per Round - アゲハ
Battle Start SPD+25% / ATK+20% /3T / once per battle - カレン
BLIND95%/2T - ミヤビ BLIND95%/2T + SILENCE75%/1T + SPD-25% - カエデ
Ally-all ATK+18% / DEF+18% /3T / once per battle - ソラ Battle Start
SPD+22%/3T / once per battle - アリス SILENCE60%/1T - マヤ
200%、30%時300% - サクラ BLEED95%/3T - セシル ATK-22% + BLIND80%/2T -
Exclusive Skillは該当Characterのみ装備可 - 6 Skill Slotsの1枠を消費 -
同一Characterが装備できるExclusive Skillは最大1個

### 次チャットP0衝突監査

既存Freeze Indexの Ignore DEF absolute cap=50%
と、最新FIXのゴウ55%が衝突。
旧値へ戻さず、最新FIXを前提にBattle側Contractを監査する。

## Equipment 170 --- CLOSE（Gameplay本体）

既存 `equipment_gameplay_master_20260821.md` の170件本体を維持。

最新名称: - ACCESSORY_049 = **フェイト・チャーム**（カレン専用） -
ACCESSORY_050 = **クイーンズ・シグネット**（カエデ専用）

### Equipment LB Option --- FIXED

全Rarity共通 / Slot単位固定 / Random Optionなし。

  Slot        +3        +5                      +10
  ----------- --------- ----------------------- ----------------------
  Weapon      ATK +3%   Critical Damage +8%     Damage Dealt +8%
  Head        DEF +3%   Status Resistance +8%   Damage Taken -6%
  Body        HP +3%    DEF +5%                 Damage Taken -8%
  Legs        SPD +3%   SPD +5%                 SPD +8%
  Accessory   LUK +3%   Critical Rate +5%       Critical Damage +10%

既存LB Contract: - +0〜+10 - Flat Stat +4% / step - +10 = +40% - Option
unlock = +3 / +5 / +10 - Random Optionなし - LB equivalent cost total =
25

## 次チャットで続ける監査

Character / Skill / Equipmentの再設計はしない。

1.  今回RecoveryしたFIX値をCanonical Masterへ転記・Repository保存
2.  Reward / Economy / Quest / Gacha / Login / Mission / Ranking /
    Guild等の最新FIX Master統合確認
3.  Battle Contractとの衝突監査
4.  Skill cooldown / available_from_roundのMachine Master化
5.  Character / Skill / Equipment / Item Asset mapping
6.  DB migration / Repository接続
7.  Simulation / E2E
8.  Human Acceptance
9.  Production Freeze Index更新
10. Codex Implementation Migration指示

## 現在の判定

-   Character60: **CLOSE**
-   Skill70: **CLOSE**
-   Equipment170 Gameplay本体: **CLOSE**
-   Equipment LB Option: **CLOSE**
-   Gameplay Foundation全体: **統合監査・Repository正本化が残る**
