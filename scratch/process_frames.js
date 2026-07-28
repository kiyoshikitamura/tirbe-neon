const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';
const publicFramesDir = path.join(__dirname, '../public/frames');

if (!fs.existsSync(publicFramesDir)) {
  fs.mkdirSync(publicFramesDir, { recursive: true });
}

const frames = [
  // 正方形フレーム (1:1)
  { raw: 'sq_n_v4_raw_1785223394658.jpg', out: 'sq_n.png' },
  { raw: 'sq_r_v4_raw_1785223410293.jpg', out: 'sq_r.png' },
  { raw: 'sq_sr_v4_raw_1785223427207.jpg', out: 'sq_sr.png' },
  { raw: 'sq_ssr_v5_raw_1785223441749.jpg', out: 'sq_ssr.png' },
  // バトル用縦型スリムフレーム (9:16)
  { raw: 'card_n_v2_raw_1785223456185.jpg', out: 'card_n.png' },
  { raw: 'card_r_v2_raw_1785223472153.jpg', out: 'card_r.png' },
  { raw: 'card_sr_v2_raw_1785223485175.jpg', out: 'card_sr.png' },
  { raw: 'card_ssr_v2_raw_1785223498077.jpg', out: 'card_ssr.png' }
];

function keyGreen(image) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    // 緑が強い中央領域をアルファ透過
    if (g > 90 && r < 140 && b < 140 && g > r * 1.15) {
      this.bitmap.data[idx + 3] = 0; // alpha = 0
    }
  });
  return image;
}

async function processAll() {
  for (const item of frames) {
    const rawPath = path.join(brainDir, item.raw);
    const outPath = path.join(publicFramesDir, item.out);
    const artifactOutPath = path.join(brainDir, item.out);

    if (fs.existsSync(rawPath)) {
      console.log(`Processing ${item.raw} -> ${item.out}...`);
      let img = await Jimp.read(rawPath);
      img = keyGreen(img);
      await img.write(outPath);
      await img.write(artifactOutPath);
      console.log(`Saved transparent frame: ${outPath}`);
    } else {
      console.error(`File not found: ${rawPath}`);
    }
  }
}

processAll().catch(err => {
  console.error('Error processing frame transparency:', err);
  process.exit(1);
});
