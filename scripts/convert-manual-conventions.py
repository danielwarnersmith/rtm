#!/usr/bin/env python3
"""
Convert Elektron manual markdown conventions to MDX components.

This script converts the following patterns:

Markdown-formatted (for processed MDX files):
- **[KEY_NAME]** → <Key>KEY_NAME</Key>
- ***KNOB_NAME*** → <Knob>KNOB_NAME</Knob>
- **\\<LED_NAME\\>** → <LED>LED_NAME</LED>

Plain text (for raw converted markdown):
- "SRC key" → "<Key>SRC</Key> key"
- "SYNTH parameters" → "<Param>SYNTH</Param> parameters"
- "FX track" → "<Param>FX</Param> track"
- "DELAY parameter page" → "<Param>DELAY</Param> parameter page"
- "MACHINE selection menu" → "<Param>MACHINE</Param> selection menu"
- "SOUND SETTINGS menu" → "<Param>SOUND SETTINGS</Param> menu"
- "SONG mode" → "<Param>SONG</Param> mode"

Usage:
    python3 scripts/convert-manual-conventions.py content/machines/*/manual.mdx
    python3 scripts/convert-manual-conventions.py .converted/*/*.md --dry-run

The script is idempotent - running it multiple times won't double-convert.
"""

import re
import sys
import os


def convert_keys(content: str) -> tuple[str, int]:
    """
    Convert **[KEY_NAME]** to <Key>KEY_NAME</Key>
    
    Matches: **[FUNC]**, **[PLAY]**, **[TRIG 1-16]**, **[T1–4]**, etc.
    Does not match: markdown links like [text](url)
    """
    # Pattern: **[ALLCAPS with spaces/numbers/dashes]** not followed by (
    pattern = r'\*\*\[([A-Z][A-Z0-9 /+–−\-]*)\]\*\*(?!\()'
    
    def replace(m):
        return f'<Key>{m.group(1)}</Key>'
    
    new_content, count = re.subn(pattern, replace, content)
    return new_content, count


def convert_knobs(content: str) -> tuple[str, int]:
    """
    Convert ***KNOB_NAME*** to <Knob>KNOB_NAME</Knob>
    
    Matches: ***TRACK LEVEL***, ***DATA ENTRY***, etc.
    Triple asterisks = bold + italic
    """
    # Pattern: ***ALLCAPS with spaces***
    pattern = r'\*\*\*([A-Z][A-Z0-9 /+–−\-]*)\*\*\*'
    
    def replace(m):
        return f'<Knob>{m.group(1)}</Knob>'
    
    new_content, count = re.subn(pattern, replace, content)
    return new_content, count


def convert_leds(content: str) -> tuple[str, int]:
    """
    Convert **\\<LED_NAME\\>** to <LED>LED_NAME</LED>
    
    Matches: **\\<PATTERN PAGE\\>**, **\\<OCTAVE\\>**, etc.
    """
    # Pattern: **\<ALLCAPS\>**
    pattern = r'\*\*\\<([A-Z][A-Z0-9 /+–−\-]*)\\>\*\*'
    
    def replace(m):
        return f'<LED>{m.group(1)}</LED>'
    
    new_content, count = re.subn(pattern, replace, content)
    return new_content, count


def convert_plain_keys(content: str) -> tuple[str, int]:
    """
    Convert plain ALL CAPS words followed by 'key' to <Key> components.
    
    Matches patterns like:
    - "SRC key" → "<Key>SRC</Key> key"
    - "PLAY key" → "<Key>PLAY</Key> key"
    
    This handles raw text (not markdown bold formatted).
    """
    # Pattern: ALL CAPS word followed by " key" (not already wrapped)
    pattern = r'(?<!<Key>)(?<!\[)\b([A-Z][A-Z0-9]{1,10})\b(?!\])(?!</Key>) key\b'
    
    def replace(m):
        return f'<Key>{m.group(1)}</Key> key'
    
    new_content, count = re.subn(pattern, replace, content)
    return new_content, count


