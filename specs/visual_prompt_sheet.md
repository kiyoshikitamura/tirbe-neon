# 『TRIBE: NEON REIGN』画像生成AI用プロンプト指示書（7キャラクター版）

本資料は、別スレッドの画像生成AI（Midjourney, DALL-E 3等）にそのままコピー＆ペーストして、仕様書 [visual_concept.md](file:///d:/dev/tribe-neon/specs/visual_concept.md) に完全準拠したアートアセットを生成するためのプロンプト集です。

---

## 🎨 1. 共通画風ガイドライン（必ずプロンプトに含める）

本作は、3Dレンダリングや完全な実写調を禁止しつつ、髪のツヤや衣服の立体感、ぷっくりとした涙袋などのディテールを表現する**「2Dセミリアル・ストリートアニメスタイル」**を採用します。また、立ち絵の一貫性を保つため、構図はすべてカウボーイショット（太ももから上）に統一します。

### 🔹 必須画風キーワード (Style Keywords)
`vivid 2D anime style, (semi-realistic anime look:1.5), detailed facial features, realistic soft textures, glossy hair highlights, detailed eyes, street punk aesthetic, cowboy shot, medium shot showing from thighs up, sharp lines, highly detailed, vivid color palette`

### ❌ 除外キーワード (Negative Prompts)
`photorealistic, 3d render, real, fantasy, blurry, bad anatomy, deformed, text, watermark, busy background`

---

## 👤 2. キャラクター立ち絵用プロンプト (透過用)

> [!NOTE]
> アプリ側での背景透過（クロマキー処理）の精度を最大にするため、背景は **「完全なグリーンバック (isolated on a solid green screen background)」** に統一して生成します。

### ① レイジ（Reiji）— 新宿：歌舞伎町の覇王
* **設定**: アッシュゴールドのウルフヘア、首筋の百合のタトゥー、ゴールドのチェーン。不敵な笑みを浮かべる歌舞伎町の覇王。
* **Prompt**: `vivid 2D anime style, (semi-realistic anime look:1.5), detailed facial features, realistic soft textures, glossy hair highlights, detailed eyes, a cool handsome young Japanese man with blonde short undercut hair, wearing a stylish modern black street-fashion suit with a gold watch, thin-frame glasses, showing a fearless smirk, isolated on a solid green screen background, cowboy shot, medium shot showing from thighs up, sharp lines, highly detailed, vivid color palette`

### ② ルイ（Rui）— 秋葉原：電気街の女王（情報屋）
* **設定**: ティールとピンクのインナーカラーが入ったツイン三つ編み、オーバーサイズパーカーとヘッドホンを身に纏う情報屋。
* **Prompt**: `vivid 2D anime style, (semi-realistic anime look:1.5), detailed facial features, realistic soft textures, glossy hair highlights, detailed eyes, a cool young tech-savvy Japanese woman with tech-wear aesthetics, wearing a giant oversized neon-accented black hoodie and silver headphones around her neck, short cyan hair, holding a modern smartphone, showing a confident playful grin, isolated on a solid green screen background, cowboy shot, medium shot showing from thighs up, sharp lines, highly detailed, vivid color palette`

### ③ チャン（Chang / 張）— 池袋：冷徹な毒蛇
* **設定**: シルバーのミドルヘア、首元の蛇のタトゥー、無機質な眼差しで語る中国系『華興幇』の若き武闘派。
* **Prompt**: `vivid 2D anime style, (semi-realistic anime look:1.5), detailed facial features, realistic soft textures, glossy hair highlights, detailed eyes, a cold-faced young Chinese-Japanese man with silver neck-length hair, wearing a sleek silver shirt, cool snake tattoo visible on his neck, sharp narrow cold eyes, expressionless mouth, isolated on a solid green screen background, cowboy shot, medium shot showing from thighs up, sharp lines, highly detailed, vivid color palette`

### ④ リン（Rin）— 渋谷：毒林檎
* **設定**: 猫耳フード付きのルーズな黒パーカー、チョーカー、ネオンパープルのリップが映えるストリートパンク調の少女。
* **Prompt**: `vivid 2D anime style, (semi-realistic anime look:1.5), detailed facial features, realistic soft textures, glossy hair highlights, detailed eyes, a cool young Japanese punk girl with cat-eared hood, wearing a loose oversized black hoodie and a black choker around her neck, short messy dark hair, vivid neon purple lipstick, showing a confident playful smirk, isolated on a solid green screen background, cowboy shot, medium shot showing from thighs up, sharp lines, highly detailed, vivid color palette`

### ⑤ セリカ（Serika）— 六本木：艶花の毒針
* **設定**: 背中に鮮やかな蝶のタトゥーが覗く黒のタイトドレス、ピンヒール、電子タバコを持つ妖艶なキャバクラオーナー。
* **Prompt**: `vivid 2D anime style, (semi-realistic anime look:1.5), detailed facial features, realistic soft textures, glossy hair highlights, detailed eyes, a beautiful young Japanese woman wearing a sleek black tight dress showing a colorful butterfly tattoo on her neck and back, high heels, holding a stylish electronic cigarette, showing a cool confident expression, isolated on a solid green screen background, cowboy shot, medium shot showing from thighs up, sharp lines, highly detailed, vivid color palette`

### ⑥ ゴウ（Go）— 川崎：鋼鉄の拳
* **設定**: 重厚な黒レザーのライダースベスト、腕から首にかけての激しい和彫りタトゥー、拳のメリケンサックが特徴の元地下格闘王者。
* **Prompt**: `vivid 2D anime style, (semi-realistic anime look:1.5), detailed facial features, realistic soft textures, glossy hair highlights, detailed eyes, a muscular tough young Japanese man wearing a heavy black riders leather vest, extensive traditional Japanese tattoos on his arms and neck, wearing heavy brass knuckles on his fist, showing a fierce expression, isolated on a solid green screen background, cowboy shot, medium shot showing from thighs up, sharp lines, highly detailed, vivid color palette`

### ⑦ シン（Shin）— 横浜：冷徹な提督
* **設定**: ダークネイビーのロングトレンチコート、右目の黒いシルク眼帯、黒漆塗りの仕込み杖を携える老舗マフィア『龍頭会』の若頭。
* **Prompt**: `vivid 2D anime style, (semi-realistic anime look:1.5), detailed facial features, realistic soft textures, glossy hair highlights, detailed eyes, a cool handsome young Japanese-Hong Kong mafia man wearing a dark navy long trench coat with a gold tie pin, a black silk eyepatch over his right eye, holding a sleek black sword cane, isolated on a solid green screen background, cowboy shot, medium shot showing from thighs up, sharp lines, highly detailed, vivid color palette`
