const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const publicDir = path.join(__dirname, '../public');
const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/77e207cf-862d-41e0-a8ff-5a37ff2953d0';

// 透明度に基づくバウンディングボックスを検出し、トリミングする
function getBoundingBox(image) {
  let minX = image.bitmap.width;
  let minY = image.bitmap.height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const alpha = this.bitmap.data[idx + 3];
    if (alpha > 15) { // アルファ値が一定以上の箇所を実ピクセルと判定
      found = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  });

  if (!found) {
    return { x: 0, y: 0, w: image.bitmap.width, h: image.bitmap.height };
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// キャラクターアセットをトリミングしてリサイズする
async function getTrimmedCharacter(name, targetHeight) {
  const filePath = path.join(publicDir, `${name}_transparent_asset.png`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Asset not found: ${filePath}`);
  }
  
  let img = await Jimp.read(filePath);
  const bbox = getBoundingBox(img);
  
  // 余白を排除
  img.crop({ x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h });
  
  // アスペクト比を維持して指定の高さにリサイズ
  const scale = targetHeight / img.bitmap.height;
  const targetWidth = Math.floor(img.bitmap.width * scale);
  img.resize({ w: targetWidth, h: targetHeight });
  
  return img;
}

async function synthesizeKeyVisual() {
  console.log('Initializing key visual synthesis...');

  // 1. キャンバスの作成 (縦長: 640 x 1136)
  const canvasWidth = 640;
  const canvasHeight = 1136;
  
  // 2. 背景の設定
  console.log('Preparing background...');
  const bgPath = path.join(publicDir, 'shibuya_scramble.png');
  let bg = await Jimp.read(bgPath);
  
  // 背景をアスペクト比維持しつつ、高さ1136に合わせてリサイズ
  const bgScale = canvasHeight / bg.bitmap.height;
  const bgWidth = Math.floor(bg.bitmap.width * bgScale);
  bg.resize({ w: bgWidth, h: canvasHeight });
  
  // 中央で切り抜き (640x1136)
  const startX = Math.floor((bgWidth - canvasWidth) / 2);
  bg.crop({ x: startX, y: 0, w: canvasWidth, h: canvasHeight });
  
  // 背景を暗くし、青みを付加する (冷たい夜街のトーン)
  bg.scan(0, 0, bg.bitmap.width, bg.bitmap.height, function(x, y, idx) {
    this.bitmap.data[idx + 0] = Math.floor(this.bitmap.data[idx + 0] * 0.25); // R を大幅に下げる
    this.bitmap.data[idx + 1] = Math.floor(this.bitmap.data[idx + 1] * 0.35); // G
    this.bitmap.data[idx + 2] = Math.floor(this.bitmap.data[idx + 2] * 0.55); // B (青を残す)
  });

  // 3. キャラクターアセットのロードと配置
  console.log('Loading character assets...');
  
  // 後景キャラ (小さめ)
  const mio = await getTrimmedCharacter('mio', 540);
  const serika = await getTrimmedCharacter('serika', 540);
  const kengo = await getTrimmedCharacter('kengo', 550);
  
  // 中景キャラ (中くらい)
  const shin = await getTrimmedCharacter('shin', 660);
  const go = await getTrimmedCharacter('go', 660);
  
  // 前景主役 (大きめ)
  const reiji = await getTrimmedCharacter('reiji', 780);

  // キャラクターの配置合成
  console.log('Layering characters...');

  // [後景1] ミオ: 左奥
  // x位置: 10px付近
  bg.composite(mio, 10, 260);

  // [後景2] セリカ: 右奥
  // x位置: 右端からミオと同じくらいの余白で配置
  bg.composite(serika, canvasWidth - serika.bitmap.width - 10, 260);

  // [後景3] ケンゴ: 中央奥
  const kengoX = Math.floor((canvasWidth - kengo.bitmap.width) / 2);
  bg.composite(kengo, kengoX, 220);

  // [中景1] シン: 左中
  // 少しだけ重ねる
  bg.composite(shin, 60, 360);

  // [中景2] ゴウ: 右中
  bg.composite(go, canvasWidth - go.bitmap.width - 60, 360);

  // [前景] レイジ: 中央手前
  const reijiX = Math.floor((canvasWidth - reiji.bitmap.width) / 2);
  bg.composite(reiji, reijiX, 390);

  // 4. 最前面に青いタイトルロゴの合成
  console.log('Preparing and pasting the logo...');
  const logoPath = path.join(publicDir, 'logo_blue.png');
  let logo = await Jimp.read(logoPath);
  
  const logoBbox = getBoundingBox(logo);
  logo.crop({ x: logoBbox.x, y: logoBbox.y, w: logoBbox.w, h: logoBbox.h });
  
  // ロゴをキャンバス幅の 88% にリサイズ
  const logoTargetWidth = Math.floor(canvasWidth * 0.88);
  const logoScale = logoTargetWidth / logo.bitmap.width;
  const logoTargetHeight = Math.floor(logo.bitmap.height * logoScale);
  logo.resize({ w: logoTargetWidth, h: logoTargetHeight });

  // 『拳極』風に、縦の中央付近にロゴを合成 (Y座標 320 付近、キャラクターの胸〜首にかぶるくらいがダイナミック)
  const logoX = Math.floor((canvasWidth - logo.bitmap.width) / 2);
  const logoY = 320; 
  bg.composite(logo, logoX, logoY);

  // 5. 保存
  const outPath = path.join(publicDir, 'key_visual_sample.png');
  await bg.write(outPath);
  console.log(`Saved composite key visual to: ${outPath}`);

  // アーティファクトディレクトリ用 (レビュー用)
  const brainOutPath = path.join(brainDir, 'kv_synthesized.png');
  await bg.write(brainOutPath);
  console.log(`Saved preview key visual to brain: ${brainOutPath}`);

  console.log('Key visual generation completed successfully.');
}

synthesizeKeyVisual().catch(err => {
  console.error('Error during synthesis:', err);
  process.exit(1);
});
