const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        searchDir(fullPath);
      }
    } else {
      const ext = path.extname(file);
      if (ext === '.ts' || ext === '.tsx' || ext === '.css') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.toLowerCase().includes('expedition')) {
          console.log(`Match in: ${fullPath}`);
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes('expedition')) {
              console.log(`  Line ${index + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

searchDir(path.join(__dirname, '../src'));
console.log("Search completed.");
