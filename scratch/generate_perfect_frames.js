const fs = require('fs');
const path = require('path');
const { Jimp, JimpOptions } = require('jimp');

const publicFramesDir = path.join(__dirname, '../public/frames');
const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';

if (!fs.existsSync(publicFramesDir)) {
  fs.mkdirSync(publicFramesDir, { recursive: true });
}

// 虹色レインボーグラデーション色計算 (0.0 ～ 1.0)
function getRainbowColor(t) {
  // t: 0.0 -> Pink/Magenta (#FF00AA) -> Cyan (#00E5FF) -> Green (#00FF66) -> Yellow (#FFEE00) -> Red (#FF2200) -> Pink
  const angle = t * 2 * Math.PI;
  const r = Math.floor(128 + 127 * Math.sin(angle));
  const g = Math.floor(128 + 127 * Math.sin(angle + (2 * Math.PI / 3)));
  const b = Math.floor(128 + 127 * Math.sin(angle + (4 * Math.PI / 3)));
  return { r, g, b };
}

function getColorForRarity(rarity, x, y, width, height) {
  if (rarity === 'N') {
    return { r: 120, g: 125, b: 135 }; // 単色ダークスチール
  } else if (rarity === 'R') {
    return { r: 212, g: 136, b: 59 }; // 単色ブロンズ
  } else if (rarity === 'SR') {
    return { r: 0, g: 229, b: 255 }; // 単色シアン
  } else if (rarity === 'SSR') {
    // 枠の外周の位置（角度）から連続レインボーグラデーションを計算
    const cx = width / 2;
    const cy = height / 2;
    let angle = Math.atan2(y - cy, x - cx); // -PI ～ PI
    let t = (angle + Math.PI) / (2 * Math.PI); // 0.0 ～ 1.0
    return getRainbowColor(t);
  }
  return { r: 255, g: 255, b: 255 };
}

function drawPerfectFrame(width, height, rarity, isTransparent) {
  const image = new Jimp({ width, height, color: 0x00FF00FF }); // 中央純粋グリーンバック

  const borderWidth = 12; // 極細ライン枠
  const ringCx = 45;
  const ringCy = 45;
  const ringR = 30; // 左上属性球リング

  image.scan(0, 0, width, height, function (x, y, idx) {
    const distToRing = Math.hypot(x - ringCx, y - ringCy);

    // 枠線上かどうか
    const isOuterBorder = (x < borderWidth || x >= width - borderWidth || y < borderWidth || y >= height - borderWidth);
    const isRingBorder = (distToRing >= ringR - 5 && distToRing <= ringR);
    const isInsideRing = (distToRing < ringR - 5);

    if (isInsideRing) {
      if (isTransparent) {
        this.bitmap.data[idx + 3] = 0; // 透過
      } else {
        this.bitmap.data[idx + 0] = 0;
        this.bitmap.data[idx + 1] = 255;
        this.bitmap.data[idx + 2] = 0;
        this.bitmap.data[idx + 3] = 255;
      }
    } else if (isOuterBorder || isRingBorder) {
      const color = getColorForRarity(rarity, x, y, width, height);
      this.bitmap.data[idx + 0] = color.r;
      this.bitmap.data[idx + 1] = color.g;
      this.bitmap.data[idx + 2] = color.b;
      this.bitmap.data[idx + 3] = 255;
    } else {
      // 中央背景領域
      if (isTransparent) {
        this.bitmap.data[idx + 3] = 0; // 透過
      } else {
        this.bitmap.data[idx + 0] = 0;
        this.bitmap.data[idx + 1] = 255;
        this.bitmap.data[idx + 2] = 0;
        this.bitmap.data[idx + 3] = 255;
      }
    }
  });

  return image;
}

async function generateAllPerfectFrames() {
  const rarities = ['N', 'R', 'SR', 'SSR'];

  console.log('Generating perfectly dimensioned clean frames...');

  // 1. 正方形フレーム (512x512)
  for (const rarity of rarities) {
    const name = `sq_${rarity.toLowerCase()}`;
    const rawPath = path.join(brainDir, `${name}_raw.jpg`);
    const transparentPath = path.join(publicFramesDir, `${name}.png`);
    const artifactPath = path.join(brainDir, `${name}.png`);

    // 原版（緑バック）と透明版の生成
    const rawImg = drawPerfectFrame(512, 512, rarity, false);
    await rawImg.write(rawPath);

    const transImg = drawPerfectFrame(512, 512, rarity, true);
    await transImg.write(transparentPath);
    await transImg.write(artifactPath);
    console.log(`Generated perfect 1:1 frame [${rarity}]: ${transparentPath}`);
  }

  // 2. バトル縦型スリムフレーム (256x512)
  for (const rarity of rarities) {
    const name = `card_${rarity.toLowerCase()}`;
    const rawPath = path.join(brainDir, `${name}_raw.jpg`);
    const transparentPath = path.join(publicFramesDir, `${name}.png`);
    const artifactPath = path.join(brainDir, `${name}.png`);

    const rawImg = drawPerfectFrame(256, 512, rarity, false);
    await rawImg.write(rawPath);

    const transImg = drawPerfectFrame(256, 512, rarity, true);
    await transImg.write(transparentPath);
    await transImg.write(artifactPath);
    console.log(`Generated perfect 1:2 frame [${rarity}]: ${transparentPath}`);
  }

  console.log('All 8 perfect frames generated successfully with exact pixel alignment!');
}

generateAllPerfectFrames().catch(err => {
  console.error('Error generating perfect frames:', err);
  process.exit(1);
});
