const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';
const publicFramesDir = path.join(__dirname, '../public/frames');

async function testSSRFullPreview() {
  const ssrPath = path.join(publicFramesDir, 'sq_ssr.png');
  const ruiPath = path.join(__dirname, '../public/rui_transparent_asset.png');
  const outFullPreviewPath = path.join(brainDir, 'sq_ssr_full_preview.jpg');

  if (fs.existsSync(ssrPath) && fs.existsSync(ruiPath)) {
    // 枠全体（4辺・全四隅）が余裕をもって100%確認できる 600x600 のキャンバスを作成
    let canvas = new Jimp({ width: 600, height: 600, color: 0x222630FF }); // ダーク背景

    // 透過チェッカーボードを中央 512x512 領域に描画
    const offsetX = 44;
    const offsetY = 44;

    for (let y = 0; y < 512; y += 16) {
      for (let x = 0; x < 512; x += 16) {
        if (((x / 16) + (y / 16)) % 2 === 1) {
          for (let py = 0; py < 16 && y + py < 512; py++) {
            for (let px = 0; px < 16 && x + px < 512; px++) {
              canvas.setPixelColor(0xD0D0D0FF, offsetX + x + px, offsetY + y + py);
            }
          }
        } else {
          for (let py = 0; py < 16 && y + py < 512; py++) {
            for (let px = 0; px < 16 && x + px < 512; px++) {
              canvas.setPixelColor(0xFFFFFFFF, offsetX + x + px, offsetY + y + py);
            }
          }
        }
      }
    }

    // ルイ立ち絵アセットを配置
    let ruiImg = await Jimp.read(ruiPath);
    ruiImg.resize({ w: 450, h: 450 });
    canvas.composite(ruiImg, offsetX + 31, offsetY + 62);

    // 本番 SSR 透過フレーム sq_ssr.png を重畳配置 (全4辺がはっきり見える)
    let ssrImg = await Jimp.read(ssrPath);
    ssrImg.resize({ w: 512, h: 512 });
    canvas.composite(ssrImg, offsetX, offsetY);

    // 完成保存
    await canvas.write(outFullPreviewPath);
    console.log(`Saved SSR full frame preview: ${outFullPreviewPath}`);
  }
}

testSSRFullPreview().catch(err => {
  console.error('Error testing SSR full preview:', err);
  process.exit(1);
});
