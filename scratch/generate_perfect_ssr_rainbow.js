const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';
const publicFramesDir = path.join(__dirname, '../public/frames');

// 高発色・超ビビッドな4色フルスペック虹色レインボー計算
function getVividRainbowColor(t) {
  // t: 0.0 ～ 1.0 (全周)
  const angle = t * 2 * Math.PI;
  // 高彩度・強発色グラデーション
  const r = Math.floor(128 + 127 * Math.sin(angle));
  const g = Math.floor(128 + 127 * Math.sin(angle + (2 * Math.PI / 3)));
  const b = Math.floor(128 + 127 * Math.sin(angle + (4 * Math.PI / 3)));

  // 彩度を最大化
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const factor = 255 / (max || 1);

  return {
    r: Math.min(255, Math.floor(r * factor)),
    g: Math.min(255, Math.floor(g * factor)),
    b: Math.min(255, Math.floor(b * factor))
  };
}

async function generatePerfectSSRRainbow() {
  const nRawPath = path.join(brainDir, 'sq_n_v10_raw_1785227405373.jpg');

  if (!fs.existsSync(nRawPath)) {
    console.error('N raw frame not found!');
    return;
  }

  console.log('Reading fixed N frame structure for Perfect Vivid SSR Rainbow...');
  const nImage = await Jimp.read(nRawPath);
  const width = nImage.bitmap.width;
  const height = nImage.bitmap.height;
  const cx = width / 2;
  const cy = height / 2;

  // 1. 原版画像生成（背景：完全純ブルー #0000FF で干渉ゼロに完全分離）
  const ssrRawImage = nImage.clone();
  ssrRawImage.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    // 背景グリーンバック領域 (#00FF00) を 純ブルー (#0000FF) に変換
    if (g > 90 && r < 140 && b < 140 && g > r * 1.15) {
      this.bitmap.data[idx + 0] = 0;   // Red
      this.bitmap.data[idx + 1] = 0;   // Green
      this.bitmap.data[idx + 2] = 255; // Blue (#0000FF)
    } else {
      // 枠線部分：位置角度から強発色ビビッドレインボーを塗布
      let angle = Math.atan2(y - cy, x - cx);
      let t = (angle + Math.PI) / (2 * Math.PI);
      const rainbow = getVividRainbowColor(t);

      // 元の二重線つや消しベゼル輝度を加味
      const lum = ((r * 0.3 + g * 0.59 + b * 0.11) / 255) * 0.4 + 0.6;
      this.bitmap.data[idx + 0] = Math.min(255, Math.floor(rainbow.r * lum));
      this.bitmap.data[idx + 1] = Math.min(255, Math.floor(rainbow.g * lum));
      this.bitmap.data[idx + 2] = Math.min(255, Math.floor(rainbow.b * lum));
    }
  });

  const ssrRawPath = path.join(brainDir, 'sq_ssr_raw.jpg');
  await ssrRawImage.write(ssrRawPath);

  // 2. 透明化処理 PNG (純ブルー #0000FF 領域のみを確実にアルファ透明化)
  const ssrTransImage = ssrRawImage.clone();
  ssrTransImage.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    // 純ブルー背景領域 (#0000FF) を完全アルファ透明化
    if (b > 200 && r < 50 && g < 50) {
      this.bitmap.data[idx + 3] = 0; // alpha = 0
    }
  });

  const ssrOutPath = path.join(publicFramesDir, 'sq_ssr.png');
  const ssrArtifactPath = path.join(brainDir, 'sq_ssr.png');
  await ssrTransImage.write(ssrOutPath);
  await ssrTransImage.write(ssrArtifactPath);
  console.log(`Saved Perfect Vivid SSR Rainbow frame: ${ssrOutPath}`);

  // 3. ルイの立ち絵＋透過チェッカーボードとの重ね合わせ検証テスト画像の生成
  const ruiPath = path.join(__dirname, '../public/rui_transparent_asset.png');
  if (fs.existsSync(ruiPath)) {
    let canvas = new Jimp({ width: 512, height: 512, color: 0xFFFFFFFF });
    // チェッカーボード描画
    for (let y = 0; y < 512; y += 16) {
      for (let x = 0; x < 512; x += 16) {
        if (((x / 16) + (y / 16)) % 2 === 1) {
          for (let py = 0; py < 16 && y + py < 512; py++) {
            for (let px = 0; px < 16 && x + px < 512; px++) {
              canvas.setPixelColor(0xD0D0D0FF, x + px, y + py);
            }
          }
        }
      }
    }
    let ruiImg = await Jimp.read(ruiPath);
    ruiImg.resize({ w: 450, h: 450 });
    canvas.composite(ruiImg, 31, 62);
    canvas.composite(ssrTransImage, 0, 0);

    const testOutPath = path.join(brainDir, 'sq_ssr_overlay_test.jpg');
    await canvas.write(testOutPath);
    console.log(`Saved Perfect Vivid SSR overlay test: ${testOutPath}`);
  }
}

generatePerfectSSRRainbow().catch(err => {
  console.error('Error generating Perfect SSR Rainbow frame:', err);
  process.exit(1);
});
