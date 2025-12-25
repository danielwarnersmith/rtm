#!/usr/bin/env python3
"""Analyze patterns in categorized OLED detection data."""

import json
import cv2
import numpy as np
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Any
import statistics

from oledvec.state import load_state, get_state_path
from oledvec.detect import detect_oled_bbox, qualify_oled


def find_repo_root() -> Path:
    """Find repository root."""
    current = Path(__file__).resolve()
    while current.parent != current:
        if (current / "tools" / "oledvec").exists():
            return current
        current = current.parent
    return Path(__file__).resolve().parent.parent.parent.parent


def get_image_path(device: str, source_path: str, repo_root: Path) -> Path:
    """Get full path to image file."""
    # source_path is like "/oled/analog-four-mkii/incoming/_page_1_Picture_12.jpeg"
    # or "/oled/analog-four-mkii/rejected/_page_1_Picture_12.jpeg"
    if source_path.startswith("/oled/"):
        relative_path = source_path[6:]  # Remove "/oled/"
        return repo_root / "public" / "oled" / relative_path
    return repo_root / "public" / source_path.lstrip("/")


def get_item_status(item_state: Dict[str, Any]) -> str:
    """Get item status (ok, needs_review, rejected) from state."""
    flags = item_state.get("flags", {})
    manual_status = flags.get("manual_status")
    if manual_status in ["ok", "needs_review", "rejected"]:
        return manual_status
    
    # Fall back to qualification status
    validation = item_state.get("validation", {})
    is_qualifying = validation.get("is_qualifying", False)
    return "ok" if is_qualifying else "rejected"


def analyze_image_features(image_path: Path) -> Dict[str, float]:
    """Extract features from an image for analysis."""
    if not image_path.exists():
        return {}
    
    img = cv2.imread(str(image_path))
    if img is None:
        return {}
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    h, w = gray.shape
    total_area = h * w
    
    features = {}
    
    # Basic image properties
    features["width"] = w
    features["height"] = h
    features["aspect_ratio"] = w / h if h > 0 else 0
    features["total_area"] = total_area
    
    # Color/contrast features
    features["mean_intensity"] = np.mean(gray)
    features["std_intensity"] = np.std(gray)
    features["contrast"] = features["std_intensity"]
    
    # Edge detection for line/edge patterns
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / total_area
    features["edge_density"] = edge_density
    
    # Horizontal and vertical line detection (diagrams have more structured lines)
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 25))
    horizontal_lines = cv2.morphologyEx(edges, cv2.MORPH_OPEN, horizontal_kernel)
    vertical_lines = cv2.morphologyEx(edges, cv2.MORPH_OPEN, vertical_kernel)
    features["horizontal_line_density"] = np.sum(horizontal_lines > 0) / total_area
    features["vertical_line_density"] = np.sum(vertical_lines > 0) / total_area
    features["structured_line_density"] = (features["horizontal_line_density"] + 
                                           features["vertical_line_density"])
    
    # Text region detection (diagrams have labels)
    # Use simple method: look for small rectangular regions with high contrast
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    text_candidate_area = 0
    for contour in contours:
        x, y, w_rect, h_rect = cv2.boundingRect(contour)
        area = w_rect * h_rect
        # Text regions are typically small and rectangular
        if area < total_area * 0.01 and w_rect > 5 and h_rect > 5:
            aspect = w_rect / h_rect if h_rect > 0 else 0
            if 0.2 < aspect < 5.0:  # Reasonable text aspect ratio
                text_candidate_area += area
    
    features["text_region_density"] = text_candidate_area / total_area
    
    # Color histogram analysis (diagrams may have different color distributions)
    if len(img.shape) == 3:
        hist_b = cv2.calcHist([img], [0], None, [256], [0, 256])
        hist_g = cv2.calcHist([img], [1], None, [256], [0, 256])
        hist_r = cv2.calcHist([img], [2], None, [256], [0, 256])
        # Calculate entropy-like measure (diversity of colors)
        hist_combined = (hist_b + hist_g + hist_r) / 3
        hist_combined = hist_combined / (np.sum(hist_combined) + 1e-10)
        color_entropy = -np.sum(hist_combined * np.log(hist_combined + 1e-10))
        features["color_diversity"] = color_entropy
    else:
        features["color_diversity"] = 0
    
    # Structural complexity: variance in local regions
    # Divide image into grid and measure variance in each cell
    grid_size = 8
    cell_h, cell_w = h // grid_size, w // grid_size
    variances = []
    for i in range(grid_size):
        for j in range(grid_size):
            y_start = i * cell_h
            y_end = min((i + 1) * cell_h, h)
            x_start = j * cell_w
            x_end = min((j + 1) * cell_w, w)
            cell = gray[y_start:y_end, x_start:x_end]
            if cell.size > 0:
                variances.append(np.var(cell))
    
    features["structural_variance"] = np.mean(variances) if variances else 0
    
    return features


