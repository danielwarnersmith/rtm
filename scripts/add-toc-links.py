#!/usr/bin/env python3
"""
Add links to Table of Contents entries.

Converts TOC entries like "1. INTRODUCTION" to links like
"[1. INTRODUCTION](#1-introduction)".

Usage:
    python3 scripts/add-toc-links.py <mdx-file>
    
Outputs linked content to stdout.
"""

import re
import sys


def to_anchor(text: str) -> str:
    """Convert section title to anchor ID."""
    text = text.strip().lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = re.sub(r'^-|-$', '', text)
    return text


def process_toc_entry(entry_text: str) -> str:
    """Convert TOC entry text to markdown links."""
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


def add_toc_links(content: str) -> str:
    """Add links to all TOC entries."""
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
    
    return '\n'.join(result)


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 add-toc-links.py <mdx-file>", file=sys.stderr)
        sys.exit(1)
    
    content = open(sys.argv[1], 'r', encoding='utf-8').read()
    linked = add_toc_links(content)
    print(linked)


if __name__ == '__main__':
    main()

