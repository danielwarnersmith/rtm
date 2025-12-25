"""CLI entrypoint for oledvec."""

import argparse
import sys
from pathlib import Path
import cv2
import json
import numpy as np
from datetime import datetime

from .detect import detect_oled_bbox, qualify_oled
from .process import normalize_image, binarize, compute_otsu_threshold, compute_pixel_density
from .export_svg import export_svg
from .state import (
    get_state_path,
    load_state,
    save_state,
    create_item_state,
    update_item_state,
    get_item_state,
    set_item_state,
)
from .shapes import update_shapes_from_bitmap


def find_repo_root() -> Path:
    """Find repository root by looking for tools/oledvec directory."""
    current = Path(__file__).resolve()
    while current.parent != current:
        if (current / "tools" / "oledvec").exists():
            return current
        current = current.parent
    
    # Fallback: assume we're in tools/oledvec/engine-python
    return Path(__file__).resolve().parent.parent.parent.parent


def sanitize_slug(filename: str) -> str:
    """Convert filename to slug for use as item ID."""
    # Remove extension
    slug = Path(filename).stem
    # Replace spaces and special chars with hyphens
    slug = "".join(c if c.isalnum() or c in "-_" else "-" for c in slug)
    # Remove consecutive hyphens
    while "--" in slug:
        slug = slug.replace("--", "-")
    # Remove leading/trailing hyphens
    slug = slug.strip("-")
    return slug or "untitled"


def process_image(
    image_path: Path,
    device: str,
    repo_root: Path,
    move_rejected: bool = True,
) -> dict:
    """
    Process a single image.
    
    Returns dict with processing results.
    """
    slug = sanitize_slug(image_path.name)
    
    # Read image
    image = cv2.imread(str(image_path))
    if image is None:
        return {
            "slug": slug,
            "status": "error",
            "error": "Failed to read image",
        }
    
    # Detect OLED bbox
    bbox, confidence, metrics = detect_oled_bbox(image)
    is_qualifying, reason_codes = qualify_oled(bbox, confidence, metrics, image=image)
    
    # Get paths
    public_oled_dir = repo_root / "public" / "oled" / device
    incoming_dir = public_oled_dir / "incoming"
    rejected_dir = public_oled_dir / "rejected"
    screens_dir = public_oled_dir / "screens"
    
    screens_dir.mkdir(parents=True, exist_ok=True)
    
    # Determine source path (relative to public)
    if image_path.parent == incoming_dir:
        source_path = f"/oled/{device}/incoming/{image_path.name}"
    elif image_path.parent == rejected_dir:
        source_path = f"/oled/{device}/rejected/{image_path.name}"
    else:
        source_path = f"/oled/{device}/incoming/{image_path.name}"
    
    if not is_qualifying:
        # Rejected - move to rejected/ if requested
        if move_rejected and image_path.parent == incoming_dir:
            rejected_path = rejected_dir / image_path.name
            rejected_path.parent.mkdir(parents=True, exist_ok=True)
            image_path.rename(rejected_path)
            source_path = f"/oled/{device}/rejected/{image_path.name}"
        
        # Create state for rejected item
        item_state = create_item_state(
            source_path=source_path,
            oled_bbox=bbox,
            confidence=confidence,
            is_qualifying=False,
            reason_codes=reason_codes,
        )
        set_item_state(device, slug, item_state, repo_root)
        
        return {
            "slug": slug,
            "status": "rejected",
            "confidence": confidence,
            "reason_codes": reason_codes,
        }
    
    # Qualifying - process it
    # Normalize
    normalized = normalize_image(image, bbox)
    
    # Compute metrics
    otsu_threshold = compute_otsu_threshold(normalized)
    pixel_density = compute_pixel_density(normalized)
    
    # Get or create state
    item_state = get_item_state(device, slug, repo_root)
    if item_state is None:
        item_state = create_item_state(
            source_path=source_path,
            oled_bbox=bbox,
            confidence=confidence,
            is_qualifying=True,
            reason_codes=[],
            otsu_threshold=otsu_threshold,
            pixel_density=pixel_density,
        )
    else:
        # Update existing state
        item_state = update_item_state(
            item_state,
            oled_bbox=list(bbox) if bbox else None,
            validation={
                "is_qualifying": True,
                "confidence": confidence,
                "reason_codes": [],
                "pixel_density": pixel_density,
            },
            normalize_params={
                "target_size": [128, 64],
                "otsu_threshold": otsu_threshold,
            },
        )
    
    # Get threshold and overrides from state
    threshold = item_state.get("normalize_params", {}).get("otsu_threshold")
    overrides = item_state.get("overrides", {})
    
    # Binarize
    bitmap = binarize(normalized, threshold=threshold, overrides=overrides)
    
    # Export SVG
    svg_content = export_svg(bitmap)
    svg_path = screens_dir / f"{slug}.svg"
    svg_path.write_text(svg_content, encoding="utf-8")
    
    # Export preview PNG
    preview_path = screens_dir / f"{slug}_preview_128x64.png"
    preview_image = (bitmap.astype(np.uint8) * 255)
    cv2.imwrite(str(preview_path), preview_image)
    
    # Update shapes
    update_shapes_from_bitmap(device, bitmap, repo_root)
    
    # Save state
    item_state = update_item_state(
        item_state,
        source_path=source_path,
    )
    set_item_state(device, slug, item_state, repo_root)
    
    return {
        "slug": slug,
        "status": "success",
        "confidence": confidence,
        "svg": f"/oled/{device}/screens/{slug}.svg",
        "preview": f"/oled/{device}/screens/{slug}_preview_128x64.png",
    }


