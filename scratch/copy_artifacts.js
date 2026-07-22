const fs = require('fs');
const path = require('path');

const srcDir = 'D:/dev/tribe-neon/public';
const destDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';

const filesToCopy = [
  { src: 'menu/menu_allies.png', dest: 'menu_allies_final.png' },
  { src: 'menu/menu_fight.png', dest: 'menu_fight_final.png' },
  { src: 'menu/menu_conquest.png', dest: 'menu_conquest_final.png' },
  { src: 'hud_bg.png', dest: 'hud_bg_final.png' },
  { src: 'move_btn_bg.png', dest: 'move_btn_bg_final.png' }
];

filesToCopy.forEach(item => {
  const srcPath = path.join(srcDir, item.src);
  const destPath = path.join(destDir, item.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${srcPath} -> ${destPath}`);
  } else {
    console.error(`Source not found: ${srcPath}`);
  }
});
