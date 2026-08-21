# TRIBE NEON — ガチャ Production Master
バージョン: 2026-08-21
ステータス: **PRODUCTION FREEZE CANDIDATE / P0**

> 上位前提:
> - 1円 = 1 Diamond = 10 CASH
> - Character / Skill / Equipmentの3カテゴリ
> - Normal Gacha = 100円相当 / 1回
> - Special Gacha = 300円相当 / 1回
> - Special Gachaは200回天井
> - プレオープンでは3カテゴリそれぞれ毎日無料10連を基本とする
> - Diamond直接無料配布は絞り、Special Gacha Ticketを主要な無料Special体験手段にする
> - Character / Skill / EquipmentのDuplicateはそれぞれの育成へ接続する

# 1. ガチャ体系

ガチャはカテゴリを混ぜない。

1. Character Gacha
2. Skill Gacha
3. Equipment Gacha

各カテゴリに:
- NORMAL
- SPECIAL

を持つ。

合計6論理Pool。

ユーザーが「Characterを狙っているのにEquipmentが出る」構造にはしない。

# 2. 価格

## Normal
- 1回 = **100 Diamond**
- 10回 = **1,000 Diamond**
- 100円相当/回

## Special
- 1回 = **300 Diamond**
- 10回 = **3,000 Diamond**
- 300円相当/回

Special Gacha Ticket:
- 1枚 = Special 1回
- 10枚 = Special 10回
- Diamondへの変換不可
- 他商品購入不可

用途限定価値なので無料配布の中心にできる。

# 3. Normal Gachaの役割

Normal:
- 日常的なDuplicate供給
- N/R/SR中心
- SSRも低確率で存在
- 毎日無料10連による継続動機
- Character/Skill/Equipmentの基礎育成

プレオープン:
**各カテゴリ毎日10連無料**

つまり:
- Character 10
- Skill 10
- Equipment 10
= **30 pulls/day**

これはOpen Betaの初期活性化とMaster検証を優先した施策。

正式運営時の無料回数は別途運営Masterで変更可能にする。

# 4. Special Gachaの役割

Special:
- SSR取得
- Exclusive取得
- 高価値Duplicate
- 課金中心
- TicketによるF2P体験

SpecialはNormalより明確にSSR期待値が高い。

# 5. Character Rarity Rate

## Normal Character
Production提案:
- N 55%
- R 30%
- SR 13%
- SSR **2%**

## Special Character
- N 0%
- R 55%
- SR 40%
- SSR **5%**

SpecialではNを排除する。

10連保証:
- Normal: R以上1枠
- Special: SR以上1枠

保証枠でもSSR率は通常抽選に含む。

# 6. Skill Rarity Rate

Skill Master:
- Normal N10/R10/SR15/SSR15
- Exclusive SSR10/SR10

## Normal Skill
- N 55%
- R 30%
- SR 13%
- SSR 2%

Normal Pool:
- Normal Skill 50のみ
- Exclusive Skillは排出しない

## Special Skill
- R 50%
- SR 43%
- SSR 7%

Special Pool:
- Normal SR/SSR
- Exclusive SR/SSR

ExclusiveはSpecialの価値源。

# 7. Equipment Rarity Rate

Equipment:
N35/R50/SR55/SSR30
うちSSR Exclusive10。

## Normal Equipment
- N 55%
- R 30%
- SR 13%
- SSR 2%

Normal:
- Generic equipmentのみ
- Exclusive SSRを排出しない

## Special Equipment
- R 50%
- SR 43%
- SSR 7%

Special:
- Generic SSR
- Exclusive SSR

# 8. Exclusive Weight

Special Skill SSR内:
- Generic SSR Skill: 60%
- Exclusive SSR Skill: 40%

Special Skill SR内:
- Generic SR Skill: 75%
- Exclusive SR Skill: 25%

Special Equipment SSR内:
- Generic SSR Equipment: 60%
- Exclusive SSR Equipment: 40%

同Rarity/同区分内は原則equal weight。

Character所持状況によってPoolを変えない。
未所持CharacterのExclusiveも排出可能。

これにより後からCharacterを引いた際の価値を保持する。

# 9. Character SSR10 Weight

Production SSR10:
アゲハ / ゴウ / カエデ / カレン / ケンゴ / コハル / レオ / ミオ / ミヤビ / レイジ。

Initial launchでは10体equal weight。

Special Character SSR 5%なら:
各SSR ≈0.5% / pull。

Pickup Banner導入時のみ個別weightを変更。

# 10. Special Pity / 天井

**200 pulls = 60,000 Diamond = 60,000円相当**

Special Banner単位でpity countを保持。

Production:
- 200回到達でSSR確定
- Pickup Bannerの場合はPickup対象SSR確定
- Standard Specialの場合は対象SSRから選択/確定方式を別Masterで指定

