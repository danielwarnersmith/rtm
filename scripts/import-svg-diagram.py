#!/usr/bin/env python3
"""
Import an SVG diagram as a theme-aware React component.

This script:
1. Reads an SVG file
2. Creates a React component with theme-aware styling in components/mdx/diagrams/
3. Exports it in components/mdx/diagrams/index.ts (barrel export)
4. Replaces the image reference in the MDX file with the component

The diagrams are automatically available in MDX via the barrel export pattern,
which scales to hundreds of diagrams without cluttering MDXComponents.tsx.

Usage:
    python3 scripts/import-svg-diagram.py <svg-file> <component-name> <mdx-file> [image-path]

Arguments:
    svg-file: Path to the SVG file to import
    component-name: PascalCase name for the React component (e.g., SignalPathDiagram)
    mdx-file: Path to the MDX file that references the image
    image-path: (Optional) The image path pattern to replace in MDX (e.g., /machines/analog-four-mkii/images/_page_14_Figure_2.svg)

Example:
    python3 scripts/import-svg-diagram.py \\
        public/machines/analog-four-mkii/images/_page_14_Figure_2.svg \\
        SignalPathDiagram \\
        content/machines/analog-four-mkii/manual.mdx \\
        /machines/analog-four-mkii/images/_page_14_Figure_2.svg
"""

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def extract_svg_attributes(svg_content: str) -> dict:
    """Extract width, height, and viewBox from SVG content."""
    # Parse SVG to get root element
    try:
        root = ET.fromstring(svg_content)
    except ET.ParseError as e:
        print(f"Error parsing SVG: {e}", file=sys.stderr)
        sys.exit(1)
    
    attrs = {}
    
    # Get width and height
    width = root.get('width', '')
    height = root.get('height', '')
    viewbox = root.get('viewBox', '')
    
    # If viewBox is missing but width/height exist, create viewBox
    if not viewbox and width and height:
        # Try to extract numeric values
        width_num = re.search(r'(\d+)', width)
        height_num = re.search(r'(\d+)', height)
        if width_num and height_num:
            viewbox = f"0 0 {width_num.group(1)} {height_num.group(1)}"
    
    attrs['width'] = width or '1200'
    attrs['height'] = height or '416'
    attrs['viewBox'] = viewbox or '0 0 1200 416'
    
    return attrs


def convert_svg_to_component(svg_content: str, component_name: str) -> str:
    """Convert SVG content to a React component with theme-aware styling."""
    # Extract SVG attributes
    attrs = extract_svg_attributes(svg_content)
    
    # Remove XML declaration and DOCTYPE if present
    svg_content = re.sub(r'<\?xml[^>]*\?>', '', svg_content)
    svg_content = re.sub(r'<!DOCTYPE[^>]*>', '', svg_content)
    
    # Extract the SVG element content (everything inside <svg>...</svg>)
    svg_match = re.search(r'<svg[^>]*>(.*)</svg>', svg_content, re.DOTALL)
    if not svg_match:
        print("Error: Could not find SVG element in file", file=sys.stderr)
        sys.exit(1)
    
    svg_inner = svg_match.group(1).strip()
    
    # Convert SVG attributes to React props
    # Convert class to className
    svg_inner = re.sub(r'\bclass=', 'className=', svg_inner)
    # Convert text-anchor to textAnchor
    svg_inner = re.sub(r'\btext-anchor=', 'textAnchor=', svg_inner)
    # Convert stroke-width to strokeWidth
    svg_inner = re.sub(r'\bstroke-width=', 'strokeWidth=', svg_inner)
    # Convert stroke-dasharray to strokeDasharray
    svg_inner = re.sub(r'\bstroke-dasharray=', 'strokeDasharray=', svg_inner)
    
    # Update style tag to use CSS variables for theme support
    # Replace colors in style tags and inline styles
    color_replacements = [
        (r'fill:\s*#000', 'fill: hsl(var(--svg-text))'),
        (r'fill:\s*#fff', 'fill: hsl(var(--svg-module-fill))'),
        (r'fill:\s*white', 'fill: hsl(var(--svg-module-fill))'),
        (r'stroke:\s*#000', 'stroke: hsl(var(--svg-stroke))'),
        (r'stroke:\s*#fff', 'stroke: hsl(var(--svg-stroke))'),
        (r'stroke:\s*white', 'stroke: hsl(var(--svg-stroke))'),
    ]
    
    for pattern, replacement in color_replacements:
        svg_inner = re.sub(pattern, replacement, svg_inner, flags=re.IGNORECASE)
    
    # Handle style tag - update colors to use CSS variables
    has_style = '<style>' in svg_inner
    style_content = ''
    
    if has_style:
        # Extract and update existing style tag
        style_match = re.search(r'<style[^>]*>(.*?)</style>', svg_inner, re.DOTALL)
        if style_match:
            style_content = style_match.group(1).strip()
            # Update colors in style content to use CSS variables
            for pattern, replacement in color_replacements:
                style_content = re.sub(pattern, replacement, style_content, flags=re.IGNORECASE)
            # Remove the original style tag from svg_inner
            svg_inner = re.sub(r'<style[^>]*>.*?</style>', '', svg_inner, flags=re.DOTALL)
    else:
        # Use default theme-aware styles if no style tag exists
        style_content = '''text { 
              font-family: Inter, Arial, sans-serif; 
              fill: hsl(var(--svg-text));
            }
            .module { 
              fill: hsl(var(--svg-module-fill)); 
              stroke: hsl(var(--svg-stroke)); 
              stroke-width: 2;
            }
            .audio { 
              stroke: hsl(var(--svg-stroke)); 
              stroke-width: 2;
            }
            .control { 
              stroke: hsl(var(--svg-stroke)); 
              stroke-width: 2; 
              stroke-dasharray: 6 6;
            }
            .title { 
              font-size: 13px; 
              font-weight: 600; 
              letter-spacing: 0.02em;
            }
            .label { 
              font-size: 10px; 
              font-weight: 400;
            }'''
    
    # Generate component code
    component_code = f'''/**
 * Theme-aware diagram component
 * Replaces the static image with an SVG that adapts to light/dark themes
 */
export function {component_name}() {{
  return (
    <div className="my-6 flex justify-center">
      <svg
        width="{attrs['width']}"
        height="{attrs['height']}"
        viewBox="{attrs['viewBox']}"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full h-auto"
        aria-label="{component_name.replace(/([A-Z])/g, ' $1').strip()}"
      >
        <style>
          {{`{style_content}`}}
        </style>

{svg_inner}
      </svg>
    </div>
  );
}}
'''
    
    return component_code


