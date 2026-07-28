const fs = require('fs');
const path = require('path');

const artifactDir = 'C:\\Users\\scope\\.gemini\\antigravity\\brain\\38b6d028-6292-4b3a-a70b-7c6975afa29e';
const targetDir = 'd:\\dev\\tribe-neon\\public\\raw_assets';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Artifacts 内の全 *_raw.jpg / *_raw_*.jpg / *_raw.png を検索
const files = fs.readdirSync(artifactDir);
let copiedCount = 0;

files.forEach(file => {
  if (file.endsWith('_raw.jpg') || file.endsWith('_raw.png') || file.includes('_raw_')) {
    const srcPath = path.join(artifactDir, file);
    const destPath = path.join(targetDir, file);
    
    // コピー実行
    fs.copyFileSync(srcPath, destPath);
    copiedCount++;
  }
});

console.log(`Successfully copied ${copiedCount} raw master image files to public/raw_assets/!`);
