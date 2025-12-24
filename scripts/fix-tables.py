#!/usr/bin/env python3
"""
Fix table formatting issues from PDF conversion.

Handles:
- Malformed TOC separator rows
- Table section headers as rows
- Missing separator rows after headers
- Trailing empty cells
- Spurious mid-document TOC headers
- Merged TOC entries
- Empty table rows
- Duplicate separator rows
- Wrong separator column counts

Usage:
    python3 scripts/fix-tables.py <mdx-file>
    
Outputs fixed content to stdout.
"""

import re
import sys


def fix_malformed_toc_separator(content: str) -> str:
    """Fix malformed TOC separator rows (extremely long dashes from PDF conversion)."""
    return re.sub(
        r'\|[-]{50,}\|[-]+\|[-]*\|',
        '|---|---|',
        content
    )


def fix_section_headers(content: str) -> str:
    """Convert table section headers to actual headings."""
    pattern = r'\n\| ([A-Z][A-Z ]+?) +\|(?:\s*\|)+\s*\n(\|[-|: ]+\|)\n(\| [A-Za-z])'
    
    def replace_header(match):
        section_name = match.group(1).strip()
        rest = match.group(3)
        return f"\n#### {section_name}\n\n{rest}"
    
    return re.sub(pattern, replace_header, content)


def fix_table_separators(content: str) -> str:
    """Add missing table separator rows after header rows."""
    lines = content.split('\n')
    result = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        if (line.strip().startswith('|') and 
            line.strip().endswith('|') and 
            '---' not in line and
            i + 1 < len(lines)):
            
            next_line = lines[i + 1]
            
            if (next_line.strip().startswith('|') and 
                next_line.strip().endswith('|') and 
                '---' not in next_line):
                
                header_words = ['Parameter', 'Name', 'CC MSB', 'CC LSB', 'NRPN', 
                               'Description', 'Type', 'PAD', 'Machine', 'Value', 
                               'Section', 'Page']
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


def clean_table_rows(content: str) -> str:
    """Remove trailing empty cells from table rows."""
    return re.sub(r'\|\s*\|\s*$', '|', content, flags=re.MULTILINE)


def remove_spurious_toc_headers(content: str) -> str:
    """Remove spurious mid-document TABLE OF CONTENTS headings."""
    return re.sub(r'\n#### TABLE OF CONTENTS\n', '\n', content)


def split_merged_toc_entries(content: str) -> str:
    """Split merged TOC entries (multiple entries in one cell with <br />)."""
    lines = content.split('\n')
    result = []
    in_toc = False
    
    for line in lines:
        if '# TABLE OF CONTENTS' in line:
            in_toc = True
            result.append(line)
            continue
        
        if in_toc and line.startswith('# ') and 'TABLE OF CONTENTS' not in line:
            in_toc = False
        
        if in_toc and line.strip().startswith('|') and '<br />' in line and '---' not in line:
            match = re.match(r'\|\s*(.+?)\s*\|([^|]*)\|?', line)
            if match:
                cell_content = match.group(1)
                entries = cell_content.split('<br />')
                for entry in entries:
                    entry = entry.strip()
                    if entry:
                        result.append(f'| {entry} |  |')
            else:
                result.append(line)
        else:
            result.append(line)
    
    return '\n'.join(result)


def remove_empty_table_rows(content: str) -> str:
    """Remove empty table rows."""
    return re.sub(r'\n\|\s*\|\s*\|?\s*(?=\n)', '', content)


def remove_duplicate_separators(content: str) -> str:
    """Remove duplicate separator rows (keep only one after header)."""
    lines = content.split('\n')
    result = []
    in_table = False
    had_separator = False
    
    for line in lines:
        stripped = line.strip()
        is_table_row = stripped.startswith('|') and stripped.endswith('|')
        is_separator = is_table_row and re.match(r'^\|[\s\-:|]+\|$', stripped)
        
        if is_table_row:
            if not in_table:
                in_table = True
                had_separator = False
            
            if is_separator:
                if not had_separator:
                    result.append(line)
                    had_separator = True
            else:
                result.append(line)
        else:
            if in_table:
                in_table = False
                had_separator = False
            result.append(line)
    
    return '\n'.join(result)


def fix_separator_column_count(content: str) -> str:
    """Fix separator rows with wrong column count."""
    lines = content.split('\n')
    result = []
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        if re.match(r'^\|[\s\-:|]+\|$', stripped):
            if i > 0:
                prev_line = lines[i-1].strip()
                if prev_line.startswith('|') and prev_line.endswith('|'):
                    header_cols = prev_line.count('|') - 1
                    sep_cols = stripped.count('|') - 1
                    
                    if header_cols != sep_cols and header_cols > 0:
                        new_sep = '|' + '|'.join(['---'] * header_cols) + '|'
                        result.append(new_sep)
                        continue
        
        result.append(line)
    
    return '\n'.join(result)


def fix_tables(content: str) -> str:
    """Apply all table fixes."""
    content = fix_malformed_toc_separator(content)
    content = fix_section_headers(content)
    content = fix_table_separators(content)
    content = clean_table_rows(content)
    content = remove_spurious_toc_headers(content)
    content = split_merged_toc_entries(content)
    content = remove_empty_table_rows(content)
    content = remove_duplicate_separators(content)
    content = fix_separator_column_count(content)
    return content


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 fix-tables.py <mdx-file>", file=sys.stderr)
        sys.exit(1)
    
    content = open(sys.argv[1], 'r', encoding='utf-8').read()
    fixed = fix_tables(content)
    print(fixed)


if __name__ == '__main__':
    main()