def update_diagrams_index(component_name: str):
    """Update diagrams/index.ts to export the new component."""
    index_file = Path('components/mdx/diagrams/index.ts')
    
    if not index_file.exists():
        # Create the index file if it doesn't exist
        index_file.write_text(
            '/**\n * Barrel export for all diagram components.\n */\n\n',
            encoding='utf-8'
        )
    
    content = index_file.read_text(encoding='utf-8')
    
    # Check if component is already exported
    export_line = f'export {{ {component_name} }} from "./{component_name}";'
    
    if re.search(rf'export\s*{{\s*{component_name}\s*}}\s*from', content):
        print(f"Component {component_name} is already exported in diagrams/index.ts")
    else:
        # Add export at the end of the file (before the last newline if present)
        content = content.rstrip()
        if content and not content.endswith('\n'):
            content += '\n'
        content += f'{export_line}\n'
        index_file.write_text(content, encoding='utf-8')
        print(f"✓ Updated {index_file}")


def update_mdx_file(mdx_file: Path, image_path: str, component_name: str):
    """Replace image reference in MDX file with component."""
    content = mdx_file.read_text(encoding='utf-8')
    
    # Pattern to match image references
    # Handle both .svg and .jpeg/.jpg extensions
    patterns = [
        # Exact path match
        rf'!\[\]\({re.escape(image_path)}\)',
        # Path with .svg extension
        rf'!\[\]\({re.escape(image_path.replace(".svg", "").replace(".jpeg", "").replace(".jpg", ""))}\.(svg|jpeg|jpg)\)',
        # Relative path variations
        rf'!\[\]\([^)]*{re.escape(Path(image_path).name)}\)',
    ]
    
    replacement = f'<{component_name} />'
    
    updated = False
    for pattern in patterns:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            updated = True
            break
    
    if not updated:
        print(f"Warning: Could not find image reference in {mdx_file}", file=sys.stderr)
        print(f"  Looking for patterns matching: {image_path}", file=sys.stderr)
        # Show what image references exist
        image_refs = re.findall(r'!\[\]\([^)]+\)', content)
        if image_refs:
            print(f"  Found image references:", file=sys.stderr)
            for ref in image_refs[:5]:  # Show first 5
                print(f"    {ref}", file=sys.stderr)
    else:
        mdx_file.write_text(content, encoding='utf-8')
        print(f"✓ Updated {mdx_file}")


def main():
    if len(sys.argv) < 4:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    
    svg_file = Path(sys.argv[1])
    component_name = sys.argv[2]
    mdx_file = Path(sys.argv[3])
    image_path = sys.argv[4] if len(sys.argv) > 4 else None
    
    # Validate inputs
    if not svg_file.exists():
        print(f"Error: SVG file not found: {svg_file}", file=sys.stderr)
        sys.exit(1)
    
    if not mdx_file.exists():
        print(f"Error: MDX file not found: {mdx_file}", file=sys.stderr)
        sys.exit(1)
    
    # Read SVG content
    svg_content = svg_file.read_text(encoding='utf-8')
    
    # Convert to component
    component_code = convert_svg_to_component(svg_content, component_name)
    
    # Write component file to diagrams folder
    diagrams_dir = Path('components/mdx/diagrams')
    diagrams_dir.mkdir(exist_ok=True)
    component_file = diagrams_dir / f'{component_name}.tsx'
    component_file.write_text(component_code, encoding='utf-8')
    print(f"✓ Created {component_file}")
    
    # Update diagrams/index.ts
    update_diagrams_index(component_name)
    
    # Update MDX file
    if image_path:
        update_mdx_file(mdx_file, image_path, component_name)
    else:
        # Try to infer image path from SVG file path
        # e.g., public/machines/analog-four-mkii/images/file.svg -> /machines/analog-four-mkii/images/file.svg
        if 'public' in str(svg_file):
            inferred_path = '/' + str(svg_file).split('public/', 1)[1]
            update_mdx_file(mdx_file, inferred_path, component_name)
        else:
            print(f"Warning: Could not infer image path. Please update {mdx_file} manually", file=sys.stderr)
            print(f"  Replace the image reference with: <{component_name} />", file=sys.stderr)
    
    print(f"\n✓ Import complete!")
    print(f"\nNext steps:")
    print(f"  1. Verify the component looks correct")
    print(f"  2. Test theme switching to ensure colors adapt properly")
    print(f"  3. Adjust CSS variables in globals.css if needed")


if __name__ == '__main__':
    main()