def analyze_bbox_features(item_state: Dict[str, Any], image_path: Path) -> Dict[str, float]:
    """Analyze bbox-related features."""
    if not image_path.exists():
        return {}
    
    img = cv2.imread(str(image_path))
    if img is None:
        return {}
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    h, w = gray.shape
    total_area = h * w
    
    features = {}
    
    # Get detected bbox
    oled_bbox = item_state.get("oled_bbox")
    if not oled_bbox or len(oled_bbox) != 4:
        features["has_bbox"] = 0
        return features
    
    features["has_bbox"] = 1
    x, y, w_rect, h_rect = oled_bbox
    bbox_area = w_rect * h_rect
    
    # Bbox metrics
    features["bbox_area_fraction"] = bbox_area / total_area if total_area > 0 else 0
    features["bbox_aspect_ratio"] = w_rect / h_rect if h_rect > 0 else 0
    features["bbox_x"] = x
    features["bbox_y"] = y
    features["bbox_width"] = w_rect
    features["bbox_height"] = h_rect
    
    # Check if bbox is at edges (common for OLED screens)
    features["bbox_at_left_edge"] = 1 if x < 10 else 0
    features["bbox_at_top_edge"] = 1 if y < 10 else 0
    
    # Edge detection at bbox boundaries
    if x >= 0 and y >= 0 and x + w_rect <= w and y + h_rect <= h:
        # Extract ROI
        roi = gray[y:y+h_rect, x:x+w_rect]
        if roi.size > 0:
            # Check contrast at edges
            edge_thickness = 3
            top_edge = roi[:edge_thickness, :]
            bottom_edge = roi[-edge_thickness:, :]
            left_edge = roi[:, :edge_thickness]
            right_edge = roi[:, -edge_thickness:]
            
            edges = [top_edge, bottom_edge, left_edge, right_edge]
            edge_contrasts = [np.std(edge) for edge in edges if edge.size > 0]
            features["bbox_edge_contrast"] = np.mean(edge_contrasts) if edge_contrasts else 0
            
            # Check for sharp transitions (screen borders)
            # Look at gradient magnitude at edges
            sobelx = cv2.Sobel(roi, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(roi, cv2.CV_64F, 0, 1, ksize=3)
            gradient_mag = np.sqrt(sobelx**2 + sobely**2)
            
            # Average gradient at edges
            edge_gradients = []
            if top_edge.size > 0:
                edge_gradients.append(np.mean(gradient_mag[:edge_thickness, :]))
            if bottom_edge.size > 0:
                edge_gradients.append(np.mean(gradient_mag[-edge_thickness:, :]))
            if left_edge.size > 0:
                edge_gradients.append(np.mean(gradient_mag[:, :edge_thickness]))
            if right_edge.size > 0:
                edge_gradients.append(np.mean(gradient_mag[:, -edge_thickness:]))
            
            features["bbox_edge_gradient"] = np.mean(edge_gradients) if edge_gradients else 0
    
    # Validation metrics from state
    validation = item_state.get("validation", {})
    features["detection_confidence"] = validation.get("confidence", 0)
    features["is_qualifying"] = 1 if validation.get("is_qualifying", False) else 0
    
    return features


def analyze_all_items(device: str = "analog-four-mkii") -> Dict[str, Any]:
    """Analyze all items and group by status."""
    repo_root = find_repo_root()
    state = load_state(device, repo_root)
    items = state.get("items", {})
    
    results = {
        "ok": [],
        "needs_review": [],
        "rejected": [],
    }
    
    print(f"Analyzing {len(items)} items for {device}...")
    
    for item_id, item_state in items.items():
        status = get_item_status(item_state)
        source_path = item_state.get("source_path", "")
        
        if not source_path:
            continue
        
        image_path = get_image_path(device, source_path, repo_root)
        
        # Extract features
        image_features = analyze_image_features(image_path)
        bbox_features = analyze_bbox_features(item_state, image_path)
        
        # Combine features
        all_features = {**image_features, **bbox_features}
        all_features["item_id"] = item_id
        all_features["status"] = status
        all_features["source_path"] = source_path
        
        # Add original metrics from detection
        validation = item_state.get("validation", {})
        all_features["original_confidence"] = validation.get("confidence", 0)
        all_features["original_reason_codes"] = validation.get("reason_codes", [])
        
        results[status].append(all_features)
        
        if len(results[status]) % 10 == 0:
            print(f"  Processed {len(results[status])} {status} items...")
    
    print(f"\nSummary:")
    print(f"  OK: {len(results['ok'])}")
    print(f"  Review: {len(results['needs_review'])}")
    print(f"  Rejected: {len(results['rejected'])}")
    
    return results


def compare_features(results: Dict[str, List[Dict[str, Any]]]) -> None:
    """Compare features across categories and print statistics."""
    print("\n" + "="*80)
    print("FEATURE COMPARISON")
    print("="*80)
    
    # Get all feature keys (excluding metadata)
    metadata_keys = {"item_id", "status", "source_path", "original_confidence", "original_reason_codes"}
    all_keys = set()
    for category_items in results.values():
        for item in category_items:
            all_keys.update(k for k in item.keys() if k not in metadata_keys)
    
    # Compare each feature
    for feature_key in sorted(all_keys):
        print(f"\n{feature_key}:")
        
        for status in ["ok", "needs_review", "rejected"]:
            values = [item.get(feature_key) for item in results[status] 
                     if item.get(feature_key) is not None]
            
            if not values:
                print(f"  {status:15s}: No data")
                continue
            
            mean_val = statistics.mean(values)
            median_val = statistics.median(values)
            if len(values) > 1:
                stdev = statistics.stdev(values)
            else:
                stdev = 0
            
            print(f"  {status:15s}: mean={mean_val:8.3f}, median={median_val:8.3f}, "
                  f"stdev={stdev:8.3f}, n={len(values)}")


def main():
    """Main analysis function."""
    device = "analog-four-mkii"
    results = analyze_all_items(device)
    compare_features(results)
    
    # Save results to JSON for further analysis
    output_path = Path(__file__).parent / "analysis_results.json"
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nResults saved to {output_path}")


if __name__ == "__main__":
    main()

