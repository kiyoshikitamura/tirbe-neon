const path = require('path');
const { Jimp } = require('jimp');

// レイジ立ち絵のグレー背景を透過化する
const inputPath = path.join(__dirname, '../public/reiji_transparent_asset.png');
const outputPath = inputPath; // 上書き保存

async function removeGrayBackground() {
  console.log('Reading image:', inputPath);
  const image = await Jimp.read(inputPath);
  const { width, height } = image.bitmap;
  console.log(`Image size: ${width}x${height}`);

  // パス1: 四隅のピクセルから背景色を取得
  const corners = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    [10, 10], [width - 11, 10], [10, height - 11], [width - 11, height - 11]
  ];
  
  let avgR = 0, avgG = 0, avgB = 0;
  for (const [cx, cy] of corners) {
    const idx = (cy * width + cx) * 4;
    avgR += image.bitmap.data[idx + 0];
    avgG += image.bitmap.data[idx + 1];
    avgB += image.bitmap.data[idx + 2];
  }
  avgR = Math.round(avgR / corners.length);
  avgG = Math.round(avgG / corners.length);
  avgB = Math.round(avgB / corners.length);
  console.log(`Detected background color: rgb(${avgR}, ${avgG}, ${avgB})`);

  // パス2: 背景色に近いピクセルを透過化
  // 色距離の閾値 (大きいほど寛容に透過する)
  const threshold = 40;
  // エッジ付近のアンチエイリアスを滑らかに処理
  const softThreshold = 60;

  image.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];

    // すでに透過ならスキップ
    if (a === 0) return;

    // 背景色との色距離を計算
    const dist = Math.sqrt(
      Math.pow(r - avgR, 2) +
      Math.pow(g - avgG, 2) +
      Math.pow(b - avgB, 2)
    );

    if (dist < threshold) {
      // 完全透過
      this.bitmap.data[idx + 3] = 0;
    } else if (dist < softThreshold) {
      // エッジ部分: 距離に応じて半透過 (アンチエイリアス)
      const ratio = (dist - threshold) / (softThreshold - threshold);
      this.bitmap.data[idx + 3] = Math.round(a * ratio);
    }
  });

  await image.write(outputPath);
  console.log(`Saved transparent image: ${outputPath}`);
}

removeGrayBackground().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
