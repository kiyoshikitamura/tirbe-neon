const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';
const publicFramesDir = path.join(__dirname, '../public/frames');

if (!fs.existsSync(publicFramesDir)) {
  fs.mkdirSync(publicFramesDir, { recursive: true });
}

// 虹色レインボーグラデーション計算
function getVividRainbowColor(t) {
  const angle = t * 2 * Math.PI;
  const r = Math.floor(128 + 127 * Math.sin(angle));
  const g = Math.floor(128 + 127 * Math.sin(angle + (2 * Math.PI / 3)));
  const b = Math.floor(128 + 127 * Math.sin(angle + (4 * Math.PI / 3)));

  const max = Math.max(r, g, b);
  const factor = 255 / (max || 1);

  return {
    r: Math.min(255, Math.floor(r * factor)),
    g: Math.min(255, Math.floor(g * factor)),
    b: Math.min(255, Math.floor(b * factor))
  };
}

async function generateAllSlimBattleFrames() {
  const width = 256;  // スリム縦型幅
  const height = 512; // スリム縦型高さ
  const borderWidth = 10; // スタイリッシュな極細スリム枠幅
  const innerLineWidth = 2; // 二重線の内側ライン

  const cx = width / 2;
  const cy = height / 2;

  const rarities = ['n', 'r', 'sr', 'ssr'];

  for (const rarity of rarities) {
    console.log(`Generating slim battle frame [${rarity.toUpperCase()}]...`);

    // 背景を純ブルー (#0000FF) にして干渉ゼロで透過可能に作成
    let frameImage = new Jimp({ width, height, color: 0x0000FFFF });

    frameImage.scan(0, 0, width, height, function (x, y, idx) {
      // 外枠領域（画面いっぱいの最外周100%エッジ）
      const isOuterBorder = (x < borderWidth || x >= width - borderWidth || y < borderWidth || y >= height - borderWidth);
      
      if (isOuterBorder) {
        let rVal = 0, gVal = 0, bVal = 0;
        let lum = 1.0;

        // エッジ部分の金属ハイライト
        const edgeDist = Math.min(x, width - 1 - x, y, height - 1 - y);
        if (edgeDist === 0) lum = 1.3;
        else if (edgeDist === borderWidth - 1) lum = 0.7;

        if (rarity === 'n') {
          // N: ダークスチール
          rVal = Math.floor(140 * lum);
          gVal = Math.floor(145 * lum);
          bVal = Math.floor(155 * lum);
        } else if (rarity === 'r') {
          // R: ブロンズ
          rVal = Math.min(255, Math.floor(212 * lum));
          gVal = Math.min(255, Math.floor(136 * lum));
          bVal = Math.min(255, Math.floor(59 * lum));
        } else if (rarity === 'sr') {
          // SR: 明るいゴールド
          rVal = Math.min(255, Math.floor(250 * lum));
          gVal = Math.min(255, Math.floor(220 * lum));
          bVal = Math.min(255, Math.floor(70 * lum));
        } else if (rarity === 'ssr') {
          // SSR: 4色強発色虹色レインボー
          let angle = Math.atan2(y - cy, x - cx);
          let t = (angle + Math.PI) / (2 * Math.PI);
          const rainbow = getVividRainbowColor(t);
          rVal = Math.min(255, Math.floor(rainbow.r * lum));
          gVal = Math.min(255, Math.floor(rainbow.g * lum));
          bVal = Math.min(255, Math.floor(rainbow.b * lum));
        }

        this.bitmap.data[idx + 0] = rVal;
        this.bitmap.data[idx + 1] = gVal;
        this.bitmap.data[idx + 2] = bVal;
        this.bitmap.data[idx + 3] = 255;
      }
    });

    // 原版保存
    const rawPath = path.join(brainDir, `card_${rarity}_raw.jpg`);
    await frameImage.write(rawPath);

    // アルファ透明化処理
    const transImage = frameImage.clone();
    transImage.scan(0, 0, width, height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];

      // 純ブルー背景領域 (#0000FF) を完全アルファ透明化
      if (b > 200 && r < 50 && g < 50) {
        this.bitmap.data[idx + 3] = 0;
      }
    });

    const outPath = path.join(publicFramesDir, `card_${rarity}.png`);
    const artifactPath = path.join(brainDir, `card_${rarity}.png`);
    await transImage.write(outPath);
    await transImage.write(artifactPath);
    console.log(`Saved transparent slim battle frame: ${outPath}`);
  }

  // バトル画面6体横並びプレビュー画像の生成
  console.log('Generating 6-character battle lineup preview...');
  let battleCanvas = new Jimp({ width: 600, height: 400, color: 0x111622FF });

  const cardWidth = 80;
  const cardHeight = 160;
  const gap = 12;
  const startX = 24;
  const startY = 120;

  const lineupRarities = ['n', 'r', 'sr', 'ssr', 'sr', 'ssr'];

  for (let i = 0; i < 6; i++) {
    const rKey = lineupRarities[i];
    const framePath = path.join(publicFramesDir, `card_${rKey}.png`);
    
    // 背景カード枠内にダミーキャラクター色
    let cardSlot = new Jimp({ width: cardWidth, height: cardHeight, color: 0x334466FF });
    
    // 透過枠を重ね合わせ
    let frameImg = await Jimp.read(framePath);
    frameImg.resize({ w: cardWidth, h: cardHeight });
    cardSlot.composite(frameImg, 0, 0);

    const xPos = startX + i * (cardWidth + gap);
    battleCanvas.composite(cardSlot, xPos, startY);
  }

  const battlePreviewPath = path.join(brainDir, 'battle_lineup_preview.jpg');
  await battleCanvas.write(battlePreviewPath);
  console.log(`Saved 6-character battle lineup preview: ${battlePreviewPath}`);
}

generateAllSlimBattleFrames().catch(err => {
  console.error('Error generating slim battle frames:', err);
  process.exit(1);
});
