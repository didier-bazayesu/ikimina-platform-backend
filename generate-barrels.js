const fs = require('fs');
const path = require('path');

function generateBarrels(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let exportsLines = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      generateBarrels(path.join(dir, entry.name));
      // Only export the directory if it contains an index.ts
      if (fs.existsSync(path.join(dir, entry.name, 'index.ts'))) {
         exportsLines.push(`export * from './${entry.name}';`);
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'index.ts' && entry.name !== 'main.ts') {
      const nameWithoutExt = entry.name.replace('.ts', '');
      exportsLines.push(`export * from './${nameWithoutExt}';`);
    }
  }

  if (exportsLines.length > 0) {
    fs.writeFileSync(path.join(dir, 'index.ts'), exportsLines.join('\n') + '\n');
    console.log('Created ' + path.join(dir, 'index.ts'));
  }
}

generateBarrels(path.join(__dirname, 'src'));
