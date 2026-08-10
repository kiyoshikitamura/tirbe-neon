# 【TRIBE NEON】全60キャラクター完全全身立ち絵 生成AIプロンプト集（決定版）

個別キャラクター固有条件と既存60キャラクターの生成プロンプトは本書を維持する。全作品共通の画風、制作判断、Negative DirectionおよびAsset QAは`art_bible.md`を正本とする。

本ドキュメントは、放置少女スタイル等の全画面立ち絵表示（既存UI）と100%整合させるため、**すべてのキャラクターを完全な全身立ち絵 (Full Body Standing Portrait)** で定義した最新の生成AI用プロンプト集です。

全60キャラクターのアセット画像生成完了後、グラフィックの完成度・クオリティ順に SSR(10名)、SR(20名)、R(20名)、N(10名) へと後からレアリティ振分決定を行います。

---

## 🎨 1. 全キャラクター共通 全身画風ガイドライン

- **基本構図**: **頭の先から靴先までを含む完全な全身立ち絵 (Full body portrait, standing full body figure from head to toe)**
- **画風**: 3D感や実写感を排した「2Dセミリアル・ストリートアニメスタイル」。衣服のフリル/レザー質感、髪のツヤ、刺青・アクセサリの質感を高精細に表現。
- **世界観**: 未来SF/サイバーパンク表現（ホログラム等）を完全排除。リアルな現代裏社会ストリート・アウトロー（地雷系/量産型ガーリー、アウトローギア、ミリタリー）を主軸とする。
- **背景透過前提**: 背景は完全な単色グリーンバック (`isolated on a solid green screen background`)。

### 🔹 必須共通プロンプト (Common Base Prompt)
`vivid 2D anime style, (semi-realistic anime look:1.5), detailed facial features, realistic soft textures, glossy hair highlights, detailed eyes, street outlaw aesthetic, full body portrait, standing full body figure from head to toe, sharp lines, highly detailed, vivid color palette`

### ❌ 除外プロンプト (Negative Prompts)
`photorealistic, 3d render, real, fantasy, cyber, cyberpunk, cyborg, hologram, futuristic, sci-fi, blurry, bad anatomy, deformed, text, watermark, busy background, cropped legs, cropped feet, cut off feet`
