# Manual Import Reference

This document contains reference data for formatting Elektron manuals imported via PDF extraction.

## PDF Conversion Patterns

The import pipeline (`import-manual.sh`) handles these common PDF conversion issues automatically:

| Issue | Cause | Solution |
|-------|-------|----------|
| Self-closing tags `<br>` | MDX requires JSX syntax | Regex converts to `<br />` |
| Angle bracket labels `<ALLCAPS>` | Marker extracts LED indicators as-is | Escape to `\<ALLCAPS\>` |
| Malformed TOC separators | PDF table extraction errors | Normalize to `\|---\|---\|` |
| Missing table separators | Header row not detected | Auto-insert after header rows |
| Merged TOC entries | Multi-line cells become `<br />` | Split into separate rows |
| Duplicate separator rows | PDF extraction artifacts | Remove all but first separator |
| Wrong separator column count | Mismatch with header | Regenerate based on header |
| Empty table rows | PDF artifacts | Remove completely |
| Spurious "TABLE OF CONTENTS" headers | Repeated headers in PDF | Remove duplicates |

### Common MDX Build Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Unexpected token` | Unescaped `<` or `>` | Escape with `\<` or use component |
| `Expected closing tag` | Self-closing tag missing `/` | Add space and slash: `<br />` |
| `Unknown element type` | Component not registered | Add to MDXComponents export |
| `Adjacent JSX elements` | Multiple root elements | Wrap in fragment or div |

### Abbreviation Normalization

The import script normalizes these common abbreviations to uppercase:

- `usb`, `Usb` → `USB`
- `cv`, `Cv` → `CV`
- `fx`, `Fx` → `FX`
- `lfo`, `Lfo` → `LFO` (also handles `LFO1`, `LFO2`, `LFOs`)
- `os`, `Os` → `OS`

## Icon Classification

When importing manuals, small images (under 3KB with "Picture" in the filename) are typically callout icons. Classify them based on the text that follows:

### Warning Icons
Text patterns that indicate a **Warning** callout:
- "Please note"
- "Note that"
- "Important"
- "Be sure to"
- "is not possible"
- "will overwrite"
- "damage"
- "disposed" (disposal warnings)
- "Backing up...important"
- "Use the included PSU" (power supply warnings)
- "wait for"
- "will limit"

### Tip Icons
All other small callout icons that don't match warning patterns are **Tips**. These typically contain:
- Shortcuts and keyboard combinations
- Usage suggestions
- "can be" suggestions
- "is ideal when" recommendations
- Performance tips

## Identified Icons by Manual

### Analog Four MKII

**Warning Icons (15):**
- _page_1_Picture_12.jpeg
- _page_9_Picture_13.jpeg
- _page_13_Picture_10.jpeg
- _page_22_Picture_19.jpeg
- _page_23_Picture_15.jpeg
- _page_26_Picture_10.jpeg
- _page_38_Picture_7.jpeg
- _page_42_Picture_26.jpeg
- _page_51_Picture_3.jpeg
- _page_57_Picture_3.jpeg
- _page_58_Picture_1.jpeg
- _page_64_Picture_1.jpeg
- _page_65_Picture_4.jpeg
- _page_66_Picture_1.jpeg
- _page_69_Picture_19.jpeg

