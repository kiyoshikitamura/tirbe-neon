const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';

const assets = {
  allies: {
    bg: path.join(brainDir, 'menu_allies_no_kanji_1784134888484.png'),
    text: path.join(brainDir, 'text_allies_raw_1784134952058.png'),
    out: path.join(__dirname, '../public/menu/menu_allies.png'),
    kanji: '連合'
  },
  fight: {
    bg: path.join(brainDir, 'menu_fight_no_kanji_1784134908200.png'),
    text: path.join(brainDir, 'text_fight_raw_1784134967674.png'),
    out: path.join(__dirname, '../public/menu/menu_fight.png'),
    kanji: '喧嘩'
  },
  conquest: {
    bg: path.join(brainDir, 'menu_conquest_no_kanji_1784134934352.png'),
    text: path.join(brainDir, 'text_conquest_raw_1784134982222.png'),
    out: path.join(__dirname, '../public/menu/menu_conquest.png'),
    kanji: '制圧'
  },
  hud: {
    bg: path.join(brainDir, 'hud_bg_plate_1784134549636.png'),
    out: path.join(__dirname, '../public/hud_bg.png')
  },
  moveBtn: {
    bg: path.join(brainDir, 'move_btn_bg_plate_1784134568387.png'),
    out: path.join(__dirname, '../public/move_btn_bg.png')
  }
};

// 緑色 (クロマキー) 透過処理
function keyGreen(image) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // 緑成分が強く、赤・青が弱い箇所を透過にする
    if (g > 100 && r < 90 && b < 90) {
      this.bitmap.data[idx + 3] = 0; // アルファ透過
    }
  });
  return image;
}

// 黒色透過 ＆ 白色のみ抽出処理 (Kanji用)
function keyBlackAndExtractWhite(image) {
  let minX = image.bitmap.width;
  let minY = image.bitmap.height;
  let maxX = 0;
  let maxY = 0;

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // 黒い背景部分を透過にする
    if (r < 100 && g < 100 && b < 100) {
      this.bitmap.data[idx + 3] = 0;
    } else {
      // 白文字部分を完全な白 (#FFFFFF) に統一する
      this.bitmap.data[idx + 0] = 255;
      this.bitmap.data[idx + 1] = 255;
      this.bitmap.data[idx + 2] = 255;
      this.bitmap.data[idx + 3] = 255;

      // 白文字領域の境界線 (Bounding Box) を更新
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  });

  // 白い文字部分のみをクロップ (切り抜き) して余白を排除
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  if (width > 0 && height > 0) {
    image.crop({ x: minX, y: minY, w: width, h: height });
  }
  return image;
}

async function processAll() {
  // 保存先フォルダの作成
  const publicMenuDir = path.dirname(assets.allies.out);
  const publicDir = path.dirname(assets.hud.out);
  if (!fs.existsSync(publicMenuDir)) fs.mkdirSync(publicMenuDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  console.log('Starting image composition and transparency processing...');

  // 1. HUD背景プレートの透過処理
  console.log('Processing HUD background plate...');
  let hudImg = await Jimp.read(assets.hud.bg);
  hudImg = keyGreen(hudImg);
  await hudImg.write(assets.hud.out);
  console.log(`Saved: ${assets.hud.out}`);

  // 2. 拠点移動ボタン背景プレートの透過処理
  console.log('Processing move button plate...');
  let moveImg = await Jimp.read(assets.moveBtn.bg);
  moveImg = keyGreen(moveImg);
  await moveImg.write(assets.moveBtn.out);
  console.log(`Saved: ${assets.moveBtn.out}`);

  // 3. 各丸ボタン (連合, 喧嘩, 制圧) の透過 ＆ 漢字合成
  const keys = ['allies', 'fight', 'conquest'];
  for (const key of keys) {
    const item = assets[key];
    console.log(`Processing button [${item.kanji}]...`);
    
    // 背景ボタン画像の透過
    let bgImg = await Jimp.read(item.bg);
    bgImg = keyGreen(bgImg);
    
    // 漢字テキストの透過 ＆ クロップ
    let textImg = await Jimp.read(item.text);
    textImg = keyBlackAndExtractWhite(textImg);
    
    // ボタンのサイズに合わせて漢字テキストを綺麗にリサイズ
    // ボタン幅の 38% の大きさにリサイズ
    const targetWidth = Math.floor(bgImg.bitmap.width * 0.38);
    const scale = targetWidth / textImg.bitmap.width;
    const targetHeight = Math.floor(textImg.bitmap.height * scale);
    textImg.resize({ w: targetWidth, h: targetHeight });
    
    // 合成位置の算出 (X軸は中央, Y軸はボタンの高さの約60%付近)
    const posX = Math.floor((bgImg.bitmap.width - textImg.bitmap.width) / 2);
    const posY = Math.floor(bgImg.bitmap.height * 0.58);
    
    // 合成
    bgImg.composite(textImg, posX, posY);
    
    // 保存
    await bgImg.write(item.out);
    console.log(`Saved: ${item.out}`);
  }

  console.log('Transparency and composition process completed successfully.');
}

processAll().catch(err => {
  console.error('Error during image processing:', err);
  process.exit(1);
});
