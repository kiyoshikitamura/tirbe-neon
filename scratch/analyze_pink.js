const { Jimp } = require('jimp');
const path = require('path');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';
const unifiedImgPath = path.join(brainDir, 'unified_buttons_pink_raw_1784135962925.png');

// 蛍光ピンク判定 (#FF00FF)
function isPink(r, g, b) {
  return r > 180 && g < 120 && b > 180;
}

async function analyze() {
  const image = await Jimp.read(unifiedImgPath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  console.log(`Image size: ${w}x${h}`);

  // Y方向のボタン存在範囲の特定
  const rowCounts = [];
  for (let y = 0; y < h; y++) {
    let nonPinkCount = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      if (!isPink(r, g, b)) {
        nonPinkCount++;
      }
    }
    rowCounts.push({ y, count: nonPinkCount });
  }

  const activeRows = rowCounts.filter(r => r.count > 10);
  if (activeRows.length === 0) {
    console.log("No active non-pink rows found!");
    return;
  }
  
  const minY = activeRows[0].y;
  const maxY = activeRows[activeRows.length - 1].y;
  console.log(`Active vertical range (Y): ${minY} to ${maxY} (height: ${maxY - minY})`);

  // 列 (X座標) における非ピンクピクセル数を集計してセグメント検出
  const colCounts = [];
  for (let x = 0; x < w; x++) {
    let nonPinkCount = 0;
    for (let y = minY; y <= maxY; y++) {
      const idx = (y * w + x) * 4;
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      if (!isPink(r, g, b)) {
        nonPinkCount++;
      }
    }
    colCounts.push({ x, count: nonPinkCount });
  }

  // 横方向の連続する非ピンクセグメントを検出
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

  console.log("Detected horizontal segments of buttons (Non-Pink):");
  segments.forEach((seg, i) => {
    console.log(`Segment ${i}: start=${seg.start}, end=${seg.end}, width=${seg.width}`);
  });
}

analyze().catch(err => console.error(err));
