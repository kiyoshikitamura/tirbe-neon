const { Jimp } = require('jimp');
const path = require('path');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';
const unifiedImgPath = path.join(brainDir, 'unified_buttons_black_calligraphy_v6_raw_1784136653250.png');

// 純黒背景判定 (#000000)
function isBlack(r, g, b) {
  return r < 15 && g < 15 && b < 15;
}

async function analyze() {
  const image = await Jimp.read(unifiedImgPath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  console.log(`Image size: ${w}x${h}`);

  // Y方向のボタン存在範囲の特定
  const rowCounts = [];
  for (let y = 0; y < h; y++) {
    let nonBlackCount = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      if (!isBlack(r, g, b)) {
        nonBlackCount++;
      }
    }
    rowCounts.push({ y, count: nonBlackCount });
  }

  const activeRows = rowCounts.filter(r => r.count > 10);
  if (activeRows.length === 0) {
    console.log("No active non-black rows found!");
    return;
  }
  
  const minY = activeRows[0].y;
  const maxY = activeRows[activeRows.length - 1].y;
  console.log(`Active vertical range (Y): ${minY} to ${maxY} (height: ${maxY - minY})`);

  // 列 (X座標) における非ブラックピクセル数を集計
  const colCounts = [];
  for (let x = 0; x < w; x++) {
    let nonBlackCount = 0;
    for (let y = minY; y <= maxY; y++) {
      const idx = (y * w + x) * 4;
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      if (!isBlack(r, g, b)) {
        nonBlackCount++;
      }
    }
    colCounts.push({ x, count: nonBlackCount });
  }

  // 横方向の連続する非ブラックセグメントを検出
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

  console.log("Detected horizontal segments of buttons (Non-Black):");
  segments.forEach((seg, i) => {
    console.log(`Segment ${i}: start=${seg.start}, end=${seg.end}, width=${seg.width}`);
  });
}

analyze().catch(err => console.error(err));
