const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

async function processChromakey(inputPath, outputPath, keyColor = 'green') {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`Processing chromakey for: ${inputPath} -> ${outputPath}`);
  const image = await Jimp.read(inputPath);
  const width = image.bitmap.width;
  const height = image.bitmap.height;

  image.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    if (keyColor === 'green') {
      // 緑背景の判定
      if (g > 90 && g > r * 1.15 && g > b * 1.15) {
        this.bitmap.data[idx + 3] = 0; // 完全透過
      } else if (g > 80 && g > r * 1.05 && g > b * 1.05) {
        const alpha = Math.max(0, 255 - (g - Math.max(r, b)) * 4);
        this.bitmap.data[idx + 3] = Math.floor(alpha);
      }
    } else if (keyColor === 'magenta') {
      if (r > 100 && b > 100 && g < r * 0.7 && g < b * 0.7) {
        this.bitmap.data[idx + 3] = 0;
      }
    } else if (keyColor === 'blue') {
      if (b > 100 && b > r * 1.15 && b > g * 1.15) {
        this.bitmap.data[idx + 3] = 0;
      }
    }
  });

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  await image.write(outputPath);
  console.log(`Successfully saved transparent image to: ${outputPath}`);
}

const args = process.argv.slice(2);
const input = args[0] || 'd:/dev/tribe-neon/public/raw_assets/reiji_raw.jpg';
const output = args[1] || 'd:/dev/tribe-neon/public/reiji_transparent_asset.png';
const color = args[2] || 'green';

processChromakey(input, output, color).catch(err => {
  console.error("Chromakey error:", err);
  process.exit(1);
});
