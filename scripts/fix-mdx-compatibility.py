#!/usr/bin/env python3
"""
Fix MDX compatibility issues in converted markdown files.

Handles:
- Self-closing HTML tags (<br>, <hr>, <img>)
- Angle bracket labels (<ALLCAPS>)
- Abbreviation normalization (USB, CV, FX, LFO)

Usage:
    python3 scripts/fix-mdx-compatibility.py <mdx-file>
"""

import re
import sys


# Common abbreviations to normalize
ABBREVIATIONS = {
    'usb': 'USB',
    'cv': 'CV',
    'fx': 'FX',
    'lfo': 'LFO',
    'os': 'OS',
}


def fix_self_closing_tags(content: str) -> str:
    """Normalize self-closing HTML tags for JSX compatibility."""
    content = re.sub(r'<br\s*/?>', r'<br />', content)
    content = re.sub(r'<hr\s*/?>', r'<hr />', content)
    # Ensure <img ...> is self-closing (keep already self-closed)
    content = re.sub(r'<img\b([^>]*?)(?<!/)>', r'<img\1 />', content)
    return content


def escape_angle_bracket_labels(content: str) -> str:
    """
    Escape angle bracket labels used in manuals (not HTML tags).
    
    Converts <ALLCAPS> or <ALLCAPS ALLCAPS> to \<ALLCAPS\>
    """
    return re.sub(r'<([A-Z][A-Z0-9 ]*[A-Z0-9])>', r'\\<\1\\>', content)


def normalize_abbreviations(content: str) -> str:
    """
    Normalize common synth/manual abbreviations to uppercase.
    
    Applied outside fenced code blocks and inline code spans.
    """
    abbr_re = re.compile(
        r'\b(' + '|'.join(map(re.escape, ABBREVIATIONS.keys())) + r')\b',
        re.IGNORECASE
    )
    lfo_digit = re.compile(r'\b(lfo)(?=\d)', re.IGNORECASE)
    lfo_plural = re.compile(r'\b(lfo)s\b', re.IGNORECASE)
    
    out_lines = []
    in_fence = False
    
    for line in content.splitlines(keepends=True):
        if line.lstrip().startswith('```'):
            in_fence = not in_fence
            out_lines.append(line)
            continue
        
        if in_fence:
            out_lines.append(line)
            continue
        
        # Split by inline code to preserve it
        parts = re.split(r'(`[^`]*`)', line)
        for i, part in enumerate(parts):
            if part.startswith('`') and part.endswith('`'):
                continue
            
            # LFO edge-cases first
            part = lfo_digit.sub('LFO', part)
            part = lfo_plural.sub('LFOs', part)
            parts[i] = abbr_re.sub(lambda m: ABBREVIATIONS[m.group(1).lower()], part)
        
        out_lines.append(''.join(parts))
    
    return ''.join(out_lines)


def fix_mdx_compatibility(content: str) -> str:
    """Apply all MDX compatibility fixes."""
    content = fix_self_closing_tags(content)
    content = escape_angle_bracket_labels(content)
    content = normalize_abbreviations(content)
    return content


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 fix-mdx-compatibility.py <mdx-file>")
        sys.exit(1)
    
    mdx_file = sys.argv[1]
    
    content = open(mdx_file, 'r', encoding='utf-8').read()
    fixed = fix_mdx_compatibility(content)
    
    # Write back to file
    open(mdx_file, 'w', encoding='utf-8').write(fixed)


if __name__ == '__main__':
    main()

