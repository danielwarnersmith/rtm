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

# Get script directory for helper scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Fix image paths
echo -e "${YELLOW}Fixing image paths...${NC}"
python3 "$SCRIPT_DIR/scripts/fix-image-paths.py" "$MDX_FILE" "$MACHINE_NAME" > /tmp/img_fixed.mdx
cat /tmp/img_fixed.mdx > "$MDX_FILE"

# Fix MDX compatibility issues
echo -e "${YELLOW}Fixing MDX compatibility issues...${NC}"
python3 "$SCRIPT_DIR/scripts/fix-mdx-compatibility.py" "$MDX_FILE"

# Fix table formatting
echo -e "${YELLOW}Fixing table formatting...${NC}"
python3 "$SCRIPT_DIR/scripts/fix-tables.py" "$MDX_FILE" > /tmp/fixed_tables.mdx
cat /tmp/fixed_tables.mdx > "$MDX_FILE"

# Add TOC links
echo -e "${YELLOW}Adding Table of Contents links...${NC}"
python3 "$SCRIPT_DIR/scripts/add-toc-links.py" "$MDX_FILE" > /tmp/toc_linked.mdx
cat /tmp/toc_linked.mdx > "$MDX_FILE"

# Cleanup temp files
rm -f /tmp/img_fixed.mdx /tmp/fixed_tables.mdx /tmp/toc_linked.mdx

echo ""
echo -e "${GREEN}✓ Import complete!${NC}"
echo ""
echo "Files created:"
echo "  - $MDX_FILE"
echo "  - $PUBLIC_IMAGES_DIR/ ($IMAGE_COUNT images)"
echo ""
echo "Fixes applied:"
echo "  - Image paths converted to /machines/$MACHINE_NAME/images/"
echo "  - Self-closing HTML tags fixed (<br>, <hr>, <img>)"
echo "  - Angle bracket labels escaped (<ALLCAPS>)"
echo "  - Abbreviations normalized (USB/CV/FX/LFO)"
echo "  - Malformed TOC separator rows normalized"
echo "  - Table section headers converted to headings"
echo "  - Missing table separator rows added"
echo "  - Duplicate table separator rows removed"
echo "  - Table separator column counts corrected"
echo "  - Merged TOC entries split into separate rows"
echo "  - Empty table rows removed"
echo "  - Table of Contents entries linked to sections"
echo "  - Spurious mid-document TOC headers removed"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Run: python3 scripts/convert-manual-conventions.py $MDX_FILE"
echo "  2. Classify Tip/Warning icons (see docs/import-checklist.md)"
echo "  3. Edit $MDX_FILE to add tags and verify frontmatter"
echo "  4. Run 'npm run build' to check for MDX errors"
echo ""
echo "To test locally:"
echo "  npm run dev"
echo "  Open: http://localhost:3000/machines/$MACHINE_NAME/manual"
