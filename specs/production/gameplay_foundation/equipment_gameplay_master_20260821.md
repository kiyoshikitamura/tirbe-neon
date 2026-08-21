# TRIBE NEON — Equipment Gameplay Master
Version: 2026-08-21
Status: PRODUCTION FREEZE CANDIDATE

> Equipment Gameplay新正本候補。旧assets_equipments.mdのID/名称/Creativeは可能な限り維持するが、旧AP/Timeline/回避/Reflect/旧Rarity/旧Stat値はProduction Gameplayでは使用しない。

## Core
170 total. Slots = WEAPON×2 / HEAD / BODY / LEGS / ACCESSORY×2.

|Category|N|R|SR|SSR|Total|
|---|---:|---:|---:|---:|---:|
|WEAPON|8|14|18|10|50|
|HEAD|5|6|6|3|20|
|BODY|6|9|10|5|30|
|LEGS|5|6|6|3|20|
|ACCESSORY|11|15|15|9|50|

SSR = Generic20 + Exclusive10.
Exclusive: Weapon ゴウ/ケンゴ/コハル/レオ; Head ミヤビ; Body レイジ/ミオ; Legs アゲハ; Accessory カレン/カエデ.

Limit Break +0〜+10; flat stat +4%/step; +10=+40%. Fixed options unlock +3/+5/+10. Random optionなし.
Cost curve 1/1/2/2/2/3/3/3/4/4 = 25.
Duplicateは別Instance保持。不要変換価値 N1/R2/SR3/SSR4.

N/R passiveなし; SR 0〜1 passive; Generic SSR 1 passive; Exclusive SSR 1 passive/signature.
Equipment % passiveはCharacter Statのみを基礎にしEquipment Flatを増幅しない。同Effect Groupは最大値1件のみ。


