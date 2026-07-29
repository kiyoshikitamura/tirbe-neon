const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

async function processChromaKey() {
  const inputPath = path.join(__dirname, '../public/raw_assets/icon_cash_raw.jpg');
  const outputDir = path.join(__dirname, '../public/ui');
  const outputPath = path.join(outputDir, 'icon_cash.png');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Processing chroma key for: ${inputPath}`);
  const image = await Jimp.read(inputPath);

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    // Green chroma key detection
    if (g > 80 && g > r * 1.25 && g > b * 1.25) {
      this.bitmap.data[idx + 3] = 0; // Transparent
    } else if (g > 60 && g > r * 1.15 && g > b * 1.15) {
      // Smooth edge blending (anti-aliasing)
      const alpha = Math.max(0, 255 - Math.floor((g - Math.max(r, b)) * 2.5));
      this.bitmap.data[idx + 3] = Math.min(this.bitmap.data[idx + 3], alpha);
    }
  });

  await image.write(outputPath);
  console.log(`Successfully saved transparent PNG to: ${outputPath}`);
}

processChromaKey().catch(err => {
  console.error("Error processing chroma key:", err);
  process.exit(1);
});
