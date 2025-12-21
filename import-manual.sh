#!/usr/bin/env bash
set -e

# Import a converted PDF manual into the RTM project
# Usage: ./import-manual.sh <machine-name> <source-md-file> [title]
#
# Example:
#   ./import-manual.sh digitakt ./converted/digitakt.md "Digitakt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Usage: $0 <machine-name> <source-md-file> [title]${NC}"
    echo ""
    echo "Arguments:"
    echo "  machine-name    Directory name (kebab-case, e.g., 'digitakt' or 'analog-rytm-mkii')"
    echo "  source-md-file  Path to the converted markdown file"
    echo "  title           Optional: Title for frontmatter (defaults to machine-name)"
    echo ""
    echo "Example:"
    echo "  $0 digitakt ./converted/digitakt.md \"Digitakt\""
    exit 1
fi

MACHINE_NAME="$1"
SOURCE_MD="$2"
TITLE="${3:-$MACHINE_NAME}"
DATE=$(date +%Y-%m-%d)

# Derive paths
SOURCE_DIR=$(dirname "$SOURCE_MD")
SOURCE_BASENAME=$(basename "$SOURCE_MD" .md)
SOURCE_IMAGES_DIR="$SOURCE_DIR/$SOURCE_BASENAME"

CONTENT_DIR="content/machines/$MACHINE_NAME"
PUBLIC_IMAGES_DIR="public/machines/$MACHINE_NAME/images"
MDX_FILE="$CONTENT_DIR/manual.mdx"

echo -e "${GREEN}Importing manual for: $MACHINE_NAME${NC}"
echo "Source: $SOURCE_MD"
echo "Target: $MDX_FILE"
echo ""

# Check if source exists
if [ ! -f "$SOURCE_MD" ]; then
    echo -e "${RED}Error: Source file not found: $SOURCE_MD${NC}"
    exit 1
fi

# Create directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p "$CONTENT_DIR"
mkdir -p "$PUBLIC_IMAGES_DIR"

# Copy images - check both subdirectory and same directory
echo -e "${YELLOW}Copying images...${NC}"
if [ -d "$SOURCE_IMAGES_DIR" ]; then
    # Images in subdirectory (some Marker configs)
    find "$SOURCE_IMAGES_DIR" -type f \( -name "*.jpeg" -o -name "*.jpg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" \) -exec cp {} "$PUBLIC_IMAGES_DIR/" \;
else
    # Images in same directory as markdown (default Marker output)
    find "$SOURCE_DIR" -maxdepth 1 -type f \( -name "*.jpeg" -o -name "*.jpg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" \) -exec cp {} "$PUBLIC_IMAGES_DIR/" \;
fi
IMAGE_COUNT=$(ls -1 "$PUBLIC_IMAGES_DIR" 2>/dev/null | wc -l | tr -d ' ')
echo "  Copied $IMAGE_COUNT images"

# Create MDX file with frontmatter
echo -e "${YELLOW}Creating MDX file...${NC}"

# Add frontmatter
cat > "$MDX_FILE" << EOF
---
title: "$TITLE"
description: "Owner's manual for the $TITLE"
tags: []
date: "$DATE"
---

EOF

# Append the markdown content
cat "$SOURCE_MD" >> "$MDX_FILE"

# Fix image paths - handle various Marker output formats
echo -e "${YELLOW}Fixing image paths...${NC}"

# Replace relative image paths with absolute paths to public directory
# Handle paths with subdirectories: ![](images/...), ![](filename/...)
sed -i '' -E "s|\!\[([^]]*)\]\(([^)]*)/([^/)]+\.(jpeg|jpg|png|gif|webp))\)|\![\1](/machines/$MACHINE_NAME/images/\3)|g" "$MDX_FILE"

# Handle direct image references: ![](filename.jpeg)
sed -i '' -E "s|\!\[([^]]*)\]\(([^/)]+\.(jpeg|jpg|png|gif|webp))\)|\![\1](/machines/$MACHINE_NAME/images/\2)|g" "$MDX_FILE"

# Fix HTML self-closing tags for MDX compatibility
echo -e "${YELLOW}Fixing MDX compatibility issues...${NC}"
sed -i '' 's/<br>/<br \/>/g' "$MDX_FILE"
sed -i '' 's/<hr>/<hr \/>/g' "$MDX_FILE"
sed -i '' 's/<img \([^>]*[^/]\)>/<img \1 \/>/g' "$MDX_FILE"

# Escape common angle bracket patterns used in manuals (not HTML tags)
echo -e "${YELLOW}Escaping angle bracket labels...${NC}"

# Common patterns in Elektron manuals and similar
sed -i '' 's/<PATTERN PAGE>/\\<PATTERN PAGE\\>/g' "$MDX_FILE"
sed -i '' 's/<PATTERN MODE>/\\<PATTERN MODE\\>/g' "$MDX_FILE"
sed -i '' 's/<PADS>/\\<PADS\\>/g' "$MDX_FILE"
sed -i '' 's/<PAD>/\\<PAD\\>/g' "$MDX_FILE"
sed -i '' 's/<TRIG>/\\<TRIG\\>/g' "$MDX_FILE"
sed -i '' 's/<LED>/\\<LED\\>/g' "$MDX_FILE"
sed -i '' 's/<SCREEN>/\\<SCREEN\\>/g' "$MDX_FILE"
sed -i '' 's/<DISPLAY>/\\<DISPLAY\\>/g' "$MDX_FILE"
sed -i '' 's/<BUTTON>/\\<BUTTON\\>/g' "$MDX_FILE"
sed -i '' 's/<ENCODER>/\\<ENCODER\\>/g' "$MDX_FILE"
sed -i '' 's/<KNOB>/\\<KNOB\\>/g' "$MDX_FILE"

# Generic pattern: escape <ALLCAPS> or <ALLCAPS ALLCAPS> that aren't HTML
# This catches most hardware label patterns
sed -i '' -E 's/<([A-Z][A-Z0-9 ]+[A-Z0-9])>/\\<\1\\>/g' "$MDX_FILE"

echo ""
echo -e "${GREEN}✓ Import complete!${NC}"
echo ""
echo "Files created:"
echo "  - $MDX_FILE"
echo "  - $PUBLIC_IMAGES_DIR/ ($(ls -1 "$PUBLIC_IMAGES_DIR" 2>/dev/null | wc -l | tr -d ' ') images)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Edit $MDX_FILE to add tags and verify frontmatter"
echo "  2. Run 'npm run build' to check for MDX errors"
echo "  3. If build fails, check for unescaped angle brackets"
echo ""
echo "To test locally:"
echo "  npm run dev"
echo "  Open: http://localhost:3000/machines/$MACHINE_NAME/manual"

