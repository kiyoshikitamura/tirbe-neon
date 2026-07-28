const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';
const publicFramesDir = path.join(__dirname, '../public/frames');

if (!fs.existsSync(publicFramesDir)) {
  fs.mkdirSync(publicFramesDir, { recursive: true });
}

async function processSingleFrame() {
  const rawPath = path.join(brainDir, 'sq_n_v10_raw_1785227405373.jpg');
  const outPath = path.join(publicFramesDir, 'sq_n.png');
  const artifactOutPath = path.join(brainDir, 'sq_n.png');

  if (fs.existsSync(rawPath)) {
    console.log(`Processing single frame: ${rawPath}`);
    let img = await Jimp.read(rawPath);
    
    // 内側の純粋グリーン色ピクセルのみ完全透明化
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];

      if (g > 90 && r < 140 && b < 140 && g > r * 1.15) {
        this.bitmap.data[idx + 3] = 0; // alpha = 0
      }
    });

    await img.write(outPath);
    await img.write(artifactOutPath);
    console.log(`Saved single transparent frame: ${outPath}`);
  }
}

processSingleFrame().catch(err => {
  console.error('Error processing single frame:', err);
  process.exit(1);
});
