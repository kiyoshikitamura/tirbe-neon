const fs = require('fs');
const path = require('path');

const publicDir = 'd:\\dev\\tribe-neon\\public';
const charDir = path.join(publicDir, 'characters');

if (!fs.existsSync(charDir)) {
  fs.mkdirSync(charDir, { recursive: true });
}

// public/ 直下の *_transparent_asset.png を public/characters/ へ移動
const files = fs.readdirSync(publicDir);
let movedCharCount = 0;

files.forEach(file => {
  if (file.endsWith('_transparent_asset.png')) {
    const srcPath = path.join(publicDir, file);
    const destPath = path.join(charDir, file);
    
    fs.renameSync(srcPath, destPath);
    movedCharCount++;
  }
});

// 不要な開発初期の旧仮画像を削除
const obsoleteFiles = [
  'shinjuku_neon_icon_1783765789862.png',
  'tokyo_map.png',
  'shibuya_scramble.png',
  'move_btn_bg.png'
];

let removedObsoleteCount = 0;
obsoleteFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    removedObsoleteCount++;
  }
});

console.log(`Successfully moved ${movedCharCount} character transparent images to public/characters/!`);
console.log(`Cleaned up ${removedObsoleteCount} obsolete temporary mock images.`);
