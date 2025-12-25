#!/usr/bin/env python3
"""
Optimize existing SVG files by merging adjacent rectangles.

This script reads existing SVG files, extracts the rectangles, and re-merges them
using the optimized algorithm to reduce the number of DOM elements and improve performance.
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple


def parse_svg_rectangles(svg_content: str) -> List[Tuple[int, int, int, int]]:
    """Parse rectangles from SVG content."""
    rectangles = []
    pattern = r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"'
    
    for match in re.finditer(pattern, svg_content):
        x = int(match.group(1))
        y = int(match.group(2))
        width = int(match.group(3))
        height = int(match.group(4))
        rectangles.append((x, y, width, height))
    
    return rectangles


def merge_rectangles(rectangles: List[Tuple[int, int, int, int]]) -> List[Tuple[int, int, int, int]]:
    """
    Iteratively merge rectangles both vertically and horizontally until no more merges are possible.
    
    This is the same aggressive merging algorithm used in export_svg.py but applied to existing rectangles.
    """
    # Iteratively merge until no more merges are possible
    changed = True
    while changed:
        changed = False
        new_rectangles = []
        used = set()
        
        for i, (x1, y1, w1, h1) in enumerate(rectangles):
            if i in used:
                continue
            
            # Try to merge this rectangle with others
            merged = (x1, y1, w1, h1)
            
            # Keep trying to merge until no more merges found
            merge_found = True
            while merge_found:
                merge_found = False
                x, y, width, height = merged
                
                # Try vertical merge: find rectangle with same x, width, and adjacent y
                for j, (x2, y2, w2, h2) in enumerate(rectangles):
                    if j in used or j == i:
                        continue
                    
                    # Vertical merge: same x, width, and one is directly above/below the other
                    if x2 == x and w2 == width:
                        if y2 == y + height:  # rect2 is below merged
                            merged = (x, y, width, height + h2)
                            used.add(j)
                            merge_found = True
                            changed = True
                            break
                        elif y2 + h2 == y:  # rect2 is above merged
                            merged = (x, y2, width, height + h2)
                            used.add(j)
                            merge_found = True
                            changed = True
                            break
                
                # Try horizontal merge: find rectangle with same y, height, and adjacent x
                if not merge_found:
                    x, y, width, height = merged
                    for j, (x2, y2, w2, h2) in enumerate(rectangles):
                        if j in used or j == i:
                            continue
                        
                        # Horizontal merge: same y, height, and one is directly left/right of the other
                        if y2 == y and h2 == height:
                            if x2 == x + width:  # rect2 is to the right of merged
                                merged = (x, y, width + w2, height)
                                used.add(j)
                                merge_found = True
                                changed = True
                                break
                            elif x2 + w2 == x:  # rect2 is to the left of merged
                                merged = (x2, y, width + w2, height)
                                used.add(j)
                                merge_found = True
                                changed = True
                                break
            
            new_rectangles.append(merged)
            used.add(i)
        
        rectangles = new_rectangles
    
    return rectangles


def optimize_svg(svg_content: str) -> str:
    """Optimize SVG by merging adjacent rectangles."""
    # Extract viewBox
    viewbox_match = re.search(r'viewBox="([^"]+)"', svg_content)
    if not viewbox_match:
        raise ValueError("SVG missing viewBox")
    viewbox = viewbox_match.group(1)
    
    # Parse rectangles
    rectangles = parse_svg_rectangles(svg_content)
    
    if not rectangles:
        # No rectangles to optimize
        return svg_content
    
    # Merge rectangles
    merged = merge_rectangles(rectangles)
    
    # Rebuild SVG with crispEdges for pixel-perfect rendering
    svg_lines = [
        f'<svg viewBox="{viewbox}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">',
        '  <g id="pixels">',
    ]
    
    for x, y, width, height in merged:
        svg_lines.append(
            f'    <rect x="{x}" y="{y}" width="{width}" height="{height}" '
            f'fill="var(--foreground)" shape-rendering="crispEdges" />'
        )
    
    svg_lines.extend([
        '  </g>',
        '</svg>',
    ])
    
    return '\n'.join(svg_lines)


def main():
    """Optimize SVG files in a directory."""
    if len(sys.argv) < 2:
        print("Usage: python3 optimize_svgs.py <directory>")
        print("  Optimizes all .svg files in the specified directory")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    if not directory.exists():
        print(f"Error: Directory not found: {directory}")
        sys.exit(1)
    
    svg_files = list(directory.glob("*.svg"))
    if not svg_files:
        print(f"No SVG files found in {directory}")
        sys.exit(0)
    
    print(f"Found {len(svg_files)} SVG files")
    
    total_before = 0
    total_after = 0
    optimized_count = 0
    
    for svg_file in svg_files:
        try:
            content = svg_file.read_text(encoding="utf-8")
            rect_count_before = content.count('<rect')
            
            if rect_count_before == 0:
                continue
            
            optimized = optimize_svg(content)
            rect_count_after = optimized.count('<rect')
            
            # Always re-optimize to apply the new algorithm (even if count is same, structure may be better)
            if rect_count_after <= rect_count_before:
                svg_file.write_text(optimized, encoding="utf-8")
                if rect_count_after < rect_count_before:
                    reduction = (1 - rect_count_after / rect_count_before) * 100
                    print(f"  {svg_file.name}: {rect_count_before:,} → {rect_count_after:,} rectangles ({reduction:.1f}% reduction)")
                else:
                    print(f"  {svg_file.name}: {rect_count_before:,} rectangles (re-optimized, same count)")
                optimized_count += 1
                total_before += rect_count_before
                total_after += rect_count_after
        except Exception as e:
            print(f"  Error processing {svg_file.name}: {e}")
    
    if optimized_count > 0:
        overall_reduction = (1 - total_after / total_before) * 100
        print(f"\nOptimized {optimized_count} files")
        print(f"Total rectangles: {total_before:,} → {total_after:,} ({overall_reduction:.1f}% reduction)")
    else:
        print("\nNo files needed optimization")


if __name__ == "__main__":
    main()

