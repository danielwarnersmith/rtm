# Manual Import Checklist

Step-by-step guide for importing a new Elektron manual into the RTM documentation site.

## Prerequisites

- [ ] Marker PDF conversion tool installed
- [ ] Original PDF manual from Elektron
- [ ] Node.js and npm installed

## 1. PDF Conversion

### Convert PDF to Markdown

```bash
# Use Marker to convert PDF to markdown
marker path/to/manual.pdf --output-dir .converted/
```

### Verify Output

- [ ] Markdown file created in `.converted/<machine-name>/`
- [ ] Images extracted to `.converted/<machine-name>/` folder
- [ ] Spot check: Open markdown file, verify text is readable

## 2. Run Import Script

```bash
./import-manual.sh <machine-name> .converted/<machine-name>/<machine-name>.md "<Display Title>"

# Example:
./import-manual.sh digitakt .converted/digitakt/digitakt.md "Digitakt"
```

The script automatically:
- Creates `content/machines/<machine-name>/manual.mdx`
- Copies images to `public/machines/<machine-name>/images/`
- Fixes image paths
- Escapes angle brackets
- Normalizes abbreviations (USB, CV, FX, LFO)
- Fixes table formatting issues
- Adds TOC links

## 3. Run Convention Conversion

```bash
python3 scripts/convert-manual-conventions.py content/machines/<machine-name>/manual.mdx
```

This converts:
- `**[KEY]**` → `<Key>KEY</Key>`
- `***KNOB***` → `<Knob>KNOB</Knob>`
- `**\<LED\>**` → `<LED>LED</LED>`
- Contextual patterns like "XXX parameter" → `<Param>XXX</Param> parameter`

## 4. Classify Icons

### Identify Tip/Warning Icons

Small images (typically under 3KB with "Picture" in filename) are callout icons.

1. Open the converted markdown
2. Find small image references
3. Check the text that follows each image
4. Warning patterns: "Please note", "Important", "Be sure to", "damage"
5. Everything else is a Tip

### Convert to Components

Replace icon images with the appropriate component:

```mdx
<!-- Before -->
![](/machines/machine-name/images/_page_X_Picture_Y.jpeg)
Important: Do not disconnect during transfer.

<!-- After -->
<Warning>
Important: Do not disconnect during transfer.
</Warning>
```

## 5. Build Verification

```bash
npm run build
```

### Check for Errors

Common issues and fixes:

| Error | Fix |
|-------|-----|
| `Unexpected token <` | Escape with `\<` or wrap in component |
| `Expected closing tag` | Add `/` to self-closing tags: `<br />` |
| `Unknown element type` | Add component to MDXComponents.tsx |

## 6. Visual Verification

```bash
npm run dev
# Open http://localhost:3000/machines/<machine-name>/manual
```

### Checklist

- [ ] Page loads without errors
- [ ] Images display correctly
- [ ] Table of Contents links work
- [ ] Tables are formatted properly
- [ ] Tip/Warning callouts render with icons
- [ ] Convention components (`<Key>`, `<Knob>`, etc.) display correctly
- [ ] Footnotes at bottom expand/collapse

## 7. Finalize

### Update Frontmatter

Edit `content/machines/<machine-name>/manual.mdx`:

```yaml
---
title: "Machine Name"
description: "Owner's manual for the Elektron Machine Name"
tags: ["elektron", "synth", "drum-machine"]  # Add relevant tags
date: "YYYY-MM-DD"
---
```

### Add to Icon Reference

Update `docs/manual-import-reference.md` with the new machine's icon classifications.

### Commit

```bash
git add content/machines/<machine-name>/ public/machines/<machine-name>/
git commit -m "Add <Machine Name> manual"
```

## Troubleshooting

### Images Not Loading

1. Check path in MDX matches `public/machines/<machine-name>/images/`
2. Verify image files exist
3. Clear `.next` cache: `rm -rf .next`

### Table Formatting Broken

1. Check for missing separator row after header
2. Verify column count matches in all rows
3. Look for stray pipe characters `|`

### Build Fails on MDX

1. Search for unescaped `<` or `>` (especially in LED indicators)
2. Check for unclosed JSX tags
3. Verify all components are imported in MDXComponents.tsx

