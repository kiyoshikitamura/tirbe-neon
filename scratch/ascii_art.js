const { Jimp } = require('jimp');
const path = require('path');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';
const unifiedImgPath = path.join(brainDir, 'unified_buttons_raw_v2_1784135572792.png');

async function ascii() {
  const image = await Jimp.read(unifiedImgPath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;

  const grid = 64; // 64x64グリッドで可視化
  const stepX = Math.floor(w / grid);
  const stepY = Math.floor(h / grid);

  console.log(`ASCII Visual Map of Non-Green Pixels (64x64 grid):`);
  console.log(`Legend: '.' = Green Background, '#' = Button/Content`);

  for (let gy = 0; gy < grid; gy++) {
    let line = '';
    const y = gy * stepY;
    for (let gx = 0; gx < grid; gx++) {
      const x = gx * stepX;
      const idx = (y * w + x) * 4;
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      
      // 緑背景
      const isGreen = g > 100 && r < 120 && b < 120;
      line += isGreen ? '.' : '#';
    }
    console.log(line);
  }
}

ascii().catch(err => console.error(err));