推奨:
Standard Special 200天井は
**対象SSR選択Ticket** を付与。

理由:
ランダムSSR1体だけでは6万円天井の価値が弱い。

カテゴリ別:
- Character pity
- Skill pity
- Equipment pity

相互共有しない。

# 11. Pity Count

- Paid Diamond pull: count
- Free Diamond pull: count
- Special Ticket pull: **count**
- Campaign free Special pull: count
- Normal pull: countしない

Special Ticketでも天井進行する。

これはF2Pにも長期目標を与え、
Ticket価値を高める。

# 12. SSR取得時Pity

初期Production提案:
**途中SSR取得でも200 countはリセットしない。**

200回で確定報酬を受け取った時のみ0へ。

いわゆるSpark方式。

理由:
- 6万円相当の支出で確実な選択価値
- 途中SSRで天井が消える不満を防止
- 実装/表示が明確

# 13. Duplicate — Character

Duplicate Character:
- 同Character Awakening progressionへ接続
- +5到達後Duplicateは覚醒の書等価値へ変換
- Rarity conversion language N1/R2/SR3/SSR4を維持

正確なAwakening必要Duplicate/Book数はCharacter Awakening Masterを正とする。

DuplicateをCASHへ自動変換しない。

# 14. Duplicate — Skill

Skill duplicate:
- Skill Awakening Pointへ自動加算可能
- N1 / R2 / SR3 / SSR4 pt
- +10必要30pt
- +10後のDuplicateは汎用Skill Manual等価Pointへ変換するか、余剰Point Walletへ接続

推奨:
Skill Point WalletへRarity相当pt変換し、
任意Skillへ直接使えるのではなくSkill Manualとは区別してもよい。

ただし複雑化回避なら+10後はSkill Manual equivalentへ変換。

# 15. Duplicate — Equipment

Equipment duplicate:
**自動素材化しない。**

別InstanceとしてInventoryへ入る。

ユーザーが:
- 別Characterへ装備
- 保持
- LB Pointとして消費

を選択。

Conversion:
N1/R2/SR3/SSR4 LB points。

# 16. Free Normal 10 Supply Impact

プレオープン7日を想定すると:
1カテゴリ70 pulls。

3カテゴリ:
**210 free Normal pulls / user**

これは既存Open Beta配布思想と一致。

Normal SSR2%ならカテゴリごとの期待SSR:
70×2% = 1.4 SSR。

3カテゴリ合計期待SSR:
4.2 SSR相当。

ただしCharacter/Skill/Equipmentは別Poolなので、
Character SSR期待は約1.4体。

初期Activationとして妥当な強度。

# 17. Special Ticket Supply

Diamondを絞る代わりにTicketを配る。

Active F2P target:
**10〜20 Special Tickets / month**

初期中心値:
**15 tickets/month**

用途限定名目価値:
4,500 Diamond相当。

ただしDiamond残高にはならない。

Supply候補:
- Login節目: 4/月
- Weekly Mission: 4/月
- Ranking: 3〜5/月
- Raid/Guild/Achievement: 2〜4/月

Open Beta Campaignは追加配布可能。

# 18. Diamond Free Supply

従来案1,500〜2,500/月は撤回。

Production target:
**Active F2P 300〜500 Diamond/月**

中心値:
**400 Diamond/月**

主Supply:
- Achievement
- Weekly all clear
- Login節目
- Event/Compensation

原則外す:
- Daily Ranking大量Diamond
- Daily Mission大量Diamond
- Raid毎回Diamond

これによりDiamond購入需要を維持。

# 19. Ranking Reward修正

既作成Ranking MasterのDiamond欄は減額/一部Ticket置換する。

方針:
Daily Ranking:
- Diamond原則0
- 上位にCASH/素材

Weekly Ranking:
- Diamond少量
- Special Ticketを主要Gacha報酬へ

Raid Ranking:
- Diamond原則0〜少量
- Special Ticket / Manual / LB素材

Power Ranking:
- Diamond少量
- Ticket

Guild Ranking:
- Ticketは上位GuildのEligible memberへ少量

全Ranking合計でTicket月3〜5程度を中心帯にする。

# 20. Login Bonus修正

30日Login:
- Diamond合計300は維持可能
- Special Ticketを4枚程度追加
- Normal Ticketは削除
- EXP素材増量

Diamond 300だけで月間Targetの大半を占めるため、
Daily/WeeklyからのDiamondをかなり絞る。

# 21. Mission修正

Daily:
- Diamond all-clear 20/dayは撤回
- all-clearはCASH/EXP/LB等へ

Weekly:
- Diamond100/weekは縮小
- Special Ticket×1/weekへ置換

