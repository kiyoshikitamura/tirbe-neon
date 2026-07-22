const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../');
const files = fs.readdirSync(dir);

files.forEach((file) => {
  if (file.endsWith('.sql')) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes('quests') || line.toLowerCase().includes('quest_towns')) {
        console.log(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }
});
