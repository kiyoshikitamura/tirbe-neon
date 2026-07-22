const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';
const srcImgPath = path.join(brainDir, 'unified_buttons_pink_raw_1784135962925.png');

const outDir = path.join(__dirname, '../public/menu');
const brainOutDir = brainDir;

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 蛍光ピンク (#FF00FF) の透過処理
function keyPink(image) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // マゼンタ・ホットピンク系の色を完全透過にする
    if (r > 170 && g < 120 && b > 170) {
      this.bitmap.data[idx + 3] = 0; // アルファ0
    }
  });
  return image;
}

async function splitAndKey() {
  console.log('Loading unified calligraphy hot-pink buttons image...');
  const image = await Jimp.read(srcImgPath);

  // ピクセル分析に基づき、完璧にセンタリングした 340x340 の座標を定義
  const btnSize = 340;
  const cropY = 340;

  const btnSpecs = [
    {
      name: 'menu_allies', // 連合 (赤)
      x: 15,
      y: cropY,
      w: btnSize,
      h: btnSize
    },
    {
      name: 'menu_fight', // 喧嘩 (青)
      x: 342,
      y: cropY,
      w: btnSize,
      h: btnSize
    },
    {
      name: 'menu_conquest', // 制圧 (緑)
      x: 670,
      y: cropY,
      w: btnSize,
      h: btnSize
    }
  ];

  for (const spec of btnSpecs) {
    console.log(`Cropping ${spec.name} from x:${spec.x}, y:${spec.y}, w:${spec.w}, h:${spec.h}`);
    
    // 指定領域を切り抜き
    const cropped = image.clone().crop({ x: spec.x, y: spec.y, w: spec.w, h: spec.h });
    
    // ピンク背景を透過処理
    const transparent = keyPink(cropped);
    
    // public/menu/ に書き出し (実装用)
    const outPath = path.join(outDir, `${spec.name}.png`);
    await transparent.write(outPath);
    console.log(`Saved transparent asset to workspace: ${outPath}`);
    
    // brain/ にコピー保存 (プレビュー確認用)
    const brainOutPath = path.join(brainOutDir, `${spec.name}_final.png`);
    await transparent.write(brainOutPath);
    console.log(`Saved transparent asset to brain artifacts: ${brainOutPath}`);
  }

  console.log('Split and Hot Pink chromakey processing completed successfully.');
}

splitAndKey().catch(err => {
  console.error('Error during split and key:', err);
  process.exit(1);
});
