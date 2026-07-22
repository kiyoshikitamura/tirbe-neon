const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';

const assets = {
  allies: {
    src: path.join(brainDir, 'menu_allies_pink_raw_1784135863633.png'),
    dest: path.join(__dirname, '../public/menu/menu_allies.png'),
    preview: path.join(brainDir, 'menu_allies_final.png')
  },
  fight: {
    src: path.join(brainDir, 'menu_fight_pink_raw_1784135878710.png'),
    dest: path.join(__dirname, '../public/menu/menu_fight.png'),
    preview: path.join(brainDir, 'menu_fight_final.png')
  },
  conquest: {
    src: path.join(brainDir, 'menu_conquest_pink_raw_1784135895307.png'),
    dest: path.join(__dirname, '../public/menu/menu_conquest.png'),
    preview: path.join(brainDir, 'menu_conquest_final.png')
  }
};

// 蛍光ピンク (#FF00FF) 透過処理
function keyPink(image) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // 赤と青が強く、緑が弱いピクセルを透過 (マゼンタ・ホットピンク系)
    if (r > 180 && g < 120 && b > 180) {
      this.bitmap.data[idx + 3] = 0; // 完全透過
    }
  });
  return image;
}

async function processAll() {
  const publicDir = path.dirname(assets.allies.dest);
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  console.log('Starting Hot Pink chromakey processing (Single Button Mode)...');

  const keys = ['allies', 'fight', 'conquest'];
  for (const key of keys) {
    const item = assets[key];
    console.log(`Processing ${key} button from: ${item.src}`);
    
    const image = await Jimp.read(item.src);
    
    // ボタンの周りに描かれている1024x1024の中央768x768をクロップ (余白調整)
    // これにより、フチが切れることやズレることを完全に防ぐ
    image.crop({ x: 128, y: 128, w: 768, h: 768 });
    
    // ピンク透過処理
    const transparent = keyPink(image);
    
    // 保存
    await transparent.write(item.dest);
    console.log(`Saved transparent asset to workspace: ${item.dest}`);
    
    await transparent.write(item.preview);
    console.log(`Saved transparent asset to brain artifacts: ${item.preview}`);
  }

  console.log('Hot Pink chromakey processing completed successfully.');
}

processAll().catch(err => {
  console.error('Error during Hot Pink chromakey:', err);
  process.exit(1);
});
