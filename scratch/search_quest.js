const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/utils/supabase.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('m_exp_01')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
