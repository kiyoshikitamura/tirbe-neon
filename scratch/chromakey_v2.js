const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/c402f30e-58d9-4005-9536-450809f0f645';

const assets = [
  {
    src: path.join(brainDir, 'menu_allies_v2_1784275959620.png'),
    out: path.join(__dirname, '../public/menu/menu_allies.png'),
  },
  {
    src: path.join(brainDir, 'menu_fight_v2_1784275972281.png'),
    out: path.join(__dirname, '../public/menu/menu_fight.png'),
  },
  {
    src: path.join(brainDir, 'menu_conquest_v2_1784275984263.png'),
    out: path.join(__dirname, '../public/menu/menu_conquest.png'),
  },
];

function keyGreen(image) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    if (g > 100 && r < 90 && b < 90) {
      this.bitmap.data[idx + 3] = 0;
    }
  });
  return image;
}

async function processAll() {
  for (const item of assets) {
    console.log(`Processing: ${path.basename(item.src)}`);
    let img = await Jimp.read(item.src);
    img = keyGreen(img);
    await img.write(item.out);
    console.log(`Saved: ${item.out}`);
  }
  console.log('Done.');
}

processAll().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
