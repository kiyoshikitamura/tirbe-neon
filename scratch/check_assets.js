const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../public');

async function check() {
  const files = fs.readdirSync(publicDir);
  console.log('Checking image dimensions in public folder:');
  
  for (const file of files) {
    if (file.endsWith('.png')) {
      const filePath = path.join(publicDir, file);
      try {
        const img = await Jimp.read(filePath);
        console.log(`- ${file}: ${img.bitmap.width}x${img.bitmap.height}`);
      } catch (err) {
        console.log(`- ${file}: Error loading (${err.message})`);
      }
    }
  }
}

check().catch(console.error);
