const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';
const publicFramesDir = path.join(__dirname, '../public/frames');

async function testOverlayExactReference6() {
  const framePath = path.join(publicFramesDir, 'sq_n.png');
  const ruiPath = path.join(__dirname, '../public/rui_transparent_asset.png');
  const outTestPath = path.join(brainDir, 'sq_n_overlay_test.jpg');

  if (fs.existsSync(framePath) && fs.existsSync(ruiPath)) {
    // 参考写真6枚目と全く同じ透過格子模様（チェッカーボード）のキャンバス（512x512）を作成
    let canvas = new Jimp({ width: 512, height: 512, color: 0xFFFFFFFF });
    
    // 格子模様の背景を描画
    const tileSize = 16;
    for (let y = 0; y < 512; y += tileSize) {
      for (let x = 0; x < 512; x += tileSize) {
        if (((x / tileSize) + (y / tileSize)) % 2 === 1) {
          for (let py = 0; py < tileSize && y + py < 512; py++) {
            for (let px = 0; px < tileSize && x + px < 512; px++) {
              canvas.setPixelColor(0xD0D0D0FF, x + px, y + py);
            }
          }
        }
      }
    }

    // 参考写真6枚目と全く同じ構図・アスペクト比でルイのイラストをリサイズ＆配置
    let ruiImg = await Jimp.read(ruiPath);
    // ルイのイラストを頭部～胸元・タブレットがピッタリ収まる倍率にリサイズ
    ruiImg.resize({ w: 450, h: 450 });

    // キャンバス中央下に配置 (写真6枚目の完全一致構図)
    canvas.composite(ruiImg, 31, 62);

    // その上に透過フレーム sq_n.png を最全面に重畳合成
    let frameImg = await Jimp.read(framePath);
    frameImg.resize({ w: 512, h: 512 });
    canvas.composite(frameImg, 0, 0);

    // 完成画像を保存
    await canvas.write(outTestPath);
    console.log(`Saved exact reference photo 6 overlay preview: ${outTestPath}`);
  }
}

testOverlayExactReference6().catch(err => {
  console.error('Error during reference 6 overlay test:', err);
  process.exit(1);
});
