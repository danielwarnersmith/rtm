"""SVG export from bitmap."""

import numpy as np
from typing import List, Tuple


def bitmap_to_svg_rectangles(bitmap: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Convert bitmap to optimized rectangles by aggressively merging both horizontally and vertically.
    
    This function uses an iterative merging algorithm that:
    1. Starts with horizontal run-length encoding (merges pixels horizontally on each row)
    2. Iteratively merges rectangles both vertically and horizontally until no more merges are possible
    
    This creates the largest possible contiguous shapes while maintaining 100% pixel accuracy.
    
    Args:
        bitmap: Boolean bitmap (128×64), True = ON pixel
        
    Returns:
        List of (x, y, width, height) rectangles
    """
    h, w = bitmap.shape
    
    # Step 1: Horizontal run-length encoding - create row rectangles
    rectangles = []
    for y in range(h):
        x = 0
        while x < w:
            if bitmap[y, x]:
                # Start of a run
                start_x = x
                # Find end of run
                while x < w and bitmap[y, x]:
                    x += 1
                width = x - start_x
                rectangles.append((start_x, y, width, 1))
            else:
                x += 1
    
    # Step 2: Iteratively merge rectangles until no more merges are possible
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


def export_svg(
    bitmap: np.ndarray,
    viewbox: Tuple[int, int, int, int] = (0, 0, 128, 64),
) -> str:
    """
    Export bitmap as SVG with row-major rectangles.
    
    Args:
        bitmap: Boolean bitmap (128×64), True = ON pixel
        viewbox: SVG viewBox (x, y, width, height)
        
    Returns:
        SVG string
    """
    rectangles = bitmap_to_svg_rectangles(bitmap)
    vx, vy, vw, vh = viewbox
    
    svg_lines = [
        f'<svg viewBox="{vx} {vy} {vw} {vh}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">',
        '  <g id="pixels">',
    ]
    
    for x, y, width, height in rectangles:
        svg_lines.append(
            f'    <rect x="{x}" y="{y}" width="{width}" height="{height}" '
            f'fill="var(--foreground)" shape-rendering="crispEdges" />'
        )
    
    svg_lines.extend([
        '  </g>',
        '</svg>',
    ])
    
    return '\n'.join(svg_lines)

