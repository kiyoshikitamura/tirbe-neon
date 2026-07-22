const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/hooks/useBattle.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('initialEnemyParty') || line.includes('bossMaster') || line.includes('ENEMIES_MASTER')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
