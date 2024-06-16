#!/bin/bash

# Directory to be zipped
BUILD_DIR="build"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Find the root directory where package.json is located
ROOT_DIR="$(dirname "$(dirname "$(realpath "$0")")")"

# Navigate to the root directory
cd "$ROOT_DIR" || { echo -e "${RED}❌ Failed to navigate to the root directory.${NC}"; exit 1; }

# Get the version from package.json
VERSION=$(jq -r '.version' package.json)
ZIP_NAME="extension_build_${VERSION}.zip"

# Run npm build
echo -e "${CYAN}🚀 Running npm build...${NC}"
npm run build

# Check if the build command was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ npm run build failed.${NC}"
  exit 1
fi

# Check if the build directory exists
if [ ! -d "$BUILD_DIR" ]; then
  echo -e "${RED}❌ Build directory '$BUILD_DIR' does not exist.${NC}"
  exit 1
fi

# Remove the existing zip file if it exists
if [ -f "$ZIP_NAME" ]; then
  echo -e "${YELLOW}⚠️ Removing existing zip file '$ZIP_NAME'...${NC}"
  rm "$ZIP_NAME"
fi

# Create the zip file excluding *.map files and specified directories/files
echo -e "${BLUE}📦 Creating zip file '$ZIP_NAME' excluding *.map files and specified directories/files...${NC}"
zip -r "$ZIP_NAME" "$BUILD_DIR" -x "*.map" "$BUILD_DIR/example-comments/*" "$BUILD_DIR/icon.png"

echo -e "${GREEN}✅ Build directory '$BUILD_DIR' has been zipped into '$ZIP_NAME' excluding map files and specified directories/files.${NC}"
