#!/bin/bash

# Exit on error
set -e

# ANSI Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Directories and files
SCRIPT_DIR=$(dirname "$0")
ROOTDIR="${SCRIPT_DIR}/.."
PACKAGE_FILE="${ROOTDIR}/package.json"
MANIFEST_FILE="${ROOTDIR}/manifest.json"
README_FILE="${ROOTDIR}/README.md"

# Function to print a separator line
print_separator() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check if a file exists
check_file() {
    if [ ! -f "$1" ]; then
        echo -e "❌ ${RED}Error: $1 file not found.${NC}"
        exit 1
    fi
}

# Function to check required dependencies
check_dependencies() {
    local missing=()

    if ! command -v jq &> /dev/null; then
        missing+=("jq")
    fi

    if ! command -v npm &> /dev/null; then
        missing+=("npm")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "❌ ${RED}Error: Missing required dependencies: ${missing[*]}${NC}"
        exit 1
    fi
}

# Function to validate version format
validate_version() {
    local version=$1
    if ! [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo -e "❌ ${RED}Error: Invalid version format. Expected: X.Y.Z${NC}"
        exit 1
    fi
}

# Function to update file with cross-platform sed
update_file_sed() {
    local file=$1
    local pattern=$2
    local replacement=$3

    if [ "$(uname -s)" = "Darwin" ]; then
        sed -i '' -e "s|${pattern}|${replacement}|g" "$file"
    else
        sed -i -e "s|${pattern}|${replacement}|g" "$file"
    fi
}

# Function to print the help message
print_help() {
    print_separator
    echo -e "📖 ${BOLD}${BLUE}Version Bump Helper${NC}"
    print_separator
    echo ""
    echo -e "${BOLD}Usage:${NC}"
    echo -e "  ./bump.sh           Interactive mode"
    echo -e "  ./bump.sh X.Y.Z     Direct version bump"
    echo -e "  ./bump.sh -h        Show this help"
    echo ""
    echo -e "${BOLD}Update Types:${NC}"
    echo -e "  🔧 ${GREEN}Patch${NC}  Backwards-compatible bug fixes      (1.0.0 → 1.0.${YELLOW}1${NC})"
    echo -e "  🚀 ${GREEN}Minor${NC}  New backwards-compatible features   (1.0.0 → 1.${YELLOW}1${NC}.0)"
    echo -e "  💥 ${GREEN}Major${NC}  Breaking changes                    (1.0.0 → ${YELLOW}2${NC}.0.0)"
    echo ""
    echo -e "${BOLD}Files Updated:${NC}"
    echo -e "  📄 package.json    (version field)"
    echo -e "  📄 manifest.json   (version field)"
    echo -e "  📄 README.md       (badge, examples, zip filename)"
    echo ""
    print_separator
}

# Check dependencies
check_dependencies

# Check if the necessary files exist
check_file "${PACKAGE_FILE}"
check_file "${MANIFEST_FILE}"

# Extract current version using jq
CURVER=$(jq -r '.version' "${PACKAGE_FILE}")
validate_version "$CURVER"

NEW_VERSION=$1

# Handle help flag
if [ "$NEW_VERSION" = "-h" ] || [ "$NEW_VERSION" = "--help" ]; then
    print_help
    exit 0
fi

# Interactive mode if no argument provided
if [ -z "$NEW_VERSION" ]; then
    # Pre-calculate version options
    PATCH_VER=$(echo "${CURVER}" | awk -F. -v OFS=. '{$3++;print $1,$2,$3}')
    MINOR_VER=$(echo "${CURVER}" | awk -F. -v OFS=. '{$2++;print $1,$2,0}')
    MAJOR_VER=$(echo "${CURVER}" | awk -F. -v OFS=. '{$1++;print $1,0,0}')

    print_separator
    echo -e "${BOLD}${BLUE}📦 Version Bump Tool${NC}"
    print_separator
    echo ""
    echo -e "Current version: ${YELLOW}${CURVER}${NC}"
    echo ""
    echo -e "${BOLD}Select update type:${NC}"

    PS3='Please enter your choice: '
    if [ -t 1 ]; then
        exec < /dev/tty
    fi

    options=(
        "🔧 Patch  │ ${CURVER} → ${PATCH_VER}  │ bug fixes"
        "🚀 Minor  │ ${CURVER} → ${MINOR_VER}  │ new features"
        "💥 Major  │ ${CURVER} → ${MAJOR_VER}  │ breaking changes"
        "❓ Help"
        "❌ Cancel"
    )
    select opt in "${options[@]}"; do
        case $REPLY in
            1)
                NEW_VERSION="$PATCH_VER"
                break
                ;;
            2)
                NEW_VERSION="$MINOR_VER"
                break
                ;;
            3)
                NEW_VERSION="$MAJOR_VER"
                break
                ;;
            4)
                print_help
                continue
                ;;
            5)
                echo -e "👋 ${YELLOW}Operation cancelled.${NC}"
                exit 0
                ;;
            *)
                echo -e "⚠️  ${RED}Invalid option. Please select 1-5.${NC}"
                continue
                ;;
        esac
    done