# WEAPON 50 — FIXED
|ID|Rarity/Binding|Name|ATK|Secondary|Effect|
|---|---|---|---:|---|---|
|WEAPON_001|N|ストリートナイフ|900|—|—|
|WEAPON_002|N|9mmハンドガン|1000|—|—|
|WEAPON_003|N|金属バット|1100|—|—|
|WEAPON_004|N|サバイバルマチェテ|1200|SPD-15|—|
|WEAPON_005|N|特殊警棒|950|DEF+200|—|
|WEAPON_006|N|折りたたみカミソリ|850|LUK+3|—|
|WEAPON_007|N|鉄パイプ|1150|—|—|
|WEAPON_008|N|メリケンサック|900|SPD+30|—|
|WEAPON_009|R|錆びたバール|1500|SPD-20|—|
|WEAPON_010|R|バスターマグナム|1900|SPD-35|—|
|WEAPON_011|R|ダガー|1450|LUK+4|—|
|WEAPON_012|R|カスタムピストル|1550|SPD+45|—|
|WEAPON_013|R|ソウドオフ・ショットガン|1850|SPD-30|—|
|WEAPON_014|R|コンバットナイフ|1400|LUK+5|—|
|WEAPON_015|R|電撃警棒|1350|SPD+55|—|
|WEAPON_016|R|消音サブマシンガン|1650|SPD+30|—|
|WEAPON_017|R|ヘヴィスレッジハマー|2000|SPD-60|—|
|WEAPON_018|R|カスタムバタフライ|1400|LUK+6|—|
|WEAPON_019|R|ワイヤーソー|1500|SPD+40|—|
|WEAPON_020|R|競技用コンポジットボウ|1600|LUK+3|—|
|WEAPON_021|R|チタンナックルクロー|1450|SPD+60|—|
|WEAPON_022|R|オートマチックマグナム|1850|SPD-35|—|
|WEAPON_023|SR|スタンアサシンダガー|2400|LUK+7|Normal STUN+8%|
|WEAPON_024|SR|消音サプレッサーSMG|2500|SPD+90|SPD+8%|
|WEAPON_025|SR|インダストリアル・デモリッシャー|3100|SPD-50|Ignore DEF12%|
|WEAPON_026|SR|仕込み日本刀『黒曜』|2700|LUK+8|Crit Rate10%|
|WEAPON_027|SR|アサルトライフル|2850|—|ATK+8%|
|WEAPON_028|SR|高周波ブレード|2600|LUK+9|Lifesteal8%|
|WEAPON_029|SR|化学注入式ダガー|2350|LUK+11|Poison chance15%|
|WEAPON_030|SR|散弾銃『レイザー』|2800|SPD-30|DEF DOWN success+10pt|
|WEAPON_031|SR|ヘヴィリボルバー『コフィン』|2950|LUK+6|HP<30% ATK+15%|
|WEAPON_032|SR|デュアルカスタムピストル|2500|SPD+100|SPD+10%|
|WEAPON_033|SR|スタン警棒カスタム|2300|DEF+800|DEF+12%|
|WEAPON_034|SR|アサシンマチェテ|2650|LUK+9|Crit Damage18%|
|WEAPON_035|SR|コンパクトサブピストル|2450|SPD+95|Battle Start SPD12%/2T|
|WEAPON_036|SR|カタナ『影打ち』|2700|LUK+7|Crit Rate8%|
|WEAPON_037|SR|消音スナイパーライフル|3050|SPD-45|Crit Rate12%|
|WEAPON_038|SR|スチールハンドクロー|2400|SPD+85|Normal REMOVE_BUFF12%|
|WEAPON_039|SR|サイレントスチール弓|2550|LUK+10|Normal SILENCE12%|
|WEAPON_040|SR|変形蛇腹刃|2750|SPD+45|Normal Damage10%|
|WEAPON_041|SSR Generic|カービンライフル|3600|DEF+1100|HP+10%|
|WEAPON_042|SSR Generic|アイアンナックル『阿修羅』|3750|SPD+110|Debuffed ATK+15%|
|WEAPON_043|SSR Generic|デス・バイパー|4150|LUK+12|Crit Damage25%|
|WEAPON_044|SSR Generic|サイバー・カタナ『電光石火』|3650|SPD+160|SPD+12%|
|WEAPON_045|SSR Generic|ショットガン『終末の鐘』|4500|SPD-65|Normal Damage18%|
|WEAPON_046|SSR Generic|インゴット・ファング|4000|LUK+14|Crit Rate15%|
|WEAPON_047|SSR ゴウ|レヴ・イグニッション|4500|LUK+8|First Kill→ATK18%/3T|
|WEAPON_048|SSR レオ|サイバーデッキ・ブレード|3800|SPD+170|First Skill→SPD18%/3T|
|WEAPON_049|SSR ケンゴ|毒蛇の黒刃|4200|LUK+10|First Skill→Lifesteal15%/3T|
|WEAPON_050|SSR コハル|支配者の鉄扇|3600|DEF+1600|HP<40%→DEF25%/3T|


# HEAD 20 — FIXED
|ID|Rarity/Binding|Name|HP|Secondary|Effect|
|---|---|---|---:|---|---|
|HEAD_001|N|ストリートキャップ|3500|—|—|
|HEAD_002|N|パンクバンダナ|3200|SPD+20|—|
|HEAD_003|N|ニットキャップ|3700|DEF+150|—|
|HEAD_004|N|ワークキャップ|4000|—|—|
|HEAD_005|N|サングラス|3300|LUK+3|—|
|HEAD_006|R|ハッカーヘッドセット|5000|SPD+40|—|
|HEAD_007|R|マフィアフェドラ|5400|LUK+4|—|
|HEAD_008|R|防毒マスク|6200|—|—|
|HEAD_009|R|カーボンライダーヘルメット|6500|DEF+500|—|
|HEAD_010|R|アンティークゴーグル|5200|LUK+5|—|
|HEAD_011|R|バリスティックヘルメット|7000|DEF+650|—|
|HEAD_012|SR|マルチナイトビジョンゴーグル|8500|LUK+7|Blind Resist15%|
|HEAD_013|SR|重工業プロテクト溶接マスク|9500|DEF+700|Blind Resist25%|
|HEAD_014|SR|バリスティックフェイスシールド|10500|DEF+1000|Status Resist12%|
|HEAD_015|SR|サイバースマートグラス|8200|SPD+90|SPD+8%|
|HEAD_016|SR|隠密用アサシンフード|8800|LUK+6|Silence Resist15%|
|HEAD_017|SR|サイバー・バイザー『千里眼』|8500|LUK+8/SPD+50|Crit Rate10%|
|HEAD_018|SSR Generic|ヘルメット『防塁』|14000|DEF+1800|DR8%|
|HEAD_019|SSR Generic|支配者のモノクル|11500|LUK+12|Status Resist18%|
|HEAD_020|SSR ミヤビ|艶花の黒簪|10500|SPD+130/LUK+12|First Status→Status Resist25%/3T|


