const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';
const publicFramesDir = path.join(__dirname, '../public/frames');

// 虹色レインボーグラデーション計算
function getRainbowColor(t) {
  // t: 0.0 ～ 1.0 (全周)
  const angle = t * 2 * Math.PI;
  const r = Math.floor(128 + 127 * Math.sin(angle));
  const g = Math.floor(128 + 127 * Math.sin(angle + (2 * Math.PI / 3)));
  const b = Math.floor(128 + 127 * Math.sin(angle + (4 * Math.PI / 3)));
  return { r, g, b };
}

async function generateSSRFrame() {
  const nRawPath = path.join(brainDir, 'sq_n_v10_raw_1785227405373.jpg');

  if (!fs.existsSync(nRawPath)) {
    console.error('N raw frame not found!');
    return;
  }

  console.log('Reading fixed N frame structure for SSR...');
  const nImage = await Jimp.read(nRawPath);
  const width = nImage.bitmap.width;
  const height = nImage.bitmap.height;
  const cx = width / 2;
  const cy = height / 2;

  // SSR枠 (参考写真3枚目完全準拠 鮮やか4色虹色レインボー)
  const ssrRawImage = nImage.clone();
  ssrRawImage.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    // 緑バック領域 (#00FF00) はそのまま残す
    if (!(g > 90 && r < 140 && b < 140 && g > r * 1.15)) {
      // 位置角度からシームレスレインボーグラデーションを算出
      let angle = Math.atan2(y - cy, x - cx);
      let t = (angle + Math.PI) / (2 * Math.PI);
      const rainbow = getRainbowColor(t);

      // 元の枠輝度を加味してクリアで鮮やかな虹色を発色
      const lum = ((r * 0.3 + g * 0.59 + b * 0.11) / 255) * 0.5 + 0.5;
      this.bitmap.data[idx + 0] = Math.min(255, Math.floor(rainbow.r * lum));
      this.bitmap.data[idx + 1] = Math.min(255, Math.floor(rainbow.g * lum));
      this.bitmap.data[idx + 2] = Math.min(255, Math.floor(rainbow.b * lum));
    }
  });

  const ssrRawPath = path.join(brainDir, 'sq_ssr_raw.jpg');
  await ssrRawImage.write(ssrRawPath);

  // SSR枠の透明化 PNG
  const ssrTransImage = ssrRawImage.clone();
  ssrTransImage.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    if (g > 90 && r < 140 && b < 140 && g > r * 1.15) {
      this.bitmap.data[idx + 3] = 0; // alpha = 0
    }
  });

  const ssrOutPath = path.join(publicFramesDir, 'sq_ssr.png');
  const ssrArtifactPath = path.join(brainDir, 'sq_ssr.png');
  await ssrTransImage.write(ssrOutPath);
  await ssrTransImage.write(ssrArtifactPath);
  console.log(`Saved SSR Rainbow frame: ${ssrOutPath}`);
}

generateSSRFrame().catch(err => {
  console.error('Error generating SSR frame:', err);
  process.exit(1);
});
