// scripts/post-export.js
// This script ensures the export is properly formatted for Vercel

const fs = require('fs');
const path = require('path');

console.log('🚀 Running post-export script...');

// Check if dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ dist directory does NOT exist!');
  console.error('   Make sure you run: npm run export first');
  process.exit(1);
}
console.log('✅ dist directory found');

// Copy 404.html to dist folder
const source404 = path.join(__dirname, '..', '404.html');
const dest404 = path.join(distDir, '404.html');

if (fs.existsSync(source404)) {
  try {
    fs.copyFileSync(source404, dest404);
    console.log('✅ 404.html copied to dist folder');
  } catch (error) {
    console.warn('⚠️  Warning: Could not copy 404.html:', error.message);
  }
} else {
  console.log('ℹ️  404.html not found in root (skipping)');
}

// Copy theme.css to dist folder
const sourceTheme = path.join(__dirname, '..', 'theme.css');
const destTheme = path.join(distDir, 'theme.css');

if (fs.existsSync(sourceTheme)) {
  try {
    fs.copyFileSync(sourceTheme, destTheme);
    console.log('✅ theme.css copied to dist folder');
  } catch (error) {
    console.error('❌ Could not copy theme.css:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ theme.css not found in root directory!');
  console.error('   theme.css is required for proper styling');
  process.exit(1);
}

// List contents of dist
console.log('\n📁 Files in dist directory:');
const files = fs.readdirSync(distDir);
files.forEach(file => {
  const stats = fs.statSync(path.join(distDir, file));
  const type = stats.isDirectory() ? '📂' : '📄';
  console.log(`   ${type} ${file}`);
});

// Check for index.html (REQUIRED)
const indexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('\n❌ index.html NOT found in dist directory!');
  console.error('   Something went wrong with expo export');
  process.exit(1);
}
console.log('\n✅ index.html found');

// Inject theme.css into index.html if not already present
try {
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  
  // Check if theme.css is already linked
  if (indexHtml.includes('theme.css')) {
    console.log('✅ theme.css already linked in index.html');
  } else {
    console.log('ℹ️  Injecting theme.css link into index.html...');
    
    // Add theme.css link before </head>
    // Also add it as a <link> tag for proper loading
    const themeLink = '  <link rel="stylesheet" href="/theme.css">\n';
    
    if (indexHtml.includes('</head>')) {
      indexHtml = indexHtml.replace('</head>', themeLink + '</head>');
    } else {
      // If no </head> tag, add to beginning of <body>
      indexHtml = indexHtml.replace('<body>', '<body>\n' + themeLink);
    }
    
    fs.writeFileSync(indexPath, indexHtml, 'utf8');
    console.log('✅ theme.css link injected into index.html');
  }
} catch (error) {
  console.error('❌ Could not process index.html:', error.message);
  process.exit(1);
}

// Verify theme.css is accessible
if (fs.existsSync(destTheme)) {
  const stats = fs.statSync(destTheme);
  console.log(`✅ theme.css verified (${stats.size} bytes)`);
} else {
  console.error('❌ theme.css not found in dist after copy!');
  process.exit(1);
}

console.log('\n✨ Post-export script completed successfully!');
console.log('📦 Your app is ready to deploy to Vercel\n');