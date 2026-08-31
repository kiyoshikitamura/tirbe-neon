# Async Transition / Loading Final Acceptance — 2026-08-30

FA-001〜005を正本とし、consumer修正は再実装しない。追加物はPlaywright側のtimestamp probe、既存mock delayの利用、受入matrixのみ。Production UI／Production routeへのQA表示・導線は追加しない。

## Surface matrix

| Surface | pending paint | lock ownership | completion / result paint | unlock timing | slow-response verification |
| --- | --- | --- | --- | --- | --- |
| Global Navigation | destinationを2 RAFで採取 | なし（同期 `navigateTab`） | active surface paint | destination paint後（lockなし） | 0ms probe、各実画面へのHuman巡回 |
| Quest | CTA spinner / `data-quest-state` | operation中のみglobal blocker + action ref | patrol projection / result dialog | operation完了後 | generic `mock_rpc_delay_ms:start_patrol`、Human 0/500/1500/3000 |
| Gacha | fixed processing overlay | `GachaTab` fieldset + immediate action ref | opening gate → result paint | result authority取得後 | `gacha-asset-transition.spec.ts` が0/500/1500/3000を実測 |
| Character Growth | `character-v2-pending-surface` | shared upgrade local lock | level projection + result dialog | result paint後2 RAF | generic `mock_rpc_delay_ms:level_up_character` |
| Skill Growth | `character-v2-pending-surface` | shared upgrade local lock | limit-break projection + result dialog | mutation完了後 | generic `mock_rpc_delay_ms:limit_break_skill` |
| Equipment Growth | `character-v2-pending-surface` | shared upgrade local lock | level projection + result dialog | result paint後2 RAF | generic `mock_rpc_delay_ms:level_up_equipment` |
| Mission | disabled fieldset / spinner | mission panel local lock | authoritative CLAIMED + reward dialog | dialog paint後2 RAF | final-acceptance specで0/500/1500/3000実測 |
| Present | pending panel / spinner | inbox local lock | authoritative CLAIMED + reward dialog | bulkはdialog close後 | final-acceptance specで0/500/1500/3000実測 |
| Profile | editable section pending | profile section local lock | saved projection + completion dialog | save completion後 | generic RPC delay + Settings targeted test |
| Guild | target management cluster / editable section | privileged target clusterまたはsettings section | membership/settings projection + dialog/status | projection paint後2 RAF | `set_guild_member_role` 500ms targeted test、generic 4-delay可 |
| PvP | defense fieldset pending | defense form local lock | saved deck projection + result dialog | projection paint後2 RAF | `save_pvp_defense_deck` 500ms targeted test、generic 4-delay可 |
| Raid | CTA/dialog pending | recovery dialog action local lock | RP projection / battle setup | refreshed projection後 | generic `mock_rpc_delay_ms:use_action_resource_ticket` |
| Reward Dialog | originating surfaceのpending | originating mutation owner | canonical reward receipt paint | owner policy（bulk Presentはcloseまで） | Mission/Present slow matrixで実測 |
| Confirm Dialog | confirm action pending + disabled actions | dialog action ref | replacement result/dialog paint | Promise settleまたはreplacement paint後 | Guild privileged mutation targeted test |

## 判定 contract

- A: `tap` の次に `pending_paint` がある。
- B/F: lock中のdouble attemptを1 mutationに抑止する。
- C: local-owner surfaceでは `.outlaw-interaction-blocker` を生成しない。
- D: `unlock >= destination_paint` をtimestampで強制する。
- E: server completion後のresult/dialog paintを待ち、遅延後の孤立表示を許さない。
- G: result projectionとlocalStorage authoritative rowを同一testで照合する。

Timeline JSONはPlaywright test resultへ `async-transition-<surface>-<delay>ms.json` として添付される。

## Targeted verification result

| Contract | 0ms | 500ms | 1500ms | 3000ms | Result |
| --- | --- | --- | --- | --- | --- |
| Mission claim | PASS | PASS | PASS | PASS | pending paint → local lock → CLAIMED → reward paint → unlock |
| Present bulk claim | PASS | PASS | PASS | PASS | receipt closeまでowner lockを維持 |
| Gacha Skill | PASS | PASS | PASS | PASS | foreground processing、1 mutation |
| Gacha Equipment | PASS | PASS | PASS | PASS | foreground processing、1 mutation |

追加targeted result: Global Navigation PASS、FA-001〜005 verifier PASS、Character/Skill/Equipment hierarchy PASS、Guild privileged projection lock PASS、PvP defense projection lock PASS、Profile save authority PASS、Raid recovery confirm PASS。Full Regressionは実行していない。

## Human Acceptance 最短手順

1. PowerShellで `$env:NEXT_PUBLIC_USE_MOCK_DB='true'; $env:NEXT_PUBLIC_APP_ENV='test'; npm run build` を実行する。
2. 同じ環境変数を維持して `npm run test:e2e -- tests/e2e/async-transition-final-acceptance.spec.ts tests/e2e/gacha-asset-transition.spec.ts tests/e2e/m9x-remaining-p0.spec.ts tests/e2e/guild-phase4.spec.ts --grep "Mission|Present|response keeps|first painted|double tap|defense save locks|privileged member mutation"` を実行する。
3. `npm run start -- --hostname 127.0.0.1 --port 3100` を起動し、390×844でログインする。
4. DevTools Consoleで対象前に `localStorage.setItem('mock_rpc_delay_ms:<rpc>', '3000')` を設定する。0/500/1500/3000へ値だけ切り替える。
5. Matrix上から Quest → Gacha → Character/Skill/Equipment → Mission → Present → Profile → Guild → PvP → Raid を1回ずつ操作し、tap直後のspinner/pending、競合不可、unrelated領域、result paint前unlockなしを確認する。
6. 各mutationでdouble tapし、localStorageの対象rowが1回だけ変化すること、戻る/再訪で古いpending/resultが復活しないことを確認する。
7. Reward DialogはMission/Present、Confirm DialogはGuild権限操作で確認し、dialogが数秒後に孤立して突然現れないことを確認する。

## Remaining P1 記録欄

新規Application P1: 0件。

QA maintenanceとして、最終Home改修後にstale化していたProfile / Raid / PvP導線selectorとGacha pending accessibility assertionを現行UIへ追従した。Production修正ではない。今後P1が出た場合のみ、Surface / delay / A〜G / reproduction / owner / isolated-fix branchをここへ追記する。