def update_manifest(device: str, repo_root: Path) -> None:
    """Update manifest.json from state and filesystem."""
    state = load_state(device, repo_root)
    public_oled_dir = repo_root / "public" / "oled" / device
    manifest_path = public_oled_dir / "index.json"
    
    screens = []
    rejected = []
    
    # Process items from state
    for slug, item_state in state.get("items", {}).items():
        validation = item_state.get("validation", {})
        is_qualifying = validation.get("is_qualifying", False)
        confidence = validation.get("confidence", 0.0)
        reason_codes = validation.get("reason_codes", [])
        source_path = item_state.get("source_path", "")
        updated_at = item_state.get("updated_at", "")
        
        if is_qualifying:
            screens.append({
                "id": slug,
                "svg": f"/oled/{device}/screens/{slug}.svg",
                "source": source_path,
                "confidence": confidence,
                "updatedAt": updated_at,
            })
        else:
            rejected.append({
                "file": source_path.split("/")[-1] if source_path else slug,
                "reason": reason_codes[0] if reason_codes else "unknown",
                "confidence": confidence,
                "notes": item_state.get("notes", ""),
            })
    
    # Sort screens by updatedAt
    screens.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
    
    manifest = {
        "screens": screens,
        "rejected": rejected,
    }
    
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


def cmd_process(args):
    """Process command: batch process incoming images."""
    repo_root = Path(args.repo_root) if args.repo_root else find_repo_root()
    device = args.device
    
    incoming_dir = repo_root / "public" / "oled" / device / "incoming"
    
    if not incoming_dir.exists():
        print(f"Error: Incoming directory not found: {incoming_dir}", file=sys.stderr)
        sys.exit(1)
    
    # Find image files
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"}
    image_files = [
        f for f in incoming_dir.iterdir()
        if f.is_file() and f.suffix.lower() in image_extensions
    ]
    
    if not image_files:
        print(f"No images found in {incoming_dir}")
        return
    
    print(f"Processing {len(image_files)} images...")
    
    results = {
        "success": [],
        "rejected": [],
        "errors": [],
    }
    
    for image_path in image_files:
        print(f"Processing {image_path.name}...", end=" ", flush=True)
        result = process_image(
            image_path,
            device,
            repo_root,
            move_rejected=args.move_rejected,
        )
        
        if result["status"] == "success":
            results["success"].append(result)
            print(f"✓ Success (confidence: {result['confidence']:.2f})")
        elif result["status"] == "rejected":
            results["rejected"].append(result)
            print(f"✗ Rejected: {', '.join(result['reason_codes'])}")
        else:
            results["errors"].append(result)
            print(f"✗ Error: {result.get('error', 'Unknown error')}")
    
    # Update manifest
    update_manifest(device, repo_root)
    
    print(f"\nSummary:")
    print(f"  Success: {len(results['success'])}")
    print(f"  Rejected: {len(results['rejected'])}")
    print(f"  Errors: {len(results['errors'])}")


def cmd_server(args):
    """Server command: start FastAPI server."""
    # Import here to avoid requiring fastapi for CLI-only usage
    from .server import run_server
    
    repo_root = Path(args.repo_root) if args.repo_root else find_repo_root()
    run_server(
        device=args.device,
        host=args.host,
        port=args.port,
        repo_root=repo_root,
    )


def main():
    """Main CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="OLED to SVG conversion tool",
        prog="python -m oledvec",
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Process command
    process_parser = subparsers.add_parser("process", help="Batch process incoming images")
    process_parser.add_argument("device", help="Device identifier (e.g., analog-rytm-mkii)")
    process_parser.add_argument(
        "--repo-root",
        help="Repository root path (default: auto-detect)",
    )
    process_parser.add_argument(
        "--move-rejected",
        action="store_true",
        default=True,
        help="Move rejected images to rejected/ directory (default: True)",
    )
    process_parser.add_argument(
        "--no-move-rejected",
        dest="move_rejected",
        action="store_false",
        help="Keep rejected images in incoming/",
    )
    
    # Server command
    server_parser = subparsers.add_parser("server", help="Start review server")
    server_parser.add_argument(
        "--device",
        required=True,
        help="Device identifier (e.g., analog-rytm-mkii, analog-four-mkii)",
    )
    server_parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host to bind to (default: 127.0.0.1)",
    )
    server_parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind to (default: 8000)",
    )
    server_parser.add_argument(
        "--repo-root",
        help="Repository root path (default: auto-detect)",
    )
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    if args.command == "process":
        cmd_process(args)
    elif args.command == "server":
        cmd_server(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

