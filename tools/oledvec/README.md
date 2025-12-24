# OLED to SVG Conversion Tool

Tool for converting OLED screenshots (128×64 pixels) from Elektron devices into deterministic, theme-responsive SVGs.

## Overview

This toolchain processes OLED screenshots through:
1. **Detection**: Finds OLED bounding box in mixed images
2. **Qualification**: Validates images as OLED screenshots (confidence >= 0.85)
3. **Normalization**: Crops and resizes to exactly 128×64 pixels
4. **Binarization**: Converts to boolean bitmap (Otsu threshold or manual)
5. **Export**: Generates SVG with row-major rectangles using `var(--foreground)` for theme support

## Quick Start

### 1. Setup Python Environment

```bash
npm run oled:venv
```

This creates a virtual environment and installs dependencies (OpenCV, NumPy, FastAPI, etc.).

### 2. Process Images

Place images in `public/oled/<device>/incoming/`, then run:

```bash
# Default device (analog-rytm-mkii)
npm run oled:process

# Or specify a device
DEVICE=analog-four-mkii npm run oled:process
```

This will:
- Process all images in `incoming/`
- Generate SVGs in `public/oled/<device>/screens/`
- Move rejected images to `public/oled/<device>/rejected/` (by default)
- Update `public/oled/<device>/index.json` manifest

### 3. Review and Edit

Start the review server:

```bash
# Default device (analog-rytm-mkii)
npm run oled:review

# Or specify a device
DEVICE=analog-four-mkii npm run oled:review
```

Then in a separate terminal, start the UI dev server:

```bash
cd tools/oledvec/ui && npm install && npm run dev
```

Open http://localhost:5173 to review and edit screens.

## File Structure

```
tools/oledvec/
├── engine-python/          # Python processing engine
│   ├── oledvec/           # Main package
│   │   ├── detect.py      # OLED bbox detection
│   │   ├── process.py    # Normalize + binarize
│   │   ├── export_svg.py  # SVG generation
│   │   ├── state.py       # State management
│   │   ├── shapes.py      # Shape learning
│   │   ├── server.py      # FastAPI server
│   │   └── __main__.py    # CLI entrypoint
│   └── tests/             # Regression tests
└── ui/                    # TypeScript/React review UI
    └── src/
        ├── components/    # UI components
        └── api.ts         # API client

public/oled/<device>/
├── incoming/              # Drop images here
├── rejected/              # Non-qualifying images (auto-moved)
├── screens/               # Generated SVGs
└── index.json             # Manifest

tools/oledvec/state/<device>/
├── state.json             # Processing state (all items)
└── shapes.json            # Shape database
```

## Usage

### CLI Commands

```bash
# Batch process images
python -m oledvec process <device> [--no-move-rejected]

# Start review server
python -m oledvec server --device <device> [--host 127.0.0.1] [--port 8000]

# Examples:
python -m oledvec process analog-rytm-mkii
python -m oledvec process analog-four-mkii
python -m oledvec server --device analog-rytm-mkii
```

### API Endpoints

- `GET /api/items` - List all items
- `GET /api/item/{id}` - Get item state and URLs
- `POST /api/item/{id}/state` - Update item state
- `POST /api/item/{id}/rerun` - Reprocess item

### State File Format

State is stored in `tools/oledvec/state/<device>/state.json`:

```json
{
  "version": "1.0",
  "items": {
    "screen-001": {
      "version": "1.0",
      "source_path": "/oled/<device>/incoming/screen-001.jpg",
      "updated_at": "2024-01-01T00:00:00Z",
      "oled_bbox": [50, 30, 300, 150],
      "normalize_params": {
        "target_size": [128, 64],
        "otsu_threshold": 127
      },
      "validation": {
        "is_qualifying": true,
        "confidence": 0.92,
        "reason_codes": [],
        "pixel_density": 0.15
      },
      "overrides": {
        "force_on": [[10, 20], [15, 25]],
        "force_off": [[5, 10]]
      },
      "flags": {},
      "notes": ""
    }
  }
}
```

## SVG Output Format

SVGs use:
- `viewBox="0 0 128 64"` (device space)
- Row-major rectangle ordering
- `fill="var(--foreground)"` for ON pixels (theme-responsive)
- Background is implicit (transparent, inherits page background)

Example:
```svg
<svg viewBox="0 0 128 64" xmlns="http://www.w3.org/2000/svg">
  <g id="pixels">
    <rect x="0" y="0" width="10" height="1" fill="var(--foreground)" />
    <rect x="15" y="0" width="5" height="1" fill="var(--foreground)" />
    ...
  </g>
</svg>
```

## Qualification

Images are qualified as OLED screenshots if:
- Confidence >= 0.85
- Aspect ratio close to 2:1
- Reasonable area fraction
- High rectangularity

Rejected images are moved to `rejected/` by default (use `--no-move-rejected` to keep in `incoming/`).

## Development

### Running Tests

```bash
cd tools/oledvec/engine-python
source venv/bin/activate
python -m pytest tests/
```

### Building UI for Production

```bash
cd tools/oledvec/ui
npm run build
```

The FastAPI server will serve the built UI from `ui/dist/` in production mode.

## Notes

- State files are tracked in git for reproducibility
- SVGs are deterministic: same input + state = same output
- Shape learning extracts connected components and maintains a hash database (not yet used in export)
- The UI allows manual editing of bbox, threshold, pixel overrides, and notes

