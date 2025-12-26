# Contributing to RTM

RTM is a documentation site for Elektron machine manuals, built with Next.js, MDX, and Contentlayer.

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repo-url>
cd rtm
npm install
```

### Development Server

```bash
npm run dev
```

Open http://localhost:3000

### Production Build

```bash
npm run build
```

This generates a static site in `out/` and runs Pagefind for search indexing.

## Project Structure

```
rtm/
├── app/                      # Next.js app directory
│   ├── page.tsx              # Home page with search
│   ├── machines/[...slug]/   # Dynamic manual pages
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── mdx/                  # MDX component overrides
│   │   ├── MDXComponents.tsx # Component registry
│   │   └── ClickableTableRow.tsx
│   ├── Header.tsx            # Site header
│   ├── TableOfContents.tsx   # Floating TOC modal
│   └── ...
├── content/
│   └── machines/             # MDX manual content
│       └── <machine-name>/
│           └── manual.mdx
├── public/
│   └── machines/             # Manual images
│       └── <machine-name>/
│           └── images/
├── scripts/                  # Import/conversion scripts
├── docs/                     # Development documentation
└── contentlayer.config.ts    # Content schema
```

## Adding a New Manual

See [docs/import-checklist.md](docs/import-checklist.md) for the full process.

Quick overview:
1. Convert PDF with Marker
2. Run `./import-manual.sh <name> <source> "<title>"`
3. Run `python3 scripts/convert-manual-conventions.py`
4. Classify Tip/Warning icons
5. Verify with `npm run build`

## Code Style

### Components

- Components live in `components/`
- MDX-specific components in `components/mdx/`
- Use TypeScript for all components
- Prefer function components with explicit prop types

### CSS

- Use Tailwind CSS for styling
- Custom prose styles in `globals.css`
- Dark mode support required (use `dark:` variants)

### MDX Components

Custom components available in MDX files:

| Component | Usage |
|-----------|-------|
| `<Key>` | Physical keys: `<Key>FUNC</Key>` |
| `<Knob>` | Rotary encoders: `<Knob>LEVEL</Knob>` |
| `<LED>` | LED indicators: `<LED>PATTERN</LED>` |
| `<Param>` | Parameters: `<Param>VOL</Param>` |
| `<Tip>` | Helpful hints |
| `<Warning>` | Important notices |
| `<Footnotes>` | Legal disclaimer wrapper |
| `<Footnote>` | Individual collapsible footnote |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build + Pagefind |
| `npm run lint` | Run ESLint |
| `npm run storybook` | Start Storybook development server |
| `npm run build-storybook` | Build static Storybook site |
| `./import-manual.sh` | Import converted PDF |
| `scripts/convert-manual-conventions.py` | Convert formatting to components |

## Component Development with Storybook

Storybook provides an isolated environment for developing and testing UI components.

### Running Storybook

```bash
npm run storybook
```

Open http://localhost:6006 to view components in isolation.

### Story Locations

Stories are co-located with components:
- `components/*.stories.tsx` - Component stories
- `components/mdx/**/*.stories.tsx` - MDX component stories

### Dark Mode Testing

Use the theme toggle in Storybook's toolbar to switch between light and dark modes. The toggle applies the `dark` class to the `<html>` element, matching the app's behavior.

### Available Stories

- **Header** - Navigation header with title display
- **TableOfContents** - Floating TOC modal
- **MDX Components** - Key, Knob, Tip, and other MDX-specific components

### Editor Integration

Storybook can open files in your editor (Cursor) when you click on story file links. To enable this:

1. **Quick setup (automatic):** The `npm run storybook` script automatically adds Cursor to PATH.

2. **Permanent setup (recommended):** Add Cursor to your PATH permanently:
   ```bash
   # Run the setup script
   source .storybook/setup-cursor.sh
   
   # Add to your shell profile (~/.zshrc or ~/.bash_profile)
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

   After this, Storybook will be able to open files in Cursor without any PATH modifications.

## Testing Changes

1. Run `npm run dev` for live preview
2. Run `npm run storybook` to test components in isolation
3. Run `npm run build` to catch MDX errors
4. Test search after build (requires full build)
5. Check both light and dark themes
6. Test on mobile viewport

## Common Issues

### MDX Build Errors

- Unescaped `<` or `>` - escape or use component
- Missing `/` on self-closing tags
- Component not in MDXComponents registry

### Search Not Working

Search requires a production build. Run `npm run build` first.

### Images Not Loading

Check that image paths match `public/machines/<name>/images/`.

