# TRIBE NEON — SSR取得 / Duplicate / Awakening進行 Simulation
バージョン: 2026-08-21
ステータス: **BALANCE AUDIT / PRODUCTION FREEZE CANDIDATE**

## 1. Simulation前提

確定・上位条件:
- TutorialでSSR Character 1体確定
- Character Normal Gacha: 毎日10連無料を恒久実施
- Skill Normal Gacha: 毎日10連無料
- Equipment Normal Gacha: 毎日10連無料
- Normal Character SSR率候補: 2%
- Special Character SSR率候補: 5%
- Special Ticket: Active F2P 10〜20/月、中心15/月
- Specialはプレオープン中UI表示、Drawは本リリースで解放
- Production SSR Character = 10体
- 初期Standard PoolではSSR10体equal weight
- 覚醒の書 fixed free supply候補: 最低1/月 + Event/Achievement
- 目標: 推しSSRをF2PでD90前後+3、+5は8〜10ヶ月

## 2. プレオープン7日

Character Normal:
70 pulls × SSR2% = **SSR期待1.4体**

Tutorial:
SSR 1体確定

Special:
プレオープン中はLocked。Ticketは貯蓄。

したがってD7:
- Tutorial SSR: 1
- Normal SSR: 期待1.4
- 合計SSR取得回数期待: **2.4体**
- 実ユーザー分布として概ね **1+1〜3体** が中心

これは「Tutorial 1体 + 追加1〜3体」という上位想定と整合する。

## 3. 恒久無料10連の長期影響

Character Normalだけで:
- 30日: 300 pulls → SSR期待6体
- 90日: 900 pulls → SSR期待18体
- 180日: 1,800 pulls → SSR期待36体
- 270日: 2,700 pulls → SSR期待54体

Special Ticket中心15/月を加えるとSSR期待:
- D30: +0.75
- D90: +2.25
- D180: +4.5
- D270: +6.75

Tutorialを含む総SSR取得回数期待:
| Day | Expected SSR acquisitions |
|---:|---:|
| 7 | 2.6前後 |
| 30 | 7.8前後 |
| 90 | 21.3前後 |
| 180 | 41.5前後 |
| 270 | 61.8前後 |

重要:
これは「異なるSSR数」ではなくDuplicateを含む取得回数。

## 4. SSR5人Party形成

SSR10体equal weightの場合の異なるSSR保有数期待値概算:
| Day | Distinct SSR expected |
|---:|---:|
| 7 | 約2.3 |
| 30 | 約5.4 |
| 90 | 約8.8 |
| 180 | 約9.8 |
| 270 | 約10.0 |

したがってActive F2Pは、
**D30前後でSSR5人Partyが自然成立する可能性が高い。**

これは望ましい。

初期:
「SSRを5人揃える」
↓
中期:
「推し/編成に合うSSRへ入替」
↓
長期:
「Duplicate Awakening / Skill / Equipment完成」

へ目的が移行する。

## 5. 恒久Normal無料の意味

毎日無料Character10連が恒久である以上、
長期Monetizationを「SSR Characterを1体持っていない状態」に依存させてはいけない。

課金価値は:
- 欲しいSSRを早く取る
- Duplicateで覚醒を早める
- Special/PickupでTargetingする
- Exclusive Skill/Equipment
- 時短/Resource

へ置く。

これはGAME03の長期育成設計と整合する。

## 6. 推しSSR Duplicate期待

特定SSR1体について、Normal equal-weightなら:
1 pullで対象SSR = 2% / 10 = **0.2%**

Character Normal10/day:
対象SSR期待Duplicate:
- D30: 0.6
- D90: 1.8
- D180: 3.6
- D270: 5.4

Special Character:
SSR5%、10体equalなら対象=0.5%/pull。
Ticket15/月:
- 月0.075
- D90 0.225
- D270 0.675

つまりTarget SSRのF2P自然Duplicate期待:
| Day | Expected target copies after initial acquisition |
|---:|---:|
| 30 | 約0.7 |
| 90 | 約2.0 |
| 180 | 約4.1 |
| 270 | 約6.1 |

Special PickupがないStandard状態の概算。

## 7. Awakening必要量のProduction候補

D90 +3 / D240〜300 +5を成立させるため、
Character AwakeningのCopy-equivalent costを次で監査候補とする。

| Upgrade | Required copy-equivalent | Cumulative |
|---|---:|---:|
| +0→+1 | 1 | 1 |
| +1→+2 | 1 | 2 |
| +2→+3 | 2 | 4 |
| +3→+4 | 3 | 7 |
| +4→+5 | 4 | 11 |

Total +5 = **11 copy-equivalent**。

同一SSR Duplicate:
**1 copy = 1 direct awakening copy-equivalent**
として扱う案を推奨。

以前のN/R/SR/SSR=1/2/3/4という値は「+5後の余剰Duplicate→汎用覚醒資源変換」等の別conversion languageとして分離し、
同一Character Duplicateの直接覚醒量と混同しない。

## 8. D90 +3検証

Target SSRを既に1体所有している前提。

D90自然Duplicate期待:
約2.0 copies。

覚醒の書:
最低1/月 ×3 = 約3 equivalent。

合計:
約5 equivalent。

+3必要:
4 equivalent。

したがって平均的には
**D90前後で推しSSR+3が成立可能。**

RandomnessによりDuplicate 0〜1のユーザーもいるため、
Achievement/Event/選択的な覚醒の書供給で下振れ救済する。