**Tip Icons (45):**
- _page_9_Picture_15.jpeg
- _page_16_Picture_14.jpeg
- _page_17_Picture_11.jpeg
- _page_22_Picture_2.jpeg
- _page_22_Picture_16.jpeg
- _page_23_Picture_13.jpeg
- _page_25_Picture_5.jpeg
- _page_25_Picture_18.jpeg
- _page_26_Picture_7.jpeg
- _page_32_Picture_5.jpeg
- _page_33_Picture_24.jpeg
- _page_35_Picture_11.jpeg
- _page_36_Picture_3.jpeg
- _page_36_Picture_23.jpeg
- _page_37_Picture_3.jpeg
- _page_37_Picture_23.jpeg
- _page_39_Picture_10.jpeg
- _page_40_Picture_9.jpeg
- _page_41_Picture_17.jpeg
- _page_44_Picture_2.jpeg
- _page_44_Picture_12.jpeg
- _page_45_Picture_7.jpeg
- _page_46_Picture_4.jpeg
- _page_46_Picture_16.jpeg
- _page_47_Picture_1.jpeg
- _page_47_Picture_9.jpeg
- _page_49_Picture_2.jpeg
- _page_49_Picture_11.jpeg
- _page_50_Picture_1.jpeg
- _page_50_Picture_9.jpeg
- _page_53_Picture_15.jpeg
- _page_54_Picture_5.jpeg
- _page_57_Picture_13.jpeg
- _page_59_Picture_7.jpeg
- _page_60_Picture_3.jpeg
- _page_64_Picture_17.jpeg
- _page_65_Picture_12.jpeg
- _page_65_Picture_19.jpeg
- _page_71_Picture_1.jpeg
- _page_71_Picture_10.jpeg
- _page_75_Picture_4.jpeg
- _page_77_Picture_10.jpeg
- _page_79_Picture_4.jpeg
- _page_80_Picture_8.jpeg
- _page_85_Picture_3.jpeg

### Analog Rytm MKII

**Warning Icons (16):**
- _page_1_Picture_15.jpeg
- _page_7_Picture_20.jpeg
- _page_19_Picture_6.jpeg
- _page_24_Picture_18.jpeg
- _page_29_Picture_9.jpeg
- _page_32_Picture_13.jpeg
- _page_37_Picture_6.jpeg
- _page_37_Picture_11.jpeg
- _page_46_Picture_21.jpeg
- _page_53_Picture_25.jpeg
- _page_58_Picture_1.jpeg
- _page_59_Picture_20.jpeg
- _page_61_Picture_17.jpeg
- _page_63_Picture_17.jpeg
- _page_65_Picture_22.jpeg
- _page_66_Picture_22.jpeg

**Tip Icons (41):**
- _page_7_Picture_22.jpeg
- _page_15_Picture_16.jpeg
- _page_16_Picture_13.jpeg
- _page_19_Picture_1.jpeg
- _page_19_Picture_28.jpeg
- _page_24_Picture_13.jpeg
- _page_25_Picture_13.jpeg
- _page_27_Picture_7.jpeg
- _page_27_Picture_17.jpeg
- _page_28_Picture_11.jpeg
- _page_30_Picture_10.jpeg
- _page_33_Picture_17.jpeg
- _page_35_Picture_6.jpeg
- _page_35_Picture_16.jpeg
- _page_36_Picture_3.jpeg
- _page_36_Picture_25.jpeg
- _page_38_Picture_12.jpeg
- _page_39_Picture_15.jpeg
- _page_40_Picture_1.jpeg
- _page_41_Picture_12.jpeg
- _page_42_Picture_9.jpeg
- _page_43_Picture_2.jpeg
- _page_45_Picture_1.jpeg
- _page_45_Picture_3.jpeg
- _page_45_Picture_14.jpeg
- _page_45_Picture_18.jpeg
- _page_45_Picture_20.jpeg
- _page_47_Picture_7.jpeg
- _page_47_Picture_16.jpeg
- _page_48_Picture_10.jpeg
- _page_50_Picture_15.jpeg
- _page_51_Picture_5.jpeg
- _page_52_Picture_4.jpeg
- _page_52_Picture_6.jpeg
- _page_60_Picture_15.jpeg
- _page_62_Picture_9.jpeg
- _page_63_Picture_1.jpeg
- _page_63_Picture_10.jpeg
- _page_66_Picture_5.jpeg
- _page_73_Picture_3.jpeg
- _page_77_Picture_3.jpeg

## MDX Syntax

