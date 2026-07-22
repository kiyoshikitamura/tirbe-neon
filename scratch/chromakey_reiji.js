const path = require('path');
const { Jimp } = require('jimp');

// AGENTS.md Rule 7 準拠: グリーンバック画像からクロマキー透過処理
const inputPath = path.join(__dirname, '../images/reiji_final_asset.png');
const outputPath = path.join(__dirname, '../public/reiji_transparent_asset.png');

async function chromakeyGreen() {
  console.log('Reading green screen image:', inputPath);
  const image = await Jimp.read(inputPath);
  const { width, height } = image.bitmap;
  console.log(`Image size: ${width}x${height}`);

  image.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    // 緑成分が強く、赤・青が弱い場合に透過
    // 緑チャンネルが他2チャンネルの平均よりかなり高い場合 = 緑背景
    const nonGreenAvg = (r + b) / 2;
    const greenDominance = g - nonGreenAvg;

    if (g > 70 && greenDominance > 20) {
      // 完全な緑背景: 完全透過
      if (greenDominance > 50) {
        this.bitmap.data[idx + 3] = 0;
      } else {
        // エッジ部分: グラデーション透過 (アンチエイリアス)
        const ratio = 1 - ((greenDominance - 20) / 30);
        this.bitmap.data[idx + 3] = Math.round(255 * Math.max(0, Math.min(1, ratio)));
      }
    }
  });

  await image.write(outputPath);
  console.log(`Saved transparent image: ${outputPath}`);
}

chromakeyGreen().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
