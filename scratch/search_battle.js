const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/context/GameContext.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('useBattle')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