# BODY 30 — FIXED
|ID|Rarity/Binding|Name|HP|DEF|Secondary/Effect|
|---|---|---|---:|---:|---|
|BODY_001|N|ウインドブレーカー|4000|500|—|
|BODY_002|N|デニムベスト|4400|550|—|
|BODY_003|N|作業用つなぎ|4600|600|—|
|BODY_004|N|サテンブルゾン|4200|500|SPD+15|
|BODY_005|N|レザージャケット|5000|700|—|
|BODY_006|N|ルーズサイズフーディ|5500|450|—|
|BODY_007|R|ブランドパーカー|7000|950|—|
|BODY_008|R|ロングレザーコート|7500|1100|—|
|BODY_009|R|ダブルライダース|7200|1250|—|
|BODY_010|R|インナーシャツ|8000|850|SPD+25|
|BODY_011|R|ワークデニムジャケット|7600|1050|—|
|BODY_012|R|プロテクトパファーベスト|8300|1150|—|
|BODY_013|R|フライトジャケット|7800|1200|—|
|BODY_014|R|防弾ベスト|9000|1500|—|
|BODY_015|R|アサシンテックウェアコート|7500|900|SPD+50|
|BODY_016|SR|強化耐衝撃重装アーマー|13500|2400|SPD-50 / HP10%|
|BODY_017|SR|ナノファイバー防刃アウター|11000|1850|Status Resist12%|
|BODY_018|SR|防弾ダブルスーツジャケット|10500|1700|LUK+6 / DEF10%|
|BODY_019|SR|パンクスタッズレザーライダース|10000|2000|DR5%|
|BODY_020|SR|重作業用外骨格ベスト|10000|2150|ATK+500 / ATK8%|
|BODY_021|SR|ウインドブレーカー・カスタム|9500|1550|SPD+75 / SPD8%|
|BODY_022|SR|高級ウールチェスターコート|11500|1650|LUK+7 / Status Resist15%|
|BODY_023|SR|サイバーベスト『盾壁』|13000|2300|DR7%|
|BODY_024|SR|ナノメッシュ・ステルススーツ|10000|1500|SPD+90 / Silence Resist15%|
|BODY_025|SR|ヴェルヴェット・コート|12000|1800|Healing Received12%|
|BODY_026|SSR Generic|覇王のライダース|16000|3000|ATK+650 / DEF15%|
|BODY_027|SSR Generic|蛇紋のシルクシャツ|14000|2500|LUK+12 / Status Resist20%|
|BODY_028|SSR Generic|サイバーミニドレス|13500|2300|SPD+130 / Healing Received18%|
|BODY_029|SSR ミオ|ボルドーホストスーツ|14500|2600|LUK+12 / First Status→Cleanse1+DEF15%/3T|
|BODY_030|SSR レイジ|般若刺繍のスカジャン|15500|2900|ATK+700 / HP<40%→DR10%/3T|

