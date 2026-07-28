const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';
const publicFramesDir = path.join(__dirname, '../public/frames');

async function generateBrightGoldSRFrame() {
  const nRawPath = path.join(brainDir, 'sq_n_v10_raw_1785227405373.jpg');

  if (!fs.existsSync(nRawPath)) {
    console.error('N raw frame not found!');
    return;
  }

  const nImage = await Jimp.read(nRawPath);
  const width = nImage.bitmap.width;
  const height = nImage.bitmap.height;

  // SR枠 (上品で明るい黄金/シャンパンゴールド) の生成
  const srRawImage = nImage.clone();
  srRawImage.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    // 緑バック領域 (#00FF00) はそのまま
    if (!(g > 90 && r < 140 && b < 140 && g > r * 1.15)) {
      // 枠線部分の輝度から明るく品のあるクリアゴールド（黄色・シャンパン金）へ色調変換
      const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
      this.bitmap.data[idx + 0] = Math.min(255, Math.floor(lum * 250 + 45)); // Red (明瞭な輝き)
      this.bitmap.data[idx + 1] = Math.min(255, Math.floor(lum * 220 + 35)); // Green (鮮やかな黄色み)
      this.bitmap.data[idx + 2] = Math.min(255, Math.floor(lum * 70 + 10));  // Blue (ブロンズとの決定的な差分)
    }
  });

  const srRawPath = path.join(brainDir, 'sq_sr_raw.jpg');
  await srRawImage.write(srRawPath);

  // SR枠の透明化 PNG
  const srTransImage = srRawImage.clone();
  srTransImage.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    if (g > 90 && r < 140 && b < 140 && g > r * 1.15) {
      this.bitmap.data[idx + 3] = 0; // alpha = 0
    }
  });

  const srOutPath = path.join(publicFramesDir, 'sq_sr.png');
  const srArtifactPath = path.join(brainDir, 'sq_sr.png');
  await srTransImage.write(srOutPath);
  await srTransImage.write(srArtifactPath);
  console.log(`Updated SR frame to BRIGHT ELEGANT GOLD: ${srOutPath}`);
}

generateBrightGoldSRFrame().catch(err => {
  console.error('Error generating Bright Gold SR frame:', err);
  process.exit(1);
});
