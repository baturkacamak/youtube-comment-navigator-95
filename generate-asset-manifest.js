const fs = require('fs');
const path = require('path');

function generateAssetManifest(buildDir, isProduction) {
  console.log(`Generating asset-manifest.json for ${isProduction ? 'production' : 'local'} build...`);
  
  const manifest = {
    files: {
      'main.js': 'static/js/bundle.js',
      'main.css': 'static/css/main.css',
    },
    entrypoints: ['static/js/bundle.js', 'static/css/main.css']
  };

  fs.writeFileSync(
    path.join(buildDir, 'asset-manifest.json'), 
    JSON.stringify(manifest, null, isProduction ? 0 : 2)
  );
  
  console.log(`Asset manifest generated in ${buildDir}/asset-manifest.json`);
}

// Get command line arguments
const args = process.argv.slice(2);
const buildDir = args[0] || 'dist';
const isProduction = args[1] === 'production';

generateAssetManifest(buildDir, isProduction); 