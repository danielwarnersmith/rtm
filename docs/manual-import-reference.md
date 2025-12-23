# Manual Import Reference

This document contains reference data for formatting Elektron manuals imported via PDF extraction.

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

<!-- Screen messages: "BANK A: CHOOSE PTN" -->
The screen displays <Screen>BANK A: CHOOSE PTN</Screen>.

<!-- Parameter names: VOL, FREQ, DECAY -->
Adjust the <Param>DECAY</Param> parameter.
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

