"""FastAPI server for review UI."""

import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

import cv2
import numpy as np

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .detect import detect_oled_bbox, qualify_oled
from .process import normalize_image, binarize, compute_otsu_threshold, compute_pixel_density
from .export_svg import export_svg
from .state import (
    load_state,
    save_state,
    get_item_state,
    set_item_state,
    update_item_state,
)
from .shapes import update_shapes_from_bitmap


# Pydantic models for API
class ItemStateUpdate(BaseModel):
    oled_bbox: Optional[List[int]] = None
    threshold: Optional[float] = None
    overrides: Optional[Dict[str, List[List[int]]]] = None
    flags: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    manual_status: Optional[str] = None  # "ok", "needs_review", "rejected", or None to clear


class ItemResponse(BaseModel):
    id: str
    state: Dict[str, Any]
    source_url: str
    preview_url: Optional[str] = None
    svg_url: Optional[str] = None


def create_app(device: str, repo_root: Optional[Path] = None) -> FastAPI:
    """Create FastAPI app for device."""
    if repo_root is None:
        # Find repo root
        current = Path(__file__).resolve()
        while current.parent != current:
            if (current / "tools" / "oledvec").exists():
                repo_root = current
                break
            current = current.parent
        
        if repo_root is None:
            repo_root = Path.cwd()
    
    app = FastAPI(title=f"OLED Review - {device}")
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, restrict this
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    public_oled_dir = repo_root / "public" / "oled" / device
    ui_dist_dir = repo_root / "tools" / "oledvec" / "ui" / "dist"
    
    # Serve static files from public/oled
    @app.get("/api/public/{path:path}")
    async def serve_public(path: str):
        """Serve files from public/oled directory."""
        # Remove the /oled/{device}/ prefix from path if present, since public_oled_dir already includes it
        path_parts = path.split("/")
        if len(path_parts) >= 2 and path_parts[0] == "oled" and path_parts[1] == device:
            # Path starts with oled/{device}/, remove those parts
            path = "/".join(path_parts[2:])
        
        file_path = public_oled_dir / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    
    # API endpoints
    @app.get("/api/device")
    async def get_device():
        """Get current device name."""
        return {"device": device}
    
    @app.get("/api/items")
    async def list_items():
        """List all items from state."""
        state = load_state(device, repo_root)
        items = []
        
        for item_id, item_state in state.get("items", {}).items():
            validation = item_state.get("validation", {})
            is_qualifying = validation.get("is_qualifying", False)
            
            # Check for manual status override
            flags = item_state.get("flags", {})
            manual_status = flags.get("manual_status")
            
            # Use manual status if set, otherwise use qualification status
            if manual_status in ["ok", "needs_review", "rejected"]:
                status = manual_status
            else:
                status = "ok" if is_qualifying else "rejected"
            
            source_path = item_state.get("source_path", "")
            source_url = f"/api/public{source_path}" if source_path else None
            
            preview_url = None
            svg_url = None
            
            # Check if preview/SVG files exist (regardless of qualification status)
            # Files are generated on rerun even if not qualifying
            screens_dir = public_oled_dir / "screens"
            preview_path = screens_dir / f"{item_id}_preview_128x64.png"
            svg_path = screens_dir / f"{item_id}.svg"
            
            if preview_path.exists():
                preview_url = f"/api/public/screens/{item_id}_preview_128x64.png"
            if svg_path.exists():
                svg_url = f"/api/public/screens/{item_id}.svg"
            
            items.append({
                "id": item_id,
                "status": status,
                "confidence": validation.get("confidence", 0.0),
                "source_url": source_url,
                "preview_url": preview_url,
                "svg_url": svg_url,
                "updated_at": item_state.get("updated_at", ""),
            })
        
        return {"items": items}
    
    @app.get("/api/item/{item_id}")
    async def get_item(item_id: str):
        """Get item state and URLs."""
        item_state = get_item_state(device, item_id, repo_root)
        
        if item_state is None:
            raise HTTPException(status_code=404, detail="Item not found")
        
        source_path = item_state.get("source_path", "")
        source_url = f"/api/public{source_path}" if source_path else None
        
        validation = item_state.get("validation", {})
        is_qualifying = validation.get("is_qualifying", False)
        
        preview_url = None
        svg_url = None
        
        # Check if preview/SVG files exist (regardless of qualification status)
        # Files are generated on rerun even if not qualifying
        screens_dir = public_oled_dir / "screens"
        preview_path = screens_dir / f"{item_id}_preview_128x64.png"
        svg_path = screens_dir / f"{item_id}.svg"
        
        if preview_path.exists():
            preview_url = f"/api/public/screens/{item_id}_preview_128x64.png"
        if svg_path.exists():
            svg_url = f"/api/public/screens/{item_id}.svg"
        
        return ItemResponse(
            id=item_id,
            state=item_state,
            source_url=source_url or "",
            preview_url=preview_url,
            svg_url=svg_url,
        )
    
    @app.post("/api/item/{item_id}/state")
    async def update_item_state_endpoint(item_id: str, update: ItemStateUpdate):
        """Update item state."""
        item_state = get_item_state(device, item_id, repo_root)
        
        if item_state is None:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Apply updates
        updates = {}
        
        if update.oled_bbox is not None:
            updates["oled_bbox"] = update.oled_bbox
        
        # Handle threshold update
        # If threshold is explicitly set (not None), update it
        # If threshold is None and normalize_params exists, we don't change it (preserve existing)
        # This allows the UI to not send threshold when Auto is selected
        if update.threshold is not None:
            if "normalize_params" not in item_state:
                item_state["normalize_params"] = {}
            item_state["normalize_params"]["otsu_threshold"] = update.threshold
            updates["normalize_params"] = item_state["normalize_params"]
        # Note: We don't clear threshold when update.threshold is None
        # This preserves the existing threshold when Auto is selected
        
        if update.overrides is not None:
            # Convert list of [x, y] to list of (x, y) tuples
            overrides = {}
            if "force_on" in update.overrides:
                overrides["force_on"] = [
                    tuple(coord) for coord in update.overrides["force_on"]
                ]
            if "force_off" in update.overrides:
                overrides["force_off"] = [
                    tuple(coord) for coord in update.overrides["force_off"]
                ]
            updates["overrides"] = overrides
        
        # Handle manual status update first (before flags, so it doesn't get overwritten)
        if update.manual_status is not None:
            # Store manual status in flags
            if "flags" not in item_state:
                item_state["flags"] = {}
            if update.manual_status == "" or update.manual_status is None:
                # Clear manual status
                item_state["flags"].pop("manual_status", None)
            else:
                # Set manual status
                if update.manual_status not in ["ok", "needs_review", "rejected"]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid manual_status: {update.manual_status}. Must be 'ok', 'needs_review', or 'rejected'"
                    )
                item_state["flags"]["manual_status"] = update.manual_status
        
        # Handle flags update (merge with existing flags, including manual_status if set above)
        if update.flags is not None:
            # Merge flags instead of replacing
            if "flags" not in item_state:
                item_state["flags"] = {}
            item_state["flags"].update(update.flags)
            # Create a copy to avoid reference issues
            updates["flags"] = item_state["flags"].copy()
        elif update.manual_status is not None:
            # If only manual_status was updated, still need to set flags
            # Create a copy to avoid reference issues
            updates["flags"] = item_state["flags"].copy()
        
        if update.notes is not None:
            updates["notes"] = update.notes
        
        # Update state
        updated_state = update_item_state(item_state, **updates)
        set_item_state(device, item_id, updated_state, repo_root)
        
        return {"status": "ok", "state": updated_state}
    
    @app.post("/api/item/{item_id}/rerun")
    async def rerun_item(item_id: str):
        """Reprocess item and return updated artifacts."""
        item_state = get_item_state(device, item_id, repo_root)
        
        if item_state is None:
            raise HTTPException(status_code=404, detail="Item not found")
        
        source_path = item_state.get("source_path", "")
        if not source_path:
            raise HTTPException(status_code=400, detail="No source path in state")
        
        # Resolve source file
        # source_path is like "/oled/analog-rytm-mkii/incoming/file.jpg"
        source_file = repo_root / "public" / source_path.lstrip("/")
        
        if not source_file.exists():
            raise HTTPException(status_code=404, detail="Source file not found")
        
        # Read image
        image = cv2.imread(str(source_file))
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to read image")
        
        # Get bbox from state or detect
        bbox_list = item_state.get("oled_bbox")
        if bbox_list and len(bbox_list) == 4:
            # Use state bbox (user may have manually adjusted it)
            bbox = tuple(bbox_list)
            # Compute metrics for the state bbox
            h, w = image.shape[:2]
            total_area = h * w
            x, y, w_rect, h_rect = bbox
            
            # Validate bbox
            if w_rect <= 0 or h_rect <= 0:
                raise HTTPException(status_code=400, detail="Invalid bbox dimensions in state")
            if x < 0 or y < 0 or x + w_rect > w or y + h_rect > h:
                raise HTTPException(status_code=400, detail="Bbox out of image bounds")
            
            area = w_rect * h_rect
            
            # Calculate metrics for this bbox
            aspect_ratio = w_rect / h_rect if h_rect > 0 else 0
            target_aspect = 128 / 64  # 2:1
            aspect_score = 1.0 - min(abs(aspect_ratio - target_aspect) / target_aspect, 1.0)
            area_fraction = area / total_area if total_area > 0 else 0
            
            # Compute confidence score (similar to detection)
            confidence = (
                aspect_score * 0.4 +
                min(area_fraction, 0.5) * 2.0 * 0.3 +
                0.8 * 0.3  # Assume good rectangularity for manually set bbox
            )
            
            metrics = {
                "aspect_ratio": aspect_ratio,
                "aspect_score": aspect_score,
                "area_fraction": area_fraction,
                "rectangularity": 0.8,  # Assume good rectangularity
            }
        else:
            # Detect bbox
            detected_bbox, confidence, metrics = detect_oled_bbox(image)
            if detected_bbox is None:
                raise HTTPException(status_code=400, detail="Could not detect OLED bbox")
            bbox = detected_bbox
        
        # Re-run qualification check (pass image for diagram detection)
        is_qualifying, reason_codes = qualify_oled(bbox, confidence, metrics, image=image)
        
        # Normalize
        normalized = normalize_image(image, bbox)
        
        # Get threshold and overrides
        threshold = item_state.get("normalize_params", {}).get("otsu_threshold")
        if threshold is None:
            threshold = compute_otsu_threshold(normalized)
        
        # Get overrides and convert to proper format (tuples)
        overrides_raw = item_state.get("overrides", {})
        overrides = {}
        if "force_on" in overrides_raw:
            overrides["force_on"] = [
                tuple(coord) if isinstance(coord, list) else coord
                for coord in overrides_raw["force_on"]
            ]
        if "force_off" in overrides_raw:
            overrides["force_off"] = [
                tuple(coord) if isinstance(coord, list) else coord
                for coord in overrides_raw["force_off"]
            ]
        
        # Binarize
        bitmap = binarize(normalized, threshold=threshold, overrides=overrides if overrides else None)
        
        # Update pixel density
        pixel_density = compute_pixel_density(normalized)
        
        # Always export SVG and preview when re-running (so user can see their work)
        # Qualification status is tracked separately
        svg_content = export_svg(bitmap)
        screens_dir = public_oled_dir / "screens"
        screens_dir.mkdir(parents=True, exist_ok=True)
        svg_path = screens_dir / f"{item_id}.svg"
        svg_path.write_text(svg_content, encoding="utf-8")
        svg_url = f"/api/public/screens/{item_id}.svg"
        
        # Export preview PNG
        preview_path = screens_dir / f"{item_id}_preview_128x64.png"
        
        # Validate bitmap dimensions
        if bitmap.shape != (64, 128):
            raise HTTPException(
                status_code=500, 
                detail=f"Bitmap has wrong dimensions: {bitmap.shape}, expected (64, 128)"
            )
        
        preview_image = (bitmap.astype(np.uint8) * 255)
        
        # Ensure the image is in the correct format for cv2.imwrite
        # cv2.imwrite expects (height, width) for grayscale images
        if preview_image.shape != (64, 128):
            raise HTTPException(
                status_code=500,
                detail=f"Preview image has wrong dimensions after conversion: {preview_image.shape}, expected (64, 128)"
            )
        
        success = cv2.imwrite(str(preview_path), preview_image)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to write preview image to {preview_path}")
        
        # Wait a moment and verify file exists and has correct size
        import time
        time.sleep(0.1)
        if not preview_path.exists():
            raise HTTPException(status_code=500, detail=f"Preview image was not created at {preview_path}")
        
        file_size = preview_path.stat().st_size
        if file_size == 0:
            raise HTTPException(status_code=500, detail=f"Preview image file is empty at {preview_path}")
        
        preview_url = f"/api/public/screens/{item_id}_preview_128x64.png"
        
        print(f"Created preview: {preview_path} (exists: {preview_path.exists()}, size: {file_size} bytes)")
        print(f"Preview URL: {preview_url}")
        print(f"Bitmap shape: {bitmap.shape}, Preview image shape: {preview_image.shape}")
        
        # Update shapes only if qualifying
        if is_qualifying:
            update_shapes_from_bitmap(device, bitmap, repo_root)
        
        # Handle file movement if status changed
        incoming_dir = public_oled_dir / "incoming"
        rejected_dir = public_oled_dir / "rejected"
        new_source_path = source_path
        updates = {}
        
        was_qualifying = item_state.get("validation", {}).get("is_qualifying", False)
        
        # Check if file is in rejected/ or incoming/ directory based on source_path
        is_in_rejected = "/rejected/" in source_path
        is_in_incoming = "/incoming/" in source_path
        
        if is_qualifying and not was_qualifying:
            # Now qualifying - move from rejected/ to incoming/ if it's in rejected/
            if is_in_rejected:
                try:
                    incoming_path = incoming_dir / source_file.name
                    incoming_dir.mkdir(parents=True, exist_ok=True)
                    if source_file.exists():
                        source_file.rename(incoming_path)
                    new_source_path = f"/oled/{device}/incoming/{source_file.name}"
                    updates["source_path"] = new_source_path
                except Exception as e:
                    # Log but don't fail - file movement is optional
                    import traceback
                    print(f"Warning: Failed to move file from rejected/ to incoming/: {e}")
                    print(traceback.format_exc())
        elif not is_qualifying and was_qualifying:
            # No longer qualifying - move from incoming/ to rejected/
            if is_in_incoming:
                try:
                    rejected_path = rejected_dir / source_file.name
                    rejected_dir.mkdir(parents=True, exist_ok=True)
                    if source_file.exists():
                        source_file.rename(rejected_path)
                    new_source_path = f"/oled/{device}/rejected/{source_file.name}"
                    updates["source_path"] = new_source_path
                except Exception as e:
                    # Log but don't fail - file movement is optional
                    import traceback
                    print(f"Warning: Failed to move file from incoming/ to rejected/: {e}")
                    print(traceback.format_exc())
        
        # Update bbox if it changed
        current_bbox = item_state.get("oled_bbox")
        if current_bbox != list(bbox):
            updates["oled_bbox"] = list(bbox) if bbox else None
        
        # Update state with new qualification status
        updated_state = update_item_state(
            item_state,
            **updates,
            validation={
                "is_qualifying": is_qualifying,
                "confidence": confidence,
                "reason_codes": reason_codes,
                "pixel_density": pixel_density,
            },
        )
        set_item_state(device, item_id, updated_state, repo_root)
        
        return {
            "status": "ok",
            "svg_url": svg_url,
            "preview_url": preview_url,
            "state": updated_state,
        }
    
    # Serve UI in production
    if ui_dist_dir.exists():
        app.mount("/", StaticFiles(directory=str(ui_dist_dir), html=True), name="ui")
    else:
        # Dev mode - just return a message
        @app.get("/")
        async def root():
            return {
                "message": "OLED Review Server",
                "device": device,
                "mode": "development",
                "note": "UI not built. Run 'npm run build' in tools/oledvec/ui",
            }
    
    return app


def run_server(
    device: str,
    host: str = "127.0.0.1",
    port: int = 8000,
    repo_root: Optional[Path] = None,
) -> None:
    """Run FastAPI server."""
    import uvicorn
    
    app = create_app(device, repo_root)
    uvicorn.run(app, host=host, port=port)

