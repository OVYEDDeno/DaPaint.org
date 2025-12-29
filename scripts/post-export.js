const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const assetsDir = path.join(__dirname, '../assets');

console.log('--- Starting Post-Export Script ---');

// 1. Verify dist directory exists
if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory not found. Export might have failed.');
    process.exit(1);
}

// 2. Ensure favicon.ico and theme.css are in dist
const filesToCopy = ['favicon.ico', 'theme.css'];
filesToCopy.forEach(file => {
    const src = path.join(__dirname, '..', file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${file} to dist/`);
    } else {
        console.log(`Warning: ${file} not found in root.`);
    }
});

// 3. Simple build verification
const indexHtml = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtml)) {
    const content = fs.readFileSync(indexHtml, 'utf8');
    if (content.length < 100) {
        console.error('Error: index.html seems too short. Build might be incomplete.');
        process.exit(1);
    }
    console.log('Build verification: index.html looks good.');
}

console.log('--- Post-Export Script Completed Successfully ---');