fi

# Exit if no version was selected
if [ -z "$NEW_VERSION" ]; then
    echo -e "❌ ${RED}No version selected.${NC}"
    exit 1
fi

# Validate the new version format
validate_version "$NEW_VERSION"

echo ""
print_separator
echo -e "🎯 ${BOLD}Bumping version: ${YELLOW}${CURVER}${NC} → ${GREEN}${NEW_VERSION}${NC}"
print_separator
echo ""

# Update package.json using npm version (creates commit and tag)
echo -e "📝 ${BLUE}Updating package.json...${NC}"
npm version "$NEW_VERSION" -m "chore(release): bump version to %s" --no-git-tag-version
echo -e "   ${GREEN}✓ package.json updated${NC}"

# Update manifest.json
echo -e "📝 ${BLUE}Updating manifest.json...${NC}"
jq --arg v "$NEW_VERSION" '.version = $v' "${MANIFEST_FILE}" > "${MANIFEST_FILE}.tmp" && mv "${MANIFEST_FILE}.tmp" "${MANIFEST_FILE}"

# Verify manifest.json update
if ! grep -q "\"version\": \"$NEW_VERSION\"" "${MANIFEST_FILE}"; then
    echo -e "❌ ${RED}Error: Failed to update version in manifest.json${NC}"
    exit 1
fi
echo -e "   ${GREEN}✓ manifest.json updated${NC}"

# Update README.md if it exists
if [ -f "$README_FILE" ]; then
    echo -e "📝 ${BLUE}Updating README.md...${NC}"

    # Update version badge
    update_file_sed "$README_FILE" "version-[0-9]*\.[0-9]*\.[0-9]*-blue.svg" "version-${NEW_VERSION}-blue.svg"

    # Update just bump example
    update_file_sed "$README_FILE" "just bump [0-9]*\.[0-9]*\.[0-9]*" "just bump ${NEW_VERSION}"

    # Update zip filename
    update_file_sed "$README_FILE" "youtube-comment-navigator-95_v[0-9]*\.[0-9]*\.[0-9]*\.zip" "youtube-comment-navigator-95_v${NEW_VERSION}.zip"

    echo -e "   ${GREEN}✓ README.md updated${NC}"
fi

# Git operations
echo -e "📦 ${BLUE}Committing changes...${NC}"
git add "${PACKAGE_FILE}" "${MANIFEST_FILE}"
[ -f "$README_FILE" ] && git add "${README_FILE}"

git commit -m "chore(release): bump version to ${NEW_VERSION}"
echo -e "   ${GREEN}✓ Changes committed${NC}"

echo -e "🏷️  ${BLUE}Creating tag...${NC}"
git tag "v${NEW_VERSION}"
echo -e "   ${GREEN}✓ Tag v${NEW_VERSION} created${NC}"

echo ""
print_separator
echo -e "🎉 ${GREEN}${BOLD}Version bump complete!${NC}"
print_separator
echo ""
echo -e "📤 ${YELLOW}Next steps:${NC}"
echo -e "   git push && git push --tags"
echo ""

# Ask if user wants to push
if [ -t 1 ]; then
    read -p "🚀 Push changes now? [y/N]: " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "📤 ${BLUE}Pushing to remote...${NC}"
        git push && git push --tags
        echo -e "   ${GREEN}✓ Pushed to remote${NC}"
    fi
fi

echo ""
echo -e "✨ ${GREEN}Done!${NC}"