### Block Components

Use the following block components in MDX files:

```mdx
<Tip>
Your helpful tip text here.
</Tip>

<Warning>
Important warning text here.
</Warning>
```

The components automatically include the appropriate Elektron icon graphics.

### Inline Convention Components

Use these components for inline formatting that matches the "Conventions in This Manual" section:

```mdx
<!-- Key names: [FUNC], [PLAY], [TRIG 1-16] -->
Press <Key>FUNC</Key> + <Key>PLAY</Key> to start recording.

<!-- Knob names: TRACK LEVEL, DATA ENTRY -->
Turn the <Knob>TRACK LEVEL</Knob> knob to adjust volume.

<!-- LED indicators: <PATTERN PAGE>, <OCTAVE> -->
The <LED>PATTERN PAGE</LED> LEDs show the current page.

<!-- Parameter names: VOL, FREQ, DECAY -->
Adjust the <Param>DECAY</Param> parameter.
```

These convention components map to Elektron's manual formatting:
- `<Key>` - Physical keys in brackets: **[FUNC]**, **[PLAY]**
- `<Knob>` - Rotary encoders in bold italic: ***TRACK LEVEL***
- `<LED>` - LED indicators in angle brackets: **<PATTERN PAGE>**
- `<Param>` - Parameter names in bold: **VOL**, **FREQ**

### Legal Disclaimers (Footnotes)

Use the collapsible footnotes component for legal text at the end of manuals:

```mdx
<Footnotes>
<Footnote title="Copyright">
© 2024 Elektron Music Machines. All rights reserved.
</Footnote>
<Footnote title="FCC Compliance">
This device complies with Part 15 of the FCC Rules.
</Footnote>
</Footnotes>
```

## Conversion Scripts

### Converting Manual Conventions

After initial PDF extraction, run the convention conversion script to transform markdown formatting into MDX components:

```bash
python3 scripts/convert-manual-conventions.py content/machines/*/manual.mdx
```

This converts:
- `**[KEY_NAME]**` → `<Key>KEY_NAME</Key>`
- `***KNOB_NAME***` → `<Knob>KNOB_NAME</Knob>`
- `**\<LED_NAME\>**` → `<LED>LED_NAME</LED>`

Use `--dry-run` to preview changes without modifying files.

### Other Cleanup Tasks

After conversion, you may also need to run these manual cleanup steps:

1. **Fix numbered list spacing**: Ensure space after period (`23. Text` not `23.Text`)
2. **Remove decorative bullets**: Replace `•` with `-` for list items, remove from headings
3. **Fix MKII capitalization**: Replace `Mkii` with `MKII`
4. **Remove blank lines in lists**: Consecutive list items should not have blank lines between them
5. **Convert h2 to h3**: Sub-sections under conventions should be h3, not h2

Example cleanup commands:
```bash
# Fix "Mkii" → "MKII"
sed -i '' 's/Mkii/MKII/g' content/machines/*/manual.mdx

# Remove bullet characters
sed -i '' 's/^• /- /g' content/machines/*/manual.mdx
```

## Machine-Specific Notes

### Analog Four MKII
- 15 warning icons, 45 tip icons
- CV/gate section has complex tables
- Sound architecture diagrams need manual alt text

### Analog Rytm MKII  
- 16 warning icons, 41 tip icons
- Sampling section has recording workflow diagrams
- Pad sensitivity tables render well

## Component Usage Statistics

Based on current imports:

| Component | A4 MKII | AR MKII | Notes |
|-----------|---------|---------|-------|
| `<Key>` | 365 | 438 | Most common - button presses |
| `<Param>` | 318 | 301 | Parameter names |
| `<Knob>` | 64 | 70 | Rotary encoders |
| `<Tip>` | 45 | 41 | Helpful hints |
| `<LED>` | 13 | 35 | Indicator lights |
| `<Warning>` | 14 | 15 | Important notices |

