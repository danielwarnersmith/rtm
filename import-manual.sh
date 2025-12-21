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

# Escape angle bracket patterns used in manuals (not HTML tags)
echo -e "${YELLOW}Escaping angle bracket labels...${NC}"
# Generic pattern: escape <ALLCAPS> or <ALLCAPS ALLCAPS> that aren't HTML
sed -i '' -E 's/<([A-Z][A-Z0-9 ]+[A-Z0-9])>/\\<\1\\>/g' "$MDX_FILE"

# Fix table formatting issues from PDF conversion
echo -e "${YELLOW}Fixing table formatting...${NC}"

# Create temporary Python script for complex table fixes
cat > /tmp/fix_tables.py << 'PYTHON_SCRIPT'
import re
import sys

content = open(sys.argv[1]).read()

# 1. Convert table section headers to actual headings
# Pattern: | SECTION_NAME | | | | | followed by separator
def fix_section_headers(content):
    pattern = r'\n\| ([A-Z][A-Z ]+?) +\|(?:\s*\|)+\s*\n(\|[-|: ]+\|)\n(\| [A-Za-z])'
    
    def replace_header(match):
        section_name = match.group(1).strip()
        rest = match.group(3)
        return f"\n#### {section_name}\n\n{rest}"
    
    return re.sub(pattern, replace_header, content)

# 2. Add missing table separator rows after header rows
def fix_table_separators(content):
    lines = content.split('\n')
    result = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this looks like a table header
        if (line.strip().startswith('|') and 
            line.strip().endswith('|') and 
            '---' not in line and
            i + 1 < len(lines)):
            
            next_line = lines[i + 1]
            
            # If next line is a table row but NOT a separator
            if (next_line.strip().startswith('|') and 
                next_line.strip().endswith('|') and 
                '---' not in next_line):
                
                # Check if this might be a header row
                header_words = ['Parameter', 'Name', 'CC MSB', 'CC LSB', 'NRPN', 'Description', 
                               'Type', 'PAD', 'Machine', 'Value', 'Section', 'Page']
                is_likely_header = any(word in line for word in header_words)
                
                if is_likely_header:
                    cols = line.count('|') - 1
                    if cols > 0:
                        separator = '|' + '|'.join(['---'] * cols) + '|'
                        result.append(line)
                        result.append(separator)
                        i += 1
                        continue
        
        result.append(line)
        i += 1
    
    return '\n'.join(result)

# 3. Remove trailing empty cells from table rows
def clean_table_rows(content):
    return re.sub(r'\|\s*\|\s*$', '|', content, flags=re.MULTILINE)

# Apply fixes
content = fix_section_headers(content)
content = fix_table_separators(content)
content = clean_table_rows(content)

print(content)
PYTHON_SCRIPT

python3 /tmp/fix_tables.py "$MDX_FILE" > /tmp/fixed_manual.mdx
cat /tmp/fixed_manual.mdx > "$MDX_FILE"

# Add TOC links
echo -e "${YELLOW}Adding Table of Contents links...${NC}"

cat > /tmp/add_toc_links.py << 'PYTHON_SCRIPT'
import re
import sys

def to_anchor(text):
    """Convert section title to anchor ID"""
    text = text.strip().lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = re.sub(r'^-|-$', '', text)
    return text

def process_toc_entry(entry_text):
    """Convert TOC entry text to markdown links"""
    parts = re.split(r'<br\s*/>', entry_text)
    
    linked_parts = []
    for part in parts:
        part = part.strip()
        if not part or part in ['Section', 'Page', '']:
            linked_parts.append(part)
            continue
        
        anchor = to_anchor(part)
        if anchor:
            linked_parts.append(f'[{part}](#{anchor})')
        else:
            linked_parts.append(part)
    
    return '<br />'.join(linked_parts)

content = open(sys.argv[1]).read()
lines = content.split('\n')
in_toc = False
result = []

for line in lines:
    if line.strip() == '# TABLE OF CONTENTS':
        in_toc = True
        result.append(line)
        continue
    
    if in_toc and line.startswith('# ') and 'TABLE OF CONTENTS' not in line:
        in_toc = False
    
    if in_toc and line.strip().startswith('|') and '---' not in line:
        match = re.match(r'\|(.+?)\|(.+?)\|', line)
        if match:
            entry = match.group(1)
            page = match.group(2)
            linked_entry = process_toc_entry(entry)
            line = f'| {linked_entry} | {page.strip()} |'
    
    result.append(line)

print('\n'.join(result))
PYTHON_SCRIPT

python3 /tmp/add_toc_links.py "$MDX_FILE" > /tmp/toc_manual.mdx
cat /tmp/toc_manual.mdx > "$MDX_FILE"

# Cleanup temp files
rm -f /tmp/fix_tables.py /tmp/add_toc_links.py /tmp/fixed_manual.mdx /tmp/toc_manual.mdx

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
echo "  - Table section headers converted to headings"
echo "  - Missing table separator rows added"
echo "  - Table of Contents entries linked to sections"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Edit $MDX_FILE to add tags and verify frontmatter"
echo "  2. Run 'npm run build' to check for MDX errors"
echo "  3. If build fails, check for unescaped angle brackets or malformed tables"
echo ""
echo "To test locally:"
echo "  npm run dev"
echo "  Open: http://localhost:3000/machines/$MACHINE_NAME/manual"