# LEGS 20 — FIXED
|ID|Rarity/Binding|Name|DEF|Secondary|Effect|
|---|---|---|---:|---|---|
|LEGS_001|N|テックジョガー|400|SPD+25|—|
|LEGS_002|N|ダメージジーンズ|450|LUK+2|—|
|LEGS_003|N|ワークパンツ|550|HP+2000|—|
|LEGS_004|N|ハイカットスニーカー|350|SPD+35|—|
|LEGS_005|N|コンプレッションスパッツ|400|SPD+30|—|
|LEGS_006|R|レザーライダーパンツ|850|HP+3500|—|
|LEGS_007|R|強化カーゴパンツ|900|SPD+45|—|
|LEGS_008|R|サルエルスウェット|700|SPD+60|—|
|LEGS_009|R|ストレッチスキニー|650|LUK+5|—|
|LEGS_010|R|作業用オーバーオール|1000|HP+3000|—|
|LEGS_011|R|プロテクト・コンバットパンツ|1150|HP+3500|—|
|LEGS_012|SR|強化スチールトゥーブーツ|1500|SPD+90|Normal Damage8%|
|LEGS_013|SR|ナノカーボン・ランニングスパッツ|1300|SPD+130|SPD8%|
|LEGS_014|SR|ヘヴィタクティカルグリーブ|2000|HP+6000/SPD-30|DEF10%|
|LEGS_015|SR|高通気テックメッシュパンツ|1400|SPD+110|Status Resist12%|
|LEGS_016|SR|スパイクスタッズレザーパンツ|1650|LUK+7|Crit Resist12%|
|LEGS_017|SR|カーボンファイバー・スニーカー『閃光』|1250|SPD+150|SPD10%|
|LEGS_018|SSR Generic|アーマードブーツ『防塁』|2800|HP+8000/SPD-40|DEF15%|
|LEGS_019|SSR Generic|スピードスター・スニーカー|1800|SPD+210|Status Resist18%|
|LEGS_020|SSR アゲハ|漆黒のアサシンロングブーツ|1700|SPD+230/LUK+10|Battle Start SPD15%/3T|

# ACCESSORY 50 — FIXED

## N/R
|ID|Rarity|Name|Flat Stat|
|---|---|---|---|
|ACCESSORY_001|N|ネオンスタッドピアス|LUK+2|
|ACCESSORY_002|N|スチールフラットリング|LUK+3|
|ACCESSORY_003|N|レザーベルトチョーカー|HP+1200|
|ACCESSORY_004|N|刻印付きドッグタグ|ATK+250|
|ACCESSORY_005|N|ラバーリストバンド|SPD+20|
|ACCESSORY_006|N|シルバーチェーンネックレス|LUK+4|
|ACCESSORY_007|N|真鍮アームバングル|DEF+200|
|ACCESSORY_008|N|ネオンラバーキーホルダー|LUK+3/SPD+10|
|ACCESSORY_009|N|スカルピンバッジ|HP+1600|
|ACCESSORY_010|N|編み込み革ブレス|DEF+150/LUK+2|
|ACCESSORY_011|N|ブランドクロノグラフ|SPD+25/HP+800|
|ACCESSORY_012|R|極太ゴールドチェーン|LUK+6|
|ACCESSORY_013|R|スクエア印台リング|ATK+450/LUK+4|
|ACCESSORY_014|R|チタンチョーカー|DEF+400/SPD+25|
|ACCESSORY_015|R|スパイクスタッズリストバンド|ATK+400/DEF+300|
|ACCESSORY_016|R|カミソリ刃ペンダント|ATK+600|
|ACCESSORY_017|R|ギャンブラーダイス|LUK+9|
|ACCESSORY_018|R|ユーティリティベルト|DEF+550/HP+1500|
|ACCESSORY_019|R|シルバーゴシックスカルリング|ATK+400/LUK+6|
|ACCESSORY_020|R|スタッドイヤーカフ|SPD+55|
|ACCESSORY_021|R|スチールウォレットチェーン|LUK+8|
|ACCESSORY_022|R|ゴシッククロスペンダント|HP+2500/DEF+250|
|ACCESSORY_023|R|スマートフィットトラッカー|SPD+60/HP+1500|
|ACCESSORY_024|R|コブラバングル|ATK+450/LUK+6|
|ACCESSORY_025|R|弾丸シェルネックレス|ATK+700|
|ACCESSORY_026|R|アンティークロケットペンダント|HP+3000/LUK+5|

