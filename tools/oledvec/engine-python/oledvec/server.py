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
    @app.get("/api/items")
    async def list_items():
        """List all items from state."""
        state = load_state(device, repo_root)
        items = []
        
        for item_id, item_state in state.get("items", {}).items():
            validation = item_state.get("validation", {})
            is_qualifying = validation.get("is_qualifying", False)
            
            source_path = item_state.get("source_path", "")
            source_url = f"/api/public{source_path}" if source_path else None
            
            preview_url = None
            svg_url = None
            
            if is_qualifying:
                screens_dir = public_oled_dir / "screens"
                preview_path = screens_dir / f"{item_id}_preview_128x64.png"
                svg_path = screens_dir / f"{item_id}.svg"
                
                if preview_path.exists():
                    preview_url = f"/api/public/screens/{item_id}_preview_128x64.png"
                if svg_path.exists():
                    svg_url = f"/api/public/screens/{item_id}.svg"
            
            items.append({
                "id": item_id,
                "status": "ok" if is_qualifying else "rejected",
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
        
        if is_qualifying:
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
        
        if update.threshold is not None:
            if "normalize_params" not in item_state:
                item_state["normalize_params"] = {}
            item_state["normalize_params"]["otsu_threshold"] = update.threshold
            updates["normalize_params"] = item_state["normalize_params"]
        
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
        
        if update.flags is not None:
            updates["flags"] = update.flags
        
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
        if bbox_list:
            bbox = tuple(bbox_list)
        else:
            bbox, confidence, metrics = detect_oled_bbox(image)
            if bbox is None:
                raise HTTPException(status_code=400, detail="Could not detect OLED bbox")
        
        # Normalize
        normalized = normalize_image(image, bbox)
        
        # Get threshold and overrides
        threshold = item_state.get("normalize_params", {}).get("otsu_threshold")
        if threshold is None:
            threshold = compute_otsu_threshold(normalized)
        
        overrides = item_state.get("overrides", {})
        
        # Binarize
        bitmap = binarize(normalized, threshold=threshold, overrides=overrides)
        
        # Update pixel density
        pixel_density = compute_pixel_density(normalized)
        
        # Export SVG
        svg_content = export_svg(bitmap)
        screens_dir = public_oled_dir / "screens"
        screens_dir.mkdir(parents=True, exist_ok=True)
        svg_path = screens_dir / f"{item_id}.svg"
        svg_path.write_text(svg_content, encoding="utf-8")
        
        # Export preview PNG
        preview_path = screens_dir / f"{item_id}_preview_128x64.png"
        preview_image = (bitmap.astype(np.uint8) * 255)
        cv2.imwrite(str(preview_path), preview_image)
        
        # Update shapes
        update_shapes_from_bitmap(device, bitmap, repo_root)
        
        # Update state
        updated_state = update_item_state(
            item_state,
            validation={
                **item_state.get("validation", {}),
                "pixel_density": pixel_density,
            },
        )
        set_item_state(device, item_id, updated_state, repo_root)
        
        return {
            "status": "ok",
            "svg_url": f"/api/public/screens/{item_id}.svg",
            "preview_url": f"/api/public/screens/{item_id}_preview_128x64.png",
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

