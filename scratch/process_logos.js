const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/77e207cf-862d-41e0-a8ff-5a37ff2953d0';
const redRawPath = path.join(brainDir, 'logo_red_pattern_1784222378627.png');
const blueRawPath = path.join(brainDir, 'logo_blue_pattern_1784222390303.png');

const publicDir = path.join(__dirname, '../public');

// 緑背景の透過処理
function keyGreen(image) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // 緑色の背景を完全透過にする
    if (g > 100 && r < 120 && b < 120) {
      this.bitmap.data[idx + 3] = 0;
    }
  });
  return image;
}

async function processLogos() {
  console.log('Processing logos...');

  // 保存先ディレクトリ確認
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. パターン1 (Red)
  console.log('Processing Pattern 1 (Red)...');
  // 透過前(raw)をコピー保存
  const publicRedRaw = path.join(publicDir, 'logo_red_raw.png');
  fs.copyFileSync(redRawPath, publicRedRaw);
  console.log(`Copied raw red to: ${publicRedRaw}`);

  // 透過処理
  let imgRed = await Jimp.read(redRawPath);
  imgRed = keyGreen(imgRed);
  
  // 透過後を保存
  const publicRedOut = path.join(publicDir, 'logo_red.png');
  await imgRed.write(publicRedOut);
  console.log(`Saved transparent red to: ${publicRedOut}`);

  // アーティファクトディレクトリ用にも保存 (レビュー用)
  const brainRedOut = path.join(brainDir, 'logo_red_transparent.png');
  await imgRed.write(brainRedOut);
  console.log(`Saved transparent red to brain: ${brainRedOut}`);

  // 2. パターン2 (Blue)
  console.log('Processing Pattern 2 (Blue)...');
  // 透過前(raw)をコピー保存
  const publicBlueRaw = path.join(publicDir, 'logo_blue_raw.png');
  fs.copyFileSync(blueRawPath, publicBlueRaw);
  console.log(`Copied raw blue to: ${publicBlueRaw}`);

  // 透過処理
  let imgBlue = await Jimp.read(blueRawPath);
  imgBlue = keyGreen(imgBlue);
  
  // 透過後を保存
  const publicBlueOut = path.join(publicDir, 'logo_blue.png');
  await imgBlue.write(publicBlueOut);
  console.log(`Saved transparent blue to: ${publicBlueOut}`);

  // アーティファクトディレクトリ用にも保存 (レビュー用)
  const brainBlueOut = path.join(brainDir, 'logo_blue_transparent.png');
  await imgBlue.write(brainBlueOut);
  console.log(`Saved transparent blue to brain: ${brainBlueOut}`);

  console.log('All process completed successfully.');
}

processLogos().catch(err => {
  console.error('Error during process:', err);
  process.exit(1);
});