## SR/SSR
|ID|Rarity/Binding|Name|Flat Stat|Effect|
|---|---|---|---|---|
|ACCESSORY_027|SR|プラチナ印台リング|ATK+850/LUK+8|Healing Received10%|
|ACCESSORY_028|SR|ホルスター|SPD+80/DEF+500|SPD8%|
|ACCESSORY_029|SR|ブルーサファイアリング|LUK+12/SPD+50|Crit Rate8%|
|ACCESSORY_030|SR|極太クロームチェーン|ATK+950/LUK+7|ATK6%|
|ACCESSORY_031|SR|死神のシルバーチャーム|HP+5000|Crit Resist12%|
|ACCESSORY_032|SR|百合の刻印ネックレス|ATK+1050|Status Chance10%|
|ACCESSORY_033|SR|ヘヴィスパイクチョーカー|ATK+600/DEF+750|DEF8%|
|ACCESSORY_034|SR|ダイヤモンドアンカーリング|LUK+13/HP+3000|Status Resist12%|
|ACCESSORY_035|SR|原石ターコイズバングル|DEF+900/LUK+7|Healing Received10%|
|ACCESSORY_036|SR|天然水晶チャーム|HP+4500/LUK+7|Healing Done12%|
|ACCESSORY_037|SR|スマートウォッチPRO|SPD+110/HP+2500|SPD10%|
|ACCESSORY_038|SR|黒のトライバルシール|ATK+1100/DEF-200|ATK8%|
|ACCESSORY_039|SR|鉄製シャックルブレス|DEF+850/LUK+7|Status Resist10%|
|ACCESSORY_040|SR|ルビーゴールドチャーム|ATK+1000|Crit Damage15%|
|ACCESSORY_041|SR|強化カーボン戦闘グローブ|ATK+700/DEF+650/SPD+30|Normal Damage8%|
|ACCESSORY_042|SSR Generic|スネークアンクレット|SPD+170/LUK+12|SPD12%|
|ACCESSORY_043|SSR Generic|スチールスカルキーチェーン|LUK+20|Crit Rate12%|
|ACCESSORY_044|SSR Generic|チタンアスリートバンド|DEF+1400/HP+5000|Status Resist18%|
|ACCESSORY_045|SSR Generic|オパール襟ピンバッジ|LUK+22|Status Chance15%|
|ACCESSORY_046|SSR Generic|極道幹部の翡翠守り|HP+5000/DEF+1000|DR6%|
|ACCESSORY_047|SSR Generic|漆塗りの桜根付|SPD+130/LUK+16|Crit Damage22%|
|ACCESSORY_048|SSR Generic|ナイトジュエル|ATK+1600/LUK+12|ATK10%|
|ACCESSORY_049|SSR カレン|Production名称調整対象|LUK+25/SPD+120|First Skill→Status Chance20%/3T|
|ACCESSORY_050|SSR カエデ|Production名称調整対象|HP+6000/LUK+16|Battle Start Ally-all DEF8%/2T|

# Implementation Fields
equipment_id / display_name / rarity / category / base_stats / fixed_effect_type /
fixed_effect_value / fixed_effect_condition / lb_option_3 / lb_option_5 / lb_option_10 /
exclusive_character_id nullable / asset_path.

# Remaining before PRODUCTION FROZEN
1. +3/+5/+10の各Equipment固定Option実数値を170件分確定・転記する。
2. ACCESSORY_049/050などProduction名称調整対象をCreative正本と突合する。
3. 170件asset_pathを実Assetと照合する。
4. Legacy random_options / AP / Timeline / evasion / Reflect dependencyをRepository監査する。
