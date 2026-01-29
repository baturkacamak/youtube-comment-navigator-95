#!/bin/bash

# Exit on error
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CURVER=$(jq -r '.version' package.json)
NEW_VERSION=$1

# Interactive mode if no argument provided
if [ -z "$NEW_VERSION" ]; then
  echo -e "==> Current version: ${YELLOW}📦 ${CURVER}${NC}"
  echo -e "${BLUE}Select update type:${NC}"
  
  options=("Patch" "Minor" "Major" "Cancel")
  select opt in "${options[@]}"; do
      case $opt in
          "Patch") 
            NEW_VERSION=$(echo ${CURVER} | awk -F. -v OFS=. '{$3++;print $1,$2,$3}')
            break 
            ;;
          "Minor") 
            NEW_VERSION=$(echo ${CURVER} | awk -F. -v OFS=. '{$2++;print $1,$2,0}')
            break 
            ;;
          "Major") 
            NEW_VERSION=$(echo ${CURVER} | awk -F. -v OFS=. '{$1++;print $1,0,0}')
            break 
            ;;
          "Cancel") exit 0 ;;
          *) echo -e "${RED}Invalid option${NC}"; continue ;;
      esac
  done
fi

if [ -z "$NEW_VERSION" ]; then
  echo "No version selected."
  exit 1
fi

echo -e "${BLUE}🚀 Bumping version to $NEW_VERSION...${NC}"

# Update package.json and create git tag
# npm version updates package.json, commits, and tags
npm version "$NEW_VERSION" -m "chore(release): bump version to %s"

# Sync manifest.json
jq --arg v "$NEW_VERSION" '.version = $v' manifest.json > manifest.tmp && mv manifest.tmp manifest.json

# Update README.md
README_FILE="README.md"
if [ -f "$README_FILE" ]; then
  # Update badge: [![Version](.../version-X.X.X-blue.svg)]
  sed -i "s/version-[0-9]*\.[0-9]*\.[0-9]*-blue.svg/version-${NEW_VERSION}-blue.svg/" "$README_FILE"
  
  # Update just bump example: just bump X.X.X
  sed -i "s/just bump [0-9]*\.[0-9]*\.[0-9]*/just bump ${NEW_VERSION}/" "$README_FILE"
  
  # Update zip filename: youtube-comment-navigator-95_vX.X.X.zip
  sed -i "s/youtube-comment-navigator-95_v[0-9]*\.[0-9]*\.[0-9]*\.zip/youtube-comment-navigator-95_v${NEW_VERSION}.zip/" "$README_FILE"
fi

git add manifest.json README.md
git commit --amend --no-edit # Add manifest.json and README.md to the same commit created by npm version

echo -e "${GREEN}✅ Version bumped to $NEW_VERSION${NC}"
echo -e "${YELLOW}👉 Don't forget to push: git push && git push --tags${NC}"
