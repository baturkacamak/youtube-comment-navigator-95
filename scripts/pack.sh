#!/bin/bash

# Exit on error
set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the version from package.json
VERSION=$(node -p "require('./package.json').version")
ZIP_NAME="youtube-comment-navigator-95_v${VERSION}.zip"
BUILD_DIR="dist"

echo -e "${BLUE}🚀 Building extension...${NC}"
npm run build

if [ ! -d "$BUILD_DIR" ]; then
  echo -e "\033[0;31m❌ Build directory '$BUILD_DIR' not found!${NC}"
  exit 1
fi

# Remove existing zip
if [ -f "$ZIP_NAME" ]; then
  rm "$ZIP_NAME"
fi

echo -e "${BLUE}📦 Creating zip file: $ZIP_NAME${NC}"
# Zip the content of dist/ into the zip file
cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" . -x "*.map"
cd ..

echo -e "${GREEN}✅ Successfully created $ZIP_NAME${NC}"
