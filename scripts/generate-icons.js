const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const sizes = [16, 32, 48, 128];
const states = ['active', 'inactive'];

async function generateIcons() {
  const srcDir = path.join(__dirname, '../src/icons');
  
  for (const state of states) {
    const svgPath = path.join(srcDir, `icon-${state}.svg`);
    const svgContent = await fs.readFile(svgPath);
    
    for (const size of sizes) {
      const outputPath = path.join(srcDir, `icon-${state}-${size}.png`);
      await sharp(svgContent)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated ${outputPath}`);
    }
  }
}

generateIcons().catch(console.error); 