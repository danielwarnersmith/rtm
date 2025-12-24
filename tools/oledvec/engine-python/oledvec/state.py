"""State file management."""

import json
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime


def get_state_path(device: str, repo_root: Optional[Path] = None) -> Path:
    """
    Get path to state file for device.
    
    Args:
        device: Device identifier (e.g., 'analog-rytm-mkii')
        repo_root: Repository root path (defaults to finding tools/oledvec)
        
    Returns:
        Path to state.json file
    """
    if repo_root is None:
        # Find repo root by looking for tools/oledvec
        current = Path(__file__).resolve()
        while current.parent != current:
            if (current / "tools" / "oledvec").exists():
                repo_root = current
                break
            current = current.parent
        
        if repo_root is None:
            # Fallback: assume we're in tools/oledvec/engine-python
            repo_root = Path(__file__).resolve().parent.parent.parent.parent
    
    state_dir = repo_root / "tools" / "oledvec" / "state" / device
    state_dir.mkdir(parents=True, exist_ok=True)
    return state_dir / "state.json"


def load_state(device: str, repo_root: Optional[Path] = None) -> Dict[str, Any]:
    """
    Load state file for device.
    
    Args:
        device: Device identifier
        repo_root: Repository root path
        
    Returns:
        State dict with 'version' and 'items' keys
    """
    state_path = get_state_path(device, repo_root)
    
    if not state_path.exists():
        return {
            "version": "1.0",
            "items": {},
        }
    
    with open(state_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(
    device: str,
    state: Dict[str, Any],
    repo_root: Optional[Path] = None,
) -> None:
    """
    Save state file for device.
    
    Args:
        device: Device identifier
        state: State dict to save
        repo_root: Repository root path
    """
    state_path = get_state_path(device, repo_root)
    
    # Ensure version is set
    if "version" not in state:
        state["version"] = "1.0"
    
    # Ensure items dict exists
    if "items" not in state:
        state["items"] = {}
    
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def get_item_state(
    device: str,
    item_id: str,
    repo_root: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
    """
    Get state for a specific item.
    
    Args:
        device: Device identifier
        item_id: Item identifier (slug)
        repo_root: Repository root path
        
    Returns:
        Item state dict or None if not found
    """
    state = load_state(device, repo_root)
    return state.get("items", {}).get(item_id)


def set_item_state(
    device: str,
    item_id: str,
    item_data: Dict[str, Any],
    repo_root: Optional[Path] = None,
) -> None:
    """
    Set state for a specific item.
    
    Args:
        device: Device identifier
        item_id: Item identifier (slug)
        item_data: Item state dict
        repo_root: Repository root path
    """
    state = load_state(device, repo_root)
    
    # Ensure items dict exists
    if "items" not in state:
        state["items"] = {}
    
    # Update item
    state["items"][item_id] = item_data
    
    save_state(device, state, repo_root)


def create_item_state(
    source_path: str,
    oled_bbox: Optional[tuple],
    confidence: float,
    is_qualifying: bool,
    reason_codes: list,
    otsu_threshold: Optional[float] = None,
    pixel_density: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Create initial item state dict.
    
    Args:
        source_path: Path to source image
        oled_bbox: Detected bbox (x, y, w, h) or None
        confidence: Detection confidence
        is_qualifying: Whether image qualifies as OLED
        reason_codes: List of reason codes if not qualifying
        otsu_threshold: Otsu threshold value
        pixel_density: Pixel density after normalization
        
    Returns:
        Item state dict
    """
    state = {
        "version": "1.0",
        "source_path": source_path,
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "oled_bbox": list(oled_bbox) if oled_bbox else None,
        "normalize_params": {
            "target_size": [128, 64],
        },
        "validation": {
            "is_qualifying": is_qualifying,
            "confidence": confidence,
            "reason_codes": reason_codes,
        },
        "overrides": {
            "force_on": [],
            "force_off": [],
        },
        "flags": {},
        "notes": "",
    }
    
    if otsu_threshold is not None:
        state["normalize_params"]["otsu_threshold"] = otsu_threshold
    
    if pixel_density is not None:
        state["validation"]["pixel_density"] = pixel_density
    
    return state


def update_item_state(
    item_state: Dict[str, Any],
    **updates: Any,
) -> Dict[str, Any]:
    """
    Update item state with new values.
    
    Args:
        item_state: Existing item state dict
        **updates: Key-value pairs to update
        
    Returns:
        Updated item state dict
    """
    updated = item_state.copy()
    
    # Update timestamp
    updated["updated_at"] = datetime.utcnow().isoformat() + "Z"
    
    # Apply updates
    for key, value in updates.items():
        if key == "overrides" and isinstance(value, dict):
            # Merge overrides
            if "overrides" not in updated:
                updated["overrides"] = {}
            updated["overrides"].update(value)
        elif key == "flags" and isinstance(value, dict):
            # Merge flags
            if "flags" not in updated:
                updated["flags"] = {}
            updated["flags"].update(value)
        else:
            updated[key] = value
    
    return updated

