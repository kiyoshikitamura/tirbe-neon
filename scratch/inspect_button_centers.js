const { Jimp } = require('jimp');
const path = require('path');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';
const unifiedImgPath = path.join(brainDir, 'unified_buttons_raw_v2_1784135572792.png');

async function inspect() {
  const image = await Jimp.read(unifiedImgPath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;

  // 中央の高さ付近の緑ピクセル状態をスキャン
  const centerY = Math.floor(h / 2);
  let scanLine = '';
  
  // 16ピクセル刻みで緑かそうでないかをマッピング
  for (let x = 0; x < w; x += 16) {
    const idx = (centerY * w + x) * 4;
    const r = image.bitmap.data[idx + 0];
    const g = image.bitmap.data[idx + 1];
    const b = image.bitmap.data[idx + 2];
    
    const isGreen = g > 100 && r < 120 && b < 120;
    scanLine += isGreen ? '.' : 'O';
  }
  console.log(`Green-key scan at Y=${centerY}:`);
  console.log(scanLine);

  // Y軸中央部でのX方向の緑以外の色の重心を細かく検出
  const columns = [];
  for (let x = 0; x < w; x++) {
    let greenCount = 0;
    // Y=400から600の範囲で集計
    for (let y = 350; y < 650; y++) {
      const idx = (y * w + x) * 4;
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      if (g > 100 && r < 120 && b < 120) {
        greenCount++;
      }
    }
    columns.push(greenCount);
  }

  // 谷（最も緑ピクセルが多い＝ボタン同士の隙間）を検出する
  console.log("Analyzing local minimums of green density...");
  const points = [];
  for (let x = 10; x < w - 10; x++) {
    // ローカルで最も緑が多い（隙間）かどうか
    let isMin = true;
    for (let offset = -10; offset <= 10; offset++) {
      if (columns[x + offset] < columns[x]) {
        isMin = false;
        break;
      }
    }
    if (isMin && columns[x] > 200 && (points.length === 0 || x - points[points.length - 1] > 50)) {
      points.push(x);
    }
  }
  console.log("Detected gaps (X coordinates):", points);
}

inspect().catch(err => console.error(err));
