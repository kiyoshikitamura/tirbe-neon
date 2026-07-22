const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';
const srcImgPath = path.join(brainDir, 'unified_buttons_black_calligraphy_v6_raw_1784136653250.png');

const outDir = path.join(__dirname, '../public/menu');
const brainOutDir = brainDir;

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 輝度透過 ＆ 円形境界ソフト羽フェードマスク処理
function keyBlackSmoothAndMask(image) {
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const cx = w / 2;
  const cy = h / 2;
  
  // ボタンの外周の最大半径を定義 (アンチエイリアスのボケ足を含め約165px)
  const maxRadius = 165; 
  const fadeStart = 157; // この半径から外側に向かってフェードアウトさせる
  const keyThreshold = 35; // 輝度透過のしきい値

  image.scan(0, 0, w, h, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    let a = this.bitmap.data[idx + 3];
    
    // 中心からの距離
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    
    if (dist > maxRadius) {
      // 1. 円の完全に外側にある範囲（隣のボタンの写り込み）は無条件で完全透明化
      a = 0;
    } else if (dist > fadeStart) {
      // 2. ボタンのフチのボケ足を滑らかにフェードアウト (隣接ボタンの干渉をカット)
      const factor = (maxRadius - dist) / (maxRadius - fadeStart); // 0 to 1
      a = Math.floor(a * factor);
    } else if (dist > w * 0.38) {
      // 3. ボタンの円形外周ラインと背景黒の接続部の輝度透過
      const brightness = (r + g + b) / 3;
      if (brightness < keyThreshold) {
        const factor = brightness / keyThreshold;
        a = Math.floor(a * factor);
      }
    }
    
    this.bitmap.data[idx + 3] = a;
  });
  return image;
}

async function splitAndKey() {
  console.log('Loading unified black-backed buttons image...');
  const image = await Jimp.read(srcImgPath);

  const btnSize = 360;
  const cropY = 330;

  // X中心点: 左181, 中512, 右844
  const btnSpecs = [
    {
      name: 'menu_allies', // 連合 (赤)
      x: 1,
      y: cropY,
      w: btnSize,
      h: btnSize
    },
    {
      name: 'menu_fight', // 喧嘩 (青)
      x: 332,
      y: cropY,
      w: btnSize,
      h: btnSize
    },
    {
      name: 'menu_conquest', // 制圧 (緑)
      x: 664,
      y: cropY,
      w: btnSize,
      h: btnSize
    }
  ];

  for (const spec of btnSpecs) {
    console.log(`Cropping ${spec.name} from x:${spec.x}, y:${spec.y}, w:${spec.w}, h:${spec.h}`);
    
    // クローンを作成して切り抜き
    const cropped = image.clone().crop({ x: spec.x, y: spec.y, w: spec.w, h: spec.h });
    
    // 円形マスク ＆ 透過処理
    const transparent = keyBlackSmoothAndMask(cropped);
    
    // public/menu/ に書き出し
    const outPath = path.join(outDir, `${spec.name}.png`);
    await transparent.write(outPath);
    console.log(`Saved transparent asset to workspace: ${outPath}`);
    
    // brain/ プレビュー用にコピー保存
    const brainOutPath = path.join(brainOutDir, `${spec.name}_final.png`);
    await transparent.write(brainOutPath);
    console.log(`Saved transparent asset to brain artifacts: ${brainOutPath}`);
  }

  console.log('Split and black-key transparency processing completed successfully.');
}

splitAndKey().catch(err => {
  console.error('Error during split and key:', err);
  process.exit(1);
});
