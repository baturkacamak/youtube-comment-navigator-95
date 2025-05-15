const fs = require('fs');
const path = require('path');

function adjustCssScaling(cssFilePath, scaleFactor = 1.2) {
  console.log(`Adjusting CSS scaling in ${cssFilePath} with factor ${scaleFactor}...`);
  
  if (!fs.existsSync(cssFilePath)) {
    console.error(`CSS file not found: ${cssFilePath}`);
    return;
  }
  
  let cssContent = fs.readFileSync(cssFilePath, 'utf8');
  
  // Add a scaling rule to the beginning of the CSS file
  const scalingRule = `
/* Auto-generated scaling for local build */
#youtube-comment-navigator-app {
  font-size: ${scaleFactor}rem !important;
}
`;
  
  cssContent = scalingRule + cssContent;
  fs.writeFileSync(cssFilePath, cssContent);
  
  console.log('CSS scaling adjustment completed.');
}

// Get command line arguments
const args = process.argv.slice(2);
const cssFilePath = args[0] || 'dist-local/static/css/main.css';
const scaleFactor = parseFloat(args[1] || '1.2');

adjustCssScaling(cssFilePath, scaleFactor); 