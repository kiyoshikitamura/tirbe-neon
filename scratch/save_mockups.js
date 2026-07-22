const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/scope/.gemini/antigravity/brain/9dc10df7-99d2-4611-8603-1b4b94a7b762';
const workspaceDir = 'D:/dev/tribe-neon';
const mockupsDestDir = path.join(workspaceDir, 'mockups');

// フォルダの作成
if (!fs.existsSync(mockupsDestDir)) {
  fs.mkdirSync(mockupsDestDir, { recursive: true });
}

const mockupsToSave = [
  {
    src: path.join(brainDir, 'pc_ui_mockup_v14_1784134189656.png'),
    dest: path.join(mockupsDestDir, 'pc_ui_mockup_final.png'),
    label: 'PC版決定版モックアップ (v14)'
  },
  {
    src: path.join(brainDir, 'mobile_ui_mockup_v6_1784132166535.png'),
    dest: path.join(mockupsDestDir, 'mobile_ui_mockup_final.png'),
    label: 'モバイル版決定版モックアップ (v6)'
  },
  {
    src: path.join(brainDir, 'unified_buttons_black_calligraphy_v6_raw_1784136653250.png'),
    dest: path.join(mockupsDestDir, 'unified_buttons_raw_final.png'),
    label: '3連丸ボタン決定版生アセット (v23)'
  }
];

console.log('--- Archiving approved UI mockups to workspace ---');

mockupsToSave.forEach(item => {
  if (fs.existsSync(item.src)) {
    fs.copyFileSync(item.src, item.dest);
    console.log(`[SAVED] ${item.label}:\n  Source: ${item.src}\n  Saved to: ${item.dest}\n`);
  } else {
    console.error(`[ERROR] Source not found: ${item.src}`);
  }
});

console.log('--- Verifying transparent PNG assets in workspace public/ ---');
const publicAssets = [
  path.join(workspaceDir, 'public/menu/menu_allies.png'),
  path.join(workspaceDir, 'public/menu/menu_fight.png'),
  path.join(workspaceDir, 'public/menu/menu_conquest.png'),
  path.join(workspaceDir, 'public/hud_bg.png'),
  path.join(workspaceDir, 'public/move_btn_bg.png')
];

publicAssets.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`[VERIFIED] Active Asset exists: ${filePath} (${fs.statSync(filePath).size} bytes)`);
  } else {
    console.error(`[MISSING] Active Asset NOT found: ${filePath}`);
  }
});
