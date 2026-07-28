const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const publicFramesDir = path.join(__dirname, '../public/frames');
const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';

if (!fs.existsSync(publicFramesDir)) {
  fs.mkdirSync(publicFramesDir, { recursive: true });
}

// 虹色レインボーグラデーション色計算
function getRainbowColor(t) {
  const angle = t * 2 * Math.PI;
  const r = Math.floor(128 + 127 * Math.sin(angle));
  const g = Math.floor(128 + 127 * Math.sin(angle + (2 * Math.PI / 3)));
  const b = Math.floor(128 + 127 * Math.sin(angle + (4 * Math.PI / 3)));
  return { r, g, b };
}

// 立体的な金属シェーディング計算 (ハイライト ＆ 陰影)
function getShadedColor(baseColor, factor) {
  return {
    r: Math.min(255, Math.max(0, Math.floor(baseColor.r * factor))),
    g: Math.min(255, Math.max(0, Math.floor(baseColor.g * factor))),
    b: Math.min(255, Math.max(0, Math.floor(baseColor.b * factor)))
  };
}

function getColorForRarity(rarity, x, y, width, height) {
  if (rarity === 'N') {
    return { r: 140, g: 145, b: 155 }; // ダークスチール
  } else if (rarity === 'R') {
    return { r: 212, g: 136, b: 59 }; // ブロンズ
  } else if (rarity === 'SR') {
    return { r: 0, g: 215, b: 255 }; // シアン
  } else if (rarity === 'SSR') {
    const cx = width / 2;
    const cy = height / 2;
    let angle = Math.atan2(y - cy, x - cx);
    let t = (angle + Math.PI) / (2 * Math.PI);
    return getRainbowColor(t);
  }
  return { r: 200, g: 200, b: 200 };
}

function drawDesignedFrame(width, height, rarity, isTransparent) {
  const image = new Jimp({ width, height, color: 0x00FF00FF });

  const frameWidth = 14; // スタイリッシュで細い枠幅
  const ringCx = 48;
  const ringCy = 48;
  const ringR = 32; // 左上属性球リング
  const innerRadius = 10; // 内側の角丸R

  image.scan(0, 0, width, height, function (x, y, idx) {
    const distToRing = Math.hypot(x - ringCx, y - ringCy);

    // 外枠内側判定
    const isInsideOuterBox = (x >= 0 && x < width && y >= 0 && y < height);
    
    // カード描画領域（内側）の判定（角丸Rを含む）
    const innerLeft = frameWidth;
    const innerRight = width - frameWidth;
    const innerTop = frameWidth;
    const innerBottom = height - frameWidth;

    let isInnerCardArea = false;
    if (x >= innerLeft && x < innerRight && y >= innerTop && y < innerBottom) {
      // 四隅の角丸チェック
      let cornerDist = 0;
      if (x < innerLeft + innerRadius && y < innerTop + innerRadius) {
        cornerDist = Math.hypot(x - (innerLeft + innerRadius), y - (innerTop + innerRadius));
      } else if (x >= innerRight - innerRadius && y < innerTop + innerRadius) {
        cornerDist = Math.hypot(x - (innerRight - innerRadius - 1), y - (innerTop + innerRadius));
      } else if (x < innerLeft + innerRadius && y >= innerBottom - innerRadius) {
        cornerDist = Math.hypot(x - (innerLeft + innerRadius), y - (innerBottom - innerRadius - 1));
      } else if (x >= innerRight - innerRadius && y >= innerBottom - innerRadius) {
        cornerDist = Math.hypot(x - (innerRight - innerRadius - 1), y - (innerBottom - innerRadius - 1));
      }
      if (cornerDist <= innerRadius) {
        isInnerCardArea = true;
      }
    }

    // 左上属性リング判定
    const isRingArea = (distToRing >= ringR - 6 && distToRing <= ringR);
    const isInsideRingSlot = (distToRing < ringR - 6);

    if (isInsideRingSlot || isInnerCardArea) {
      // イラスト表示領域（完全透明）
      if (isTransparent) {
        this.bitmap.data[idx + 3] = 0;
      } else {
        this.bitmap.data[idx + 0] = 0;
        this.bitmap.data[idx + 1] = 255;
        this.bitmap.data[idx + 2] = 0;
        this.bitmap.data[idx + 3] = 255;
      }
    } else if (isRingArea) {
      // 左上リングの3Dスチールベゼル描画
      const ringFactor = 1.0 + 0.3 * Math.cos(distToRing);
      const ringBase = { r: 210, g: 215, b: 225 };
      const shaded = getShadedColor(ringBase, ringFactor);
      this.bitmap.data[idx + 0] = shaded.r;
      this.bitmap.data[idx + 1] = shaded.g;
      this.bitmap.data[idx + 2] = shaded.b;
      this.bitmap.data[idx + 3] = 255;
    } else if (isInsideOuterBox) {
      // メイン枠線の3Dメタル仕上げ（内側シャドウ＆光沢）
      const baseColor = getColorForRarity(rarity, x, y, width, height);

      // 外縁部ハイライト / 内縁部シャドウの立体計算
      let edgeDist = Math.min(x, width - 1 - x, y, height - 1 - y);
      let factor = 1.0;
      if (edgeDist === 0) factor = 1.4; // 一番外側の金属輝き
      else if (edgeDist === 1) factor = 1.25;
      else if (edgeDist >= frameWidth - 2) factor = 0.75; // 内側影シャドウ

      const shaded = getShadedColor(baseColor, factor);
      this.bitmap.data[idx + 0] = shaded.r;
      this.bitmap.data[idx + 1] = shaded.g;
      this.bitmap.data[idx + 2] = shaded.b;
      this.bitmap.data[idx + 3] = 255;
    }
  });

  return image;
}

async function generateAllDesignedFrames() {
  const rarities = ['N', 'R', 'SR', 'SSR'];

  console.log('Generating high-end 3D metallic designed frames...');

  // 1. 正方形フレーム (512x512)
  for (const rarity of rarities) {
    const name = `sq_${rarity.toLowerCase()}`;
    const rawPath = path.join(brainDir, `${name}_raw.jpg`);
    const transparentPath = path.join(publicFramesDir, `${name}.png`);
    const artifactPath = path.join(brainDir, `${name}.png`);

    const rawImg = drawDesignedFrame(512, 512, rarity, false);
    await rawImg.write(rawPath);

    const transImg = drawDesignedFrame(512, 512, rarity, true);
    await transImg.write(transparentPath);
    await transImg.write(artifactPath);
    console.log(`Generated 3D designed 1:1 frame [${rarity}]: ${transparentPath}`);
  }

  // 2. バトル縦型スリムフレーム (256x512)
  for (const rarity of rarities) {
    const name = `card_${rarity.toLowerCase()}`;
    const rawPath = path.join(brainDir, `${name}_raw.jpg`);
    const transparentPath = path.join(publicFramesDir, `${name}.png`);
    const artifactPath = path.join(brainDir, `${name}.png`);

    const rawImg = drawDesignedFrame(256, 512, rarity, false);
    await rawImg.write(rawPath);

    const transImg = drawDesignedFrame(256, 512, rarity, true);
    await transImg.write(transparentPath);
    await transImg.write(artifactPath);
    console.log(`Generated 3D designed 1:2 frame [${rarity}]: ${transparentPath}`);
  }

  console.log('All 8 high-end designed frames generated successfully!');
}

generateAllDesignedFrames().catch(err => {
  console.error('Error generating designed frames:', err);
  process.exit(1);
});
