#!/usr/bin/env python3
"""
Fix image paths in converted MDX files.

Usage:
    python3 scripts/fix-image-paths.py <mdx-file> <machine-name>
"""

import re
import sys


def fix_image_paths(content: str, machine_name: str) -> str:
    """
    Replace relative image paths with absolute paths to public directory.
    
    Handles:
    - ![](images/...) or ![](folder/...)
    - ![](filename.jpeg)
    """
    # Handle paths with subdirectories: ![](images/...), ![](filename/...)
    content = re.sub(
        r'!\[([^\]]*)\]\(([^)]*)/([^/)]+\.(jpeg|jpg|png|gif|webp))\)',
        rf'![\1](/machines/{machine_name}/images/\3)',
        content
    )
    
    # Handle direct image references: ![](filename.jpeg)
    content = re.sub(
        r'!\[([^\]]*)\]\(([^/)]+\.(jpeg|jpg|png|gif|webp))\)',
        rf'![\1](/machines/{machine_name}/images/\2)',
        content
    )
    
    return content


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 fix-image-paths.py <mdx-file> <machine-name>")
        sys.exit(1)
    
    mdx_file = sys.argv[1]
    machine_name = sys.argv[2]
    
    content = open(mdx_file, 'r', encoding='utf-8').read()
    fixed = fix_image_paths(content, machine_name)
    print(fixed, end='')


if __name__ == '__main__':
    main()

