const fs = require('fs');
const path = require('path');

// Copy 404.html to dist folder after export
const source = path.join(__dirname, '..', '404.html');
const destination = path.join(__dirname, '..', 'dist', '404.html');

fs.copyFile(source, destination, (err) => {
  if (err) {
    console.error('Error copying 404.html:', err);
    process.exit(1);
  }
  console.log('404.html copied to dist folder successfully!');
});