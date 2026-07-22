const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';
const unifiedImgPath = path.join(brainDir, 'unified_buttons_raw_v2_1784135572792.png');

const outDir = path.join(__dirname, '../public/menu');
const brainOutDir = brainDir;

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 緑背景の透過処理
function keyGreen(image) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // 緑色の背景を完全透過にする
    if (g > 100 && r < 120 && b < 120) {
      this.bitmap.data[idx + 3] = 0;
    }
  });
  return image;
}

async function splitAndKey() {
  console.log('Loading unified buttons image...');
  const image = await Jimp.read(unifiedImgPath);

  // ASCIIグリッド分析結果に基づき、各ボタンの座標（x, y, 幅, 高さ）を明示的に指定して切り抜く
  // 1個あたり約300px四方のスクエア領域で切り抜く
  const btnSize = 300;

  const btnSpecs = [
    {
      name: 'menu_allies', // 連合 (赤) - 下段左側 (Row 2, Left)
      x: 100,
      y: 530,
      w: btnSize,
      h: btnSize
    },
    {
      name: 'menu_fight', // 喧嘩 (青) - 下段右側 (Row 2, Right)
      x: 610,
      y: 530,
      w: btnSize,
      h: btnSize
    },
    {
      name: 'menu_conquest', // 制圧 (緑) - 上段右側 (Row 1, Right)
      x: 610,
      y: 110,
      w: btnSize,
      h: btnSize
    }
  ];

  for (const spec of btnSpecs) {
    console.log(`Cropping ${spec.name} from x:${spec.x}, y:${spec.y}, w:${spec.w}, h:${spec.h}`);
    
    // クローンを作成して指定座標で切り抜き
    const cropped = image.clone().crop({ x: spec.x, y: spec.y, w: spec.w, h: spec.h });
    
    // 緑背景を透過処理
    const transparent = keyGreen(cropped);
    
    // public/menu/ に書き出し
    const outPath = path.join(outDir, `${spec.name}.png`);
    await transparent.write(outPath);
    console.log(`Saved transparent asset: ${outPath}`);
    
    // brain/ フォルダ (artifactプレビュー用) にコピー保存
    const brainOutPath = path.join(brainOutDir, `${spec.name}_final.png`);
    await transparent.write(brainOutPath);
    console.log(`Saved transparent asset: ${brainOutPath}`);
  }

  console.log('Split and chromakey processing completed successfully.');
}

splitAndKey().catch(err => {
  console.error('Error during split and key:', err);
  process.exit(1);
});