## 9. +5 8〜10ヶ月検証

D270:
自然Target Duplicate期待 ≈6.1。

覚醒の書:
1/月×9 = 9。

合計期待:
約15.1 equivalent。

+5必要11。

平均では8〜10ヶ月より早くなる可能性がある。

ただし覚醒の書は:
- 複数SSRへ分散
- Party5体へ使用
- Event/Achievement以外の固定供給を絞る

ため、推し1体へ全投入するユーザーだけが早く完成する。

これは「推し集中なら+5を早められる」選択として許容可能。

より厳密に8〜10ヶ月へ寄せる場合、
覚醒の書固定供給を **2ヶ月に1冊程度** に下げる案がある。

## 10. 推奨修正

覚醒の書Login Day30固定1冊/月は、
恒久Normal10連と組み合わせるとやや多い。

Production推奨:
- Login Day30: **覚醒の書の欠片/交換進捗** または隔月相当
- 固定F2P: **0.5〜0.75冊/月**
- Achievement/Eventを加え平均 **0.75〜1.0冊/月**
- Duplicateが主供給

これなら:
- D90 +3を下振れ救済込みで狙える
- +5を長期目標として残しやすい

## 11. Party全体の完成

SSR5体がD30前後で揃っても、
Party完成ではない。

5体Partyには:
- Character Awakening
- Character Level
- Skill 30枠
- Equipment 35枠
- Skill Awakening
- Equipment Level/LB

が必要。

したがってCharacter SSR所持を比較的早く開放しても、
6〜8ヶ月Party実用完成Contractは維持できる。

むしろ「使いたいSSRを持っていない」期間を長くするより、
SSRを揃えて育成へ移行させる方が本作に適する。

## 12. Skill Normal無料の影響

10/day = 300/month。

Normal Skill Pool50。
SSR2%なら:
- SSR Skill約6/月
- SR約39/月
- R約90/月
- N約165/月

Duplicate Point供給が非常に大きい。

したがってSkill Manual 45〜60/月だけでなく、
**Normal Skill Duplicate Pointを必ずSkill完成速度Simulationへ含める必要がある。**

ManualだけでBalanceを取るとSkillが想定より速く完成する。

次のSupply横断監査で再計算必須。

## 13. Equipment Normal無料の影響

10/day = 300/month。

SSR2%:
SSR Equipment約6/月。

EquipmentはDuplicateを別Instance保持できるため、
Character/Skillより単純な「全部LB素材化」にはならない。

それでもN/R/SR大量DuplicateがLB Point sourceになるため、
Equipment LB 65〜100 point/月という以前の素材供給に加えて
**Gacha Duplicate由来Point**を含める必要がある。

ここも完成速度が速すぎる可能性あり。

## 14. Special UI — プレオープン

プレオープン開始時からSpecial Gacha UIを表示。

状態:
**LOCKED / 本リリースで解放**

必須表示:
- Character / Skill / Equipment Special Banner
- 所持Special Ticket
- 「本リリースで解放」
- 「R以上確定」
- SSR率UP
- Exclusive排出
- 200回天井
- Ticketも天井Count対象
- 解放日時

Ticket獲得時:
Special Gacha Locked画面へCTA可能。

ユーザーに「このTicketは何に使うか」を事前認知させる。

## 15. Special解放時

本リリース:
- Locked overlay解除
- 所持Ticketを即利用可能
- `SPECIAL GACHA 解放` feedback
- R以上確定 / SSR率UP / Exclusive / 200天井を再訴求

プレオープン中に貯めたTicketを失効させない。

## 16. Diamond / Ticket

Diamond free supply:
300〜500/月候補を維持。

Special Ticket:
10〜20/月候補。

プレオープン前配布Ticketも通常Inventoryへ保存し、
Special解放後そのまま使用。

## 17. Monetization Interpretation

恒久Normal無料30 pulls/dayは強いが、
課金を:
「何も持っていないから引く」
から
「狙ったものを早く完成させる」
へ移す。

Specialの価値:
- Targeting
- higher SSR rate
- Exclusive
- R以上
- Spark
- Pickup

Normal無料との差を明確にする必要がある。

## 18. Acceptance

1. Tutorial SSR1 guaranteed
2. Character Normal10/day permanent
3. Skill Normal10/day permanent
4. Equipment Normal10/day permanent
5. D7 SSR ownership distribution simulation
6. D30 distinct SSR simulation
7. D90 target duplicate simulation
8. D90 +3 achievable target
9. +5 remains long-term
10. Skill duplicate point simulation
11. Equipment duplicate point simulation
12. Special visible before release
13. Special locked before release
14. Ticket visible while locked
15. release datetime visible
16. R以上確定訴求
17. SSR率UP訴求
18. 200 spark訴求
19. pre-open Ticket persists
20. release unlock atomic

## 19. 監査結論

### 問題なし
- Tutorial SSR1 + D7 Normal70 pullsで「SSR1 + 追加1〜3体」の想定
- D30前後でSSR5人Partyへ到達する構造
- Character所持後に育成が主目的へ移る設計
- Special Locked UI / Ticket事前配布

### 要修正
- Login覚醒の書1/月は恒久無料Character10連と合わせると供給過多の可能性
- Skill Manual供給はSkill Duplicateを含め再計算
- Equipment LB素材供給もEquipment Duplicateを含め再計算

次工程では **Skill / Equipment Duplicate込みの月間育成Supply横断Simulation** を行い、
Manual/LB素材の配布量を最終調整する。
