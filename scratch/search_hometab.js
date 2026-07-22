const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/components/HomeTab.css');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('mypage-circle-menu') || line.includes('mypage-circle-btn') || line.includes('mypage-badge-dot')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
