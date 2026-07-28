const fs = require('fs');
const path = require('path');

const publicDir = 'd:\\dev\\tribe-neon\\public';
const rawDir = path.join(publicDir, 'raw_assets');

// 1. 不要なテンプレートSVGファイルの削除
const unusedSvgs = ['file.svg', 'globe.svg', 'next.svg', 'vercel.svg', 'window.svg'];
let removedSvgCount = 0;

unusedSvgs.forEach(svg => {
  const svgPath = path.join(publicDir, svg);
  if (fs.existsSync(svgPath)) {
    fs.unlinkSync(svgPath);
    removedSvgCount++;
  }
});
console.log(`Deleted ${removedSvgCount} unused template SVG files.`);

// 2. public/raw_assets/ の過去試行バージョン削除 (確定原画 *_raw.jpg のみ残す)
if (fs.existsSync(rawDir)) {
  const rawFiles = fs.readdirSync(rawDir);
  let purgedCount = 0;
  let keptCount = 0;

  rawFiles.forEach(file => {
    // 削除パターン: _v2_, _v3_, _v4_, _v5_, _v6_, _v7_, _v8_, _v9_, _v10_, _v11_, または タイムスタンプ _raw_178
    const isVersionedTrial = /_v\d+_raw/i.test(file) || /_raw_\d{10,}/i.test(file) || /_raw_fullbody_\d{10,}/i.test(file);

    if (isVersionedTrial) {
      const filePath = path.join(rawDir, file);
      fs.unlinkSync(filePath);
      purgedCount++;
    } else {
      keptCount++;
    }
  });

  console.log(`Purged ${purgedCount} trial version images from public/raw_assets/.`);
  console.log(`Kept ${keptCount} final FIX master green-back raw images!`);
}
