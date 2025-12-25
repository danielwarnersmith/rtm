"""Connected components and shape learning."""

import cv2
import numpy as np
import hashlib
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Set


def extract_connected_components(bitmap: np.ndarray) -> List[Tuple[np.ndarray, Tuple[int, int]]]:
    """
    Extract connected components from bitmap.
    
    Args:
        bitmap: Boolean bitmap (128×64), True = ON pixel
        
    Returns:
        List of (component_bitmap, bbox) tuples where bbox is (x, y, w, h)
    """
    # Convert to uint8 for OpenCV
    binary = (bitmap.astype(np.uint8) * 255)
    
    # Find connected components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        binary, connectivity=8
    )
    
    components = []
    
    for label_id in range(1, num_labels):  # Skip background (label 0)
        # Get bounding box
        x = int(stats[label_id, cv2.CC_STAT_LEFT])
        y = int(stats[label_id, cv2.CC_STAT_TOP])
        w = int(stats[label_id, cv2.CC_STAT_WIDTH])
        h = int(stats[label_id, cv2.CC_STAT_HEIGHT])
        
        # Extract component bitmap from bounding box region
        # Get the labels in the bounding box region
        bbox_labels = labels[y:y+h, x:x+w]
        # Create mask for this component within the bounding box
        component_mask_bbox = (bbox_labels == label_id)
        # Extract the corresponding region from the bitmap
        bbox_bitmap = bitmap[y:y+h, x:x+w]
        # Apply mask to get component bitmap (shape matches bounding box)
        component_bitmap = bbox_bitmap & component_mask_bbox
        
        components.append((component_bitmap, (x, y, w, h)))
    
    return components


def hash_component(component_bitmap: np.ndarray) -> str:
    """
    Hash a component bitmap for identification.
    
    Args:
        component_bitmap: Component bitmap (boolean array)
        
    Returns:
        SHA256 hash as hex string
    """
    # Flatten and convert to bytes
    data = component_bitmap.astype(np.uint8).tobytes()
    return hashlib.sha256(data).hexdigest()


def get_shapes_path(device: str, repo_root: Optional[Path] = None) -> Path:
    """
    Get path to shapes file for device.
    
    Args:
        device: Device identifier
        repo_root: Repository root path
        
    Returns:
        Path to shapes.json file
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
    
    shapes_dir = repo_root / "tools" / "oledvec" / "state" / device
    shapes_dir.mkdir(parents=True, exist_ok=True)
    return shapes_dir / "shapes.json"


def load_shapes(device: str, repo_root: Optional[Path] = None) -> Dict[str, int]:
    """
    Load shapes database for device.
    
    Args:
        device: Device identifier
        repo_root: Repository root path
        
    Returns:
        Dict mapping shape hash to count
    """
    shapes_path = get_shapes_path(device, repo_root)
    
    if not shapes_path.exists():
        return {}
    
    with open(shapes_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_shapes(
    device: str,
    shapes: Dict[str, int],
    repo_root: Optional[Path] = None,
) -> None:
    """
    Save shapes database for device.
    
    Args:
        device: Device identifier
        shapes: Dict mapping shape hash to count
        repo_root: Repository root path
    """
    shapes_path = get_shapes_path(device, repo_root)
    
    with open(shapes_path, "w", encoding="utf-8") as f:
        json.dump(shapes, f, indent=2, ensure_ascii=False)


def update_shapes_from_bitmap(
    device: str,
    bitmap: np.ndarray,
    repo_root: Optional[Path] = None,
) -> Dict[str, int]:
    """
    Extract components from bitmap and update shapes database.
    
    Args:
        device: Device identifier
        bitmap: Boolean bitmap (128×64)
        repo_root: Repository root path
        
    Returns:
        Updated shapes dict
    """
    shapes = load_shapes(device, repo_root)
    components = extract_connected_components(bitmap)
    
    for component_bitmap, _ in components:
        shape_hash = hash_component(component_bitmap)
        shapes[shape_hash] = shapes.get(shape_hash, 0) + 1
    
    save_shapes(device, shapes, repo_root)
    return shapes

