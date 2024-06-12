#!/bin/bash

# ANSI Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories and files
ROOTDIR=$(dirname "$0")/..
PACKAGE_FILE="${ROOTDIR}/package.json"
MANIFEST_FILE="${ROOTDIR}/public/manifest.json"

# Function to check if a file exists
check_file() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}❌ Error: $1 file not found.${NC}"
        exit 1
    fi
}

# Function to update the version number
update_version() {
    local file=$1 version=$2 current_version=$3
    local sed_command=""

    # Define the sed command based on the file type
    if [ "$file" == "$PACKAGE_FILE" ]; then
        sed_command="s~\"version\": \"[0-9.]*\"~\"version\": \"$version\"~g"
    elif [ "$file" == "$MANIFEST_FILE" ]; then
        sed_command="s~\"version\": \"[0-9.]*\"~\"version\": \"$version\"~g"
    fi

    # Execute the sed command
    if [ "$(uname -s)" = "Darwin" ]; then
        sed -i '' -e "$sed_command" "$file"
    else
        sed -i -e "$sed_command" "$file"
    fi

    # Check if the update was successful
    if ! grep -q "$version" "$file"; then
        echo -e "${RED}❌ Error: Failed to update version in $file.${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Version updated successfully in $file.${NC}"
}

# Check if the necessary files exist
check_file "${PACKAGE_FILE}"
check_file "${MANIFEST_FILE}"

# Extract and validate the current version from package.json
CURVER=$(grep -oP '"version": "\K[0-9.]+(?=")' "${PACKAGE_FILE}")

if ! [[ $CURVER =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ Error: Current version format in package.json is invalid.${NC}"
    exit 1
fi

echo -e "==> Current version: ${YELLOW}📦 ${CURVER}${NC}"

# Function to print the help message
print_help() {
    echo -e "${BLUE}ℹ️ Update types:${NC}"
    echo -e "  ${GREEN}🛠️ Patch:${NC} Increment the patch version for backwards-compatible bug fixes (e.g., 1.0.0 -> 1.0.1)"
    echo -e "  ${GREEN}🚀 Minor:${NC} Increment the minor version for new, backwards-compatible functionality (e.g., 1.0.0 -> 1.1.0)"
    echo -e "  ${GREEN}💥 Major:${NC} Increment the major version for breaking changes (e.g., 1.0.0 -> 2.0.0)"
    echo -e "  ${GREEN}❓ Help:${NC}  Show this message"
}

PS3='Please enter your choice: '
if [ -t 1 ]; then
  exec < /dev/tty
fi

options=("🛠️ Patch" "🚀 Minor" "💥 Major" "❓ Help")
select opt in "${options[@]}"; do
    case $opt in
        "🛠️ Patch") NEWVER=$(echo ${CURVER} | awk -F. -v OFS=. '{$3++;print $1,$2,$3}') ;;
        "🚀 Minor") NEWVER=$(echo ${CURVER} | awk -F. -v OFS=. '{$2++;print $1,$2,0}') ;;
        "💥 Major") NEWVER=$(echo ${CURVER} | awk -F. -v OFS=. '{$1++;print $1,0,0}') ;;
        "❓ Help") print_help; continue ;;
        *) echo -e "${RED}❌ Invalid selection. Please choose a valid option.${NC}"; continue ;;
    esac
    break
done

# Handle case when user selects Help or exits without selection
if [ -z "$NEWVER" ]; then
    exit 0
fi

# Update the version in package.json and manifest.json
update_version "${PACKAGE_FILE}" "${NEWVER}" "${CURVER}"
update_version "${MANIFEST_FILE}" "${NEWVER}" "${CURVER}"
echo -e "==> New version: ${YELLOW}📦 ${NEWVER}${NC}"

# Add changes to Git
git add "${PACKAGE_FILE}" "${MANIFEST_FILE}"

# Commit the changes
COMMIT_MESSAGE="Update version to ${NEWVER}"
git commit -m "${COMMIT_MESSAGE}"

# Create a new Git tag
git tag "${NEWVER}"

# Push the commit and tag to the remote repository
git push && git push --tags

echo -e "${GREEN}🎉 Version updated to ${NEWVER}, commit and tag created, and pushed to remote repository.${NC}"
