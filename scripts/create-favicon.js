const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

async function createFavicon() {
  try {
    const inputPath = path.join(__dirname, '..', 'assets', 'logo.png');
    const outputPath = path.join(__dirname, '..', 'favicon.ico');
    
    // Check if logo.png exists
    if (!fs.existsSync(inputPath)) {
      console.error('Error: logo.png not found in assets folder');
      process.exit(1);
    }
    
    // Create multiple sizes for the ICO file
    const sizes = [16, 32, 48];
    const images = [];
    
    for (const size of sizes) {
      const buffer = await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toBuffer();
      images.push(buffer);
    }
    
    // Create ICO file using to-ico
    const icoBuffer = await toIco(images);
    fs.writeFileSync(outputPath, icoBuffer);
    
    console.log('✅ Favicon created successfully at:', outputPath);
    console.log('_sizes included:', sizes.join(', '));
  } catch (error) {
    console.error('Error creating favicon:', error.message);
    process.exit(1);
  }
}

createFavicon();