# 【TRIBE: NEON REIGN】全60キャラクター一元管理マスタ仕様書 (Characters Master List)

本作『TRIBE: NEON REIGN』に登場する**全60キャラクターの確定マスタ情報**（ID、日本語名、英名、二つ名/肩書、所属拠点、アライメント、レアリティ、成長パターン、画像アセットパス、ビジュアルプロンプト）の一覧仕様書です。

全キャラクター画像は本仕様書に基づき、緑背景 (`solid chroma key green background`) で画像生成し、`scratch/chromakey.js` による透過処理を経て `public/` へ配置されます。

---

## 1. 全60キャラクターのマスタ定義一覧

### ① SSR キャラクター (6名: 主要リーダー ＆ 幹部)

| ID | 日本語名 | 英名 | 二つ名 / 肩書 | 拠点 | 属性 | レア | 成長パターン | 立ち絵ファイルパス (`public/`) | ビジュアルプロンプト特徴 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `11111111-...` | **レイジ** | reiji | 歌舞伎町の覇王 | 新宿 | 秩序 | **SSR** | BALANCED | `/reiji_transparent_asset.png` | japanese male outlaw leader, sleek matte black tactical suit, sharp gaze, neon background |
| `33333333-...` | **ルイ** | rui | 電気街の女王 | 秋葉原 | 混沌 | **SSR** | SPEEDSTER | `/rui_transparent_asset.png` | japanese female hacker leader, stylish streetwear, bob hair, confident smirk |
| `22222222-...` | **チャン** | chang | 冷徹な毒蛇 | 池袋 | 悪 | **SSR** | LUCKY_STAR | `/chang_transparent_asset.png` | sharp elegant male mafia enforcer, dark suit, cold eyes, tattoos |
| `44444444-...` | **レオン** | leon | 新宿の牙 | 新宿 | 悪 | **SSR** | ATTACKER | `/leon_transparent_asset.png` | brawny male street fighter, leather jacket, scars, aggressive posture |
| `55555555-...` | **ユウキ** | yuki | 漆黒の執行者 | 新宿 | 秩序 | **SSR** | DEFENDER | `/yuki_transparent_asset.png` | cool male mercenary captain, long dark coat, calm analytical expression |
| `66666666-...` | **カイト** | kaito | 六本木の支配者 | 六本木 | 混沌 | **SSR** | BALANCED | `/kaito_transparent_asset.png` | flamboyant male club owner, matte silver suit, charismatic aura |

---

### ② SR キャラクター (14名: 精鋭構成員)

| ID | 日本語名 | 英名 | 二つ名 / 肩書 | 拠点 | 属性 | レア | 成長パターン | 立ち絵ファイルパス (`public/`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `77777777-...` | **コハル** | koharu | スピードスター | 川崎 | 正義 | **SR** | SPEEDSTER | `/koharu_transparent_asset.png` |
| `99999999-...` | **サクラ** | sakura | 紅い暗殺者 | 横浜 | 悪 | **SR** | ATTACKER | `/sakura_transparent_asset.png` |
| `a0000000-...009` | **構成員_009** | member_009 | 歌舞伎町のスカウト | 新宿 | 正義 | **SR** | BALANCED | `/member_009_transparent_asset.png` |
| `a0000000-...010` | **構成員_010** | member_010 | 渋谷のディーラー | 渋谷 | 悪 | **SR** | HP_TANK | `/member_010_transparent_asset.png` |
| `a0000000-...011` | **構成員_011** | member_011 | 池袋のヒットマン | 池袋 | 秩序 | **SR** | ATTACKER | `/member_011_transparent_asset.png` |
| `a0000000-...012` | **構成員_012** | member_012 | 六本木の用心棒 | 六本木 | 混沌 | **SR** | DEFENDER | `/member_012_transparent_asset.png` |
| `a0000000-...013` | **構成員_013** | member_013 | 秋葉原のハッカー | 秋葉原 | 正義 | **SR** | SPEEDSTER | `/member_013_transparent_asset.png` |
| `a0000000-...014` | **構成員_014** | member_014 | 川崎の拳闘士 | 川崎 | 悪 | **SR** | LUCKY_STAR | `/member_014_transparent_asset.png` |
| `a0000000-...015` | **構成員_015** | member_015 | 横浜の密輸人 | 横浜 | 秩序 | **SR** | BALANCED | `/member_015_transparent_asset.png` |
| `a0000000-...016` | **構成員_016** | member_016 | 新宿の回収屋 | 新宿 | 混沌 | **SR** | HP_TANK | `/member_016_transparent_asset.png` |
| `a0000000-...017` | **構成員_017** | member_017 | 渋谷のスケーター | 渋谷 | 正義 | **SR** | ATTACKER | `/member_017_transparent_asset.png` |
| `a0000000-...018` | **構成員_018** | member_018 | 池袋の用心棒 | 池袋 | 悪 | **SR** | DEFENDER | `/member_018_transparent_asset.png` |
| `a0000000-...019` | **構成員_019** | member_019 | 六本木のDJ | 六本木 | 秩序 | **SR** | SPEEDSTER | `/member_019_transparent_asset.png` |
| `a0000000-...020` | **構成員_020** | member_020 | 秋葉原のジャンク屋 | 秋葉原 | 混沌 | **SR** | LUCKY_STAR | `/member_020_transparent_asset.png` |

---

### ③ R キャラクター (20名: 構成員_021 〜 040)

| ID | 日本語名 | レア | 拠点 | 属性 | 成長パターン | 立ち絵ファイルパス (`public/`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `a0000000-...021` 〜 `040` | **構成員_021 〜 構成員_040** | **R** | 7拠点分散 | 秩序/正義/混沌/悪 | 全成長タイプ分散 | `/member_021_transparent_asset.png` 〜 `/member_040_transparent_asset.png` |

---

### ④ N キャラクター (20名: 構成員_041 〜 060)

| ID | 日本語名 | レア | 拠点 | 属性 | 成長パターン | 立ち絵ファイルパス (`public/`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `a0000000-...041` 〜 `060` | **構成員_041 〜 構成員_060** | **N** | 7拠点分散 | 秩序/正義/混沌/悪 | 全成長タイプ分散 | `/member_041_transparent_asset.png` 〜 `/member_060_transparent_asset.png` |

---

## 2. エネミー・ボスへの流用マッピング

| エネミー名 | 流用元キャラID | キャラクター名 | アセットファイルパス |
| :--- | :--- | :--- | :--- |
| **レイドボス (BOSS_001 新宿カイザー)** | `55555555-...` | **ユウキ** | `/yuki_transparent_asset.png` |
| **GvG防衛NPC (gvg_defense_0)** | `11111111-...` | **レイジ** | `/reiji_transparent_asset.png` |
| **GvG防衛NPC (gvg_defense_1)** | `33333333-...` | **ルイ** | `/rui_transparent_asset.png` |
| **GvG防衛NPC (gvg_defense_2)** | `22222222-...` | **チャン** | `/chang_transparent_asset.png` |
| **GvG防衛NPC (gvg_defense_3)** | `55555555-...` | **ユウキ** | `/yuki_transparent_asset.png` |
| **GvG防衛NPC (gvg_defense_4)** | `44444444-...` | **レオン** | `/leon_transparent_asset.png` |
| **PvPダミー (pvp_dummy_0 リュウ)** | `66666666-...` | **カイト** | `/kaito_transparent_asset.png` |
| **PvPダミー (pvp_dummy_1 カイ)** | `77777777-...` | **コハル** | `/koharu_transparent_asset.png` |
| **PvPダミー (pvp_dummy_2 シン)** | `99999999-...` | **サクラ** | `/sakura_transparent_asset.png` |