def convert_contextual_params(content: str) -> tuple[str, int]:
    """
    Convert contextual ALL CAPS words to <Param> components.
    
    Matches patterns like:
    - "XXX parameter page" → "<Param>XXX</Param> parameter page"
    - "XXX parameters" → "<Param>XXX</Param> parameters"
    - "XXX mode" → "<Param>XXX</Param> mode"
    - "XXX menu" → "<Param>XXX</Param> menu"
    - "XXX track" → "<Param>XXX</Param> track"
    - "XXX selection menu" → "<Param>XXX</Param> selection menu"
    """
    count = 0
    
    # Common parameter/page/mode words - order matters (more specific first)
    contexts = [
        # Multi-word params with spaces (like "SOUND SETTINGS menu")
        (r'(?<!<Param>)\b([A-Z][A-Z0-9]+(?: [A-Z][A-Z0-9]+)+)\b(?!</Param>) menu\b', r'<Param>\1</Param> menu'),
        # Single word contexts
        (r'(?<!<Param>)(?<!<Key>)\b([A-Z][A-Z0-9]{1,15})\b(?!</Param>)(?!</Key>) parameter page', r'<Param>\1</Param> parameter page'),
        (r'(?<!<Param>)(?<!<Key>)\b([A-Z][A-Z0-9]{1,15})\b(?!</Param>)(?!</Key>) parameters\b', r'<Param>\1</Param> parameters'),
        (r'(?<!<Param>)(?<!<Key>)\b([A-Z][A-Z0-9]{1,15})\b(?!</Param>)(?!</Key>) page\b', r'<Param>\1</Param> page'),
        (r'(?<!<Param>)(?<!<Key>)\b([A-Z][A-Z0-9]{1,15})\b(?!</Param>)(?!</Key>) pages\b', r'<Param>\1</Param> pages'),
        (r'(?<!<Param>)(?<!<Key>)\b([A-Z][A-Z0-9]{1,15})\b(?!</Param>)(?!</Key>) selection menu\b', r'<Param>\1</Param> selection menu'),
        (r'(?<!<Param>)(?<!<Key>)\b([A-Z][A-Z0-9]{1,15})\b(?!</Param>)(?!</Key>) menu\b', r'<Param>\1</Param> menu'),
        (r'(?<!<Param>)(?<!<Key>)\b([A-Z][A-Z0-9]{1,15})\b(?!</Param>)(?!</Key>) mode\b', r'<Param>\1</Param> mode'),
        (r'(?<!<Param>)(?<!<Key>)\b([A-Z][A-Z0-9]{0,10})\b(?!</Param>)(?!</Key>) track\b', r'<Param>\1</Param> track'),
    ]
    
    for pattern, replacement in contexts:
        content, c = re.subn(pattern, replacement, content)
        count += c
    
    return content, count


def convert_file(filepath: str, dry_run: bool = False) -> dict:
    """
    Convert all conventions in a file.
    
    Returns a dict with conversion counts.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    stats = {}
    
    # Convert in order: 
    # 1. LEDs first (most specific markdown pattern)
    # 2. Knobs (bold+italic markdown)
    # 3. Keys (bold markdown with brackets)
    # 4. Plain keys (raw "XXX key" text)
    # 5. Contextual params (last, catches remaining ALL CAPS in context)
    content, stats['leds'] = convert_leds(content)
    content, stats['knobs'] = convert_knobs(content)
    content, stats['keys'] = convert_keys(content)
    content, stats['plain_keys'] = convert_plain_keys(content)
    content, stats['params'] = convert_contextual_params(content)
    
    stats['total'] = sum(stats.values())
    
    if not dry_run and content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    
    return stats


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Convert Elektron manual conventions to MDX components'
    )
    parser.add_argument(
        'files',
        nargs='+',
        help='MDX files to convert'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be converted without making changes'
    )
    
    args = parser.parse_args()
    
    total_stats = {'keys': 0, 'plain_keys': 0, 'knobs': 0, 'leds': 0, 'params': 0, 'total': 0}
    
    for filepath in args.files:
        if not os.path.exists(filepath):
            print(f"Warning: {filepath} not found, skipping")
            continue
        
        stats = convert_file(filepath, dry_run=args.dry_run)
        
        print(f"{filepath}:")
        print(f"  Keys (bold):  {stats['keys']}")
        print(f"  Keys (plain): {stats['plain_keys']}")
        print(f"  Knobs:        {stats['knobs']}")
        print(f"  LEDs:         {stats['leds']}")
        print(f"  Params:       {stats['params']}")
        print(f"  Total:        {stats['total']}")
        print()
        
        for key in total_stats:
            total_stats[key] += stats.get(key, 0)
    
    if len(args.files) > 1:
        print("=" * 40)
        print("Total conversions:")
        print(f"  Keys (bold):  {total_stats['keys']}")
        print(f"  Keys (plain): {total_stats['plain_keys']}")
        print(f"  Knobs:        {total_stats['knobs']}")
        print(f"  LEDs:         {total_stats['leds']}")
        print(f"  Params:       {total_stats['params']}")
        print(f"  Total:        {total_stats['total']}")
    
    if args.dry_run:
        print("\n(dry run - no files were modified)")


if __name__ == '__main__':
    main()

