const { Jimp } = require('jimp');
const path = require('path');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';
const unifiedImgPath = path.join(brainDir, 'unified_buttons_raw_v2_1784135572792.png');

async function analyze() {
  const image = await Jimp.read(unifiedImgPath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  console.log(`Image size: ${w}x${h}`);

  // 各Y座標行における「非緑色ピクセル数」を集計し、ボタンの縦方向の範囲を特定する
  const rowCounts = [];
  for (let y = 0; y < h; y++) {
    let nonGreenCount = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      
      // 緑背景ではないと判定
      if (!(g > 100 && r < 120 && b < 120)) {
        nonGreenCount++;
      }
    }
    rowCounts.push({ y, count: nonGreenCount });
  }

  // 非ゼロの行を出力して、ボタンが描画されている縦位置を調査
  const activeRows = rowCounts.filter(r => r.count > 10);
  if (activeRows.length === 0) {
    console.log("No active non-green rows found!");
    return;
  }
  
  const minY = activeRows[0].y;
  const maxY = activeRows[activeRows.length - 1].y;
  console.log(`Active vertical range (Y): ${minY} to ${maxY} (height: ${maxY - minY})`);

  // 各列 (X座標) における非緑色ピクセル数を集計し、横方向のボタンの山を特定する
  const colCounts = [];
  for (let x = 0; x < w; x++) {
    let nonGreenCount = 0;
    for (let y = minY; y <= maxY; y++) {
      const idx = (y * w + x) * 4;
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      if (!(g > 100 && r < 120 && b < 120)) {
        nonGreenCount++;
      }
    }
    colCounts.push({ x, count: nonGreenCount });
  }

  // 横方向の連続する非緑色セグメントを検出する
  const segments = [];
  let inSegment = false;
  let startX = -1;
  
  for (let x = 0; x < w; x++) {
    const isSolid = colCounts[x].count > 5;
    if (isSolid && !inSegment) {
      inSegment = true;
      startX = x;
    } else if (!isSolid && inSegment) {
      inSegment = false;
      segments.push({ start: startX, end: x - 1, width: x - startX });
    }
  }
  if (inSegment) {
    segments.push({ start: startX, end: w - 1, width: w - startX });
  }

  console.log("Detected horizontal segments of buttons:");
  segments.forEach((seg, i) => {
    console.log(`Segment ${i}: start=${seg.start}, end=${seg.end}, width=${seg.width}`);
  });
}

analyze().catch(err => console.error(err));