Achievement:
Diamondの主要Free Sourceとして残す。

# 22. Paid Currency UX

Diamond:
- Premium Currency
- Special/Normal Gacha
- Quest Paid Skip
- Energy Drink等
- Shop商品

Special Ticket:
- Special Gacha専用
- Diamondへ変換不可

Gacha画面:
Ticket所持時はTicketを優先利用するか、
ユーザーがTicket/Diamondを選択可能にする。

推奨:
**Ticket優先使用をDefault、確認画面で明示。**

# 23. 10連

Normal:
- 10回=1,000 Diamond
- R以上保証1

Special:
- 10回=3,000 Diamond or Ticket10
- SR以上保証1

Mixed payment:
Ticket5 + Diamond1,500で10連
は初期Productionでは**行わない**。

Ticket不足時:
- 単発Ticket消費
- 10連はTicket10またはDiamond3,000

実装/UXを単純化。

# 24. Gacha Result

必須:
- Rarity
- NEW
- Duplicate
- Character/Skill/Equipment種別
- Duplicate progression feedback
- Exclusive明示
- pity progress
- next CTA

Equipment duplicateは「Duplicate=自動消費」と表示しない。

# 25. DB / Master

```text
gacha_master
- gacha_id
- category
- tier NORMAL/SPECIAL
- cost_currency
- cost_amount
- ten_pull_cost
- guarantee_rule
- pity_rule_id

gacha_pool_master
gacha_pool_items
- item_type
- item_id
- rarity
- weight
- pool_group

gacha_pity_master
- threshold
- reset_rule
- reward_type

user_gacha_pity
- user_id
- gacha_group_id
- count
```

Free Normal:
`daily_free_pull_master`
でカテゴリ別10回/日を管理。

# 26. Server Authority

Draw:
1. auth
2. banner active
3. free/ticket/diamond entitlement
4. currency/ticket lock
5. server RNG
6. guarantee
7. pity increment
8. item grant/duplicate handling
9. pity reward if threshold
10. transaction commit
11. result

Client RNG禁止。

Gacha history保存。

# 27. UI / 表示義務

課金開始時には:
- 提供割合
- 個別提供割合
- 天井
- Ticket扱い
- 10連保証
- Banner期間
- Pickup対象

を明示。

Special Ticket pullもpity countすることを表示。

# 28. 運営

TUNABLE:
- rarity rate
- individual weight
- pickup
- Ticket supply
- campaign free pulls

Frozen:
- category separation
- Normal/Special price
- Special200 spark
- Ticket counts toward pity
- Equipment duplicate instance
- Diamond free supply restrained policy

監視:
- pulls/user
- paid/free ratio
- Ticket→paid conversion
- SSR acquisition
- pity reach
- duplicate rate
- Character awakening speed
- Skill/Equipment progression
- Diamond purchase conversion

# 29. 課金影響

狙うFunnel:
Free Normal
→ Special Ticket
→ SSR/Exclusive体験
→ Ticket枯渇
→ pity progress visible
→ Diamond purchase

Diamondを直接大量配布しないため、
Premium Currency purchase valueを維持する。

Ticketは無料Special体験を保証するが、
Quest Skip/Drink/Shopへ転用できない。

# 30. Acceptance

1. 3カテゴリ完全分離
2. Normal/Special別Pool
3. Normal100 / Special300 Diamond
4. Daily Free Normal10/category
5. 7日=210 free Normal
6. Character Normal SSR2%
7. Character Special SSR5%
8. Skill/Equipment Special SSR7%
9. Exclusive only Special
10. Character SSR10 equal weight initially
11. Special200 spark
12. Ticket counts pity
13. mid-SSR does not reset spark
14. duplicate Character correct
15. duplicate Skill points correct
16. Equipment duplicate separate instance
17. Ticket cannot buy other goods
18. Diamond/Ticket atomic consumption
19. server RNG
20. history/rate/pity UI

# 31. 確定状況

## 既存/上位仕様
- Normal100円
- Special300円
- Special200回天井
- Character/Skill/Equipment 3カテゴリ
- Open Beta各70連=210連
- Duplicate progression
- 1円=1Diamond

## 今回Freeze候補
- Normal/Specialを各カテゴリ分離
- Special Ticketを無料Special主要手段にする
- Diamond Free Supplyを300〜500/月へ絞る
- Ticket 10〜20/月
- Ticketも200 spark進行
- Sparkは途中SSRでリセットしない
- ExclusiveはSpecialのみ
- Equipment duplicate instance維持

## TUNABLE
- Normal SSR2%
- Character Special SSR5%
- Skill/Equipment Special SSR7%
- Exclusive SSR内40%
- Ticket月15中心
- Diamond月400中心

これらはDuplicate/Awakening Simulationで最終FIXする。
