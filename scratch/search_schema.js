const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../setup_schema.sql');
if (fs.existsSync(schemaPath)) {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes('quests') || line.toLowerCase().includes('quest_towns')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log("setup_schema.sql not found");
}
