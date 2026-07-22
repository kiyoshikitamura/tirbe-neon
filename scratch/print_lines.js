const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/context/GameContext.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

for (let i = 2620; i < 2640; i++) {
  if (i < lines.length) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
