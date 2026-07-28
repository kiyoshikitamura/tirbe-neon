const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/38b6d028-6292-4b3a-a70b-7c6975afa29e';
const publicFramesDir = path.join(__dirname, '../public/frames');

async function testSSRTransparency() {
  const ssrPath = path.join(publicFramesDir, 'sq_ssr.png');
  const ruiPath = path.join(__dirname, '../public/rui_transparent_asset.png');
  const outTestPath = path.join(brainDir, 'sq_ssr_overlay_test.jpg');

  if (fs.existsSync(ssrPath) && fs.existsSync(ruiPath)) {
    // 透過格子模様の背景 (512x512)
    let canvas = new Jimp({ width: 512, height: 512, color: 0xFFFFFFFF });
    for (let y = 0; y < 512; y += 16) {
      for (let x = 0; x < 512; x += 16) {
        if (((x / 16) + (y / 16)) % 2 === 1) {
          for (let py = 0; py < 16 && y + py < 512; py++) {
            for (let px = 0; px < 16 && x + px < 512; px++) {
              canvas.setPixelColor(0xD0D0D0FF, x + px, y + py);
            }
          }
        }
      }
    }

    // ルイ立ち絵配置
    let ruiImg = await Jimp.read(ruiPath);
    ruiImg.resize({ w: 450, h: 450 });
    canvas.composite(ruiImg, 31, 62);

    // 重ね合わせる透過済みの本番 SSR 枠 PNG
    let ssrImg = await Jimp.read(ssrPath);
    canvas.composite(ssrImg, 0, 0);

    // 保存
    await canvas.write(outTestPath);
    console.log(`Saved SSR transparency overlay test: ${outTestPath}`);
  }
}

testSSRTransparency().catch(err => {
  console.error('Error testing SSR transparency:', err);
  process.exit(1);
});
