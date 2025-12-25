"""OLED bbox detection and qualification."""

import cv2
import numpy as np
from typing import Tuple, Optional, Dict, List
from pathlib import Path


def detect_diagram_features(image: np.ndarray) -> Dict[str, float]:
    """
    Detect features that indicate an image is a diagram (not an OLED screenshot).
    
    Diagrams (signal paths, device layouts) typically have:
    - Lower aspect ratio (more square or portrait)
    - Lower edge/line density
    - Lower structural variance
    - Lower color diversity
    - Lower overall contrast
    
    Args:
        image: Input image (BGR or grayscale)
        
    Returns:
        Dict with diagram confidence score and feature metrics
    """
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    h, w = gray.shape
    total_area = h * w
    aspect_ratio = w / h if h > 0 else 0
    
    features = {}
    
    # Aspect ratio check: diagrams often have different aspect ratios
    # Screenshots are typically ~1.95:1, diagrams vary more
    if aspect_ratio < 0.7 or aspect_ratio > 2.5:
        features["aspect_ratio_score"] = 0.3  # Penalty for unusual aspect ratio
    else:
        # Prefer aspect ratios around 1.9-2.0
        target_aspect = 1.95
        aspect_diff = abs(aspect_ratio - target_aspect)
        features["aspect_ratio_score"] = max(0.0, 1.0 - (aspect_diff / 0.5))
    
    # Edge density: diagrams may have fewer edges (less structured)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / total_area
    # Screenshots typically have edge_density around 0.07
    if edge_density < 0.05:
        features["edge_density_score"] = 0.3  # Low edge density suggests diagram
    else:
        features["edge_density_score"] = min(1.0, edge_density / 0.07)
    
    # Structured line density: diagrams have connecting lines, but screenshots have more
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 25))
    horizontal_lines = cv2.morphologyEx(edges, cv2.MORPH_OPEN, horizontal_kernel)
    vertical_lines = cv2.morphologyEx(edges, cv2.MORPH_OPEN, vertical_kernel)
    structured_line_density = (np.sum(horizontal_lines > 0) + np.sum(vertical_lines > 0)) / total_area
    # Screenshots typically have structured_line_density around 0.025
    if structured_line_density < 0.015:
        features["structured_line_score"] = 0.3
    else:
        features["structured_line_score"] = min(1.0, structured_line_density / 0.025)
    
    # Structural variance: diagrams may have less variance (more uniform regions)
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
    
    structural_variance = np.mean(variances) if variances else 0
    # Screenshots typically have structural_variance around 6500
    if structural_variance < 4000:
        features["structural_variance_score"] = 0.3
    else:
        features["structural_variance_score"] = min(1.0, structural_variance / 6500.0)
    
    # Color diversity: diagrams may have different color distributions
    if len(image.shape) == 3:
        hist_b = cv2.calcHist([image], [0], None, [256], [0, 256])
        hist_g = cv2.calcHist([image], [1], None, [256], [0, 256])
        hist_r = cv2.calcHist([image], [2], None, [256], [0, 256])
        hist_combined = (hist_b + hist_g + hist_r) / 3
        hist_combined = hist_combined / (np.sum(hist_combined) + 1e-10)
        color_entropy = -np.sum(hist_combined * np.log(hist_combined + 1e-10))
        # Screenshots typically have color_entropy around 2.7
        if color_entropy < 2.0:
            features["color_diversity_score"] = 0.3
        else:
            features["color_diversity_score"] = min(1.0, color_entropy / 2.7)
    else:
        features["color_diversity_score"] = 1.0
    
    # Contrast: diagrams may have lower contrast
    contrast = np.std(gray)
    # Screenshots typically have contrast around 103
    if contrast < 80:
        features["contrast_score"] = 0.3
    else:
        features["contrast_score"] = min(1.0, contrast / 103.0)
    
    # Combined diagram confidence (lower = more likely to be diagram)
    diagram_confidence = (
        features["aspect_ratio_score"] * 0.20 +
        features["edge_density_score"] * 0.20 +
        features["structured_line_score"] * 0.15 +
        features["structural_variance_score"] * 0.15 +
        features["color_diversity_score"] * 0.15 +
        features["contrast_score"] * 0.15
    )
    
    features["diagram_confidence"] = 1.0 - diagram_confidence  # Invert: higher = more diagram-like
    
    return features


def detect_oled_bbox(
    image: np.ndarray, min_area_fraction: float = 0.1
) -> Tuple[Optional[Tuple[int, int, int, int]], float, Dict[str, float]]:
    """
    Detect OLED bounding box in image.
    
    Based on analysis of manually adjusted bboxes from analog-four-mkii:
    - 83% of bboxes start at X=0 or Y=0 (top-left corner preference)
    - Aspect ratios range from 0.71 to 4.22, with median ~1.91
    - Common sizes: 500x250, 100x100, 540x280, 550x280, 530x280
    
    Args:
        image: Input image (BGR or grayscale)
        min_area_fraction: Minimum fraction of image area for bbox
        
    Returns:
        Tuple of (bbox, confidence, metrics) where:
        - bbox: (x, y, w, h) or None if not found
        - confidence: [0, 1] confidence score
        - metrics: Dict with detailed scores
    """
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    h, w = gray.shape
    total_area = h * w
    
    # Threshold to find bright regions (OLED screens are typically bright)
    # Use adaptive threshold to handle varying lighting
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Invert if needed (OLED might be dark on light background)
    # Check which has more white pixels
    white_pixels = np.sum(binary > 127)
    if white_pixels < total_area * 0.3:
        binary = 255 - binary
    
    # Apply morphological operations to close gaps and connect regions
    # This helps when borders don't have black pixels
    kernel = np.ones((3, 3), np.uint8)
    binary_closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    
    # Also try edge detection as a fallback
    edges = cv2.Canny(gray, 50, 150)
    edges_dilated = cv2.dilate(edges, kernel, iterations=2)
    
    # Find contours from both methods
    contours_closed, _ = cv2.findContours(binary_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours_edges, _ = cv2.findContours(edges_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Combine contours from both methods
    all_contours = list(contours_closed) + list(contours_edges)
    
    if not all_contours:
        return None, 0.0, {"bbox_missing": 1.0}
    
    # Find best rectangular contour
    best_bbox = None
    best_score = 0.0
    best_metrics = {}
    
    # Common OLED sizes observed in manual adjustments (width, height)
    common_sizes = [
        (500, 250),  # 2:1 aspect ratio
        (100, 100),  # 1:1 aspect ratio (square)
        (540, 280),  # ~1.93:1
        (550, 280),  # ~1.96:1
        (530, 280),  # ~1.89:1
        (497, 250),  # ~1.99:1
    ]
    
    for contour in all_contours:
        # Get bounding rectangle
        x, y, w_rect, h_rect = cv2.boundingRect(contour)
        area = w_rect * h_rect
        
        # Filter by minimum area
        if area < total_area * min_area_fraction:
            continue
        
        # Calculate metrics
        aspect_ratio = w_rect / h_rect if h_rect > 0 else 0
        
        # Improved aspect ratio scoring: accept wider range (0.7-4.0)
        # Based on manual adjustments: median ~1.91, range 0.71-4.22
        if aspect_ratio < 0.7 or aspect_ratio > 4.0:
            aspect_score = 0.0
        else:
            # Prefer aspect ratios around 1.9-2.0, but accept wider range
            target_aspect = 1.95  # Slightly below 2.0 based on median
            # Use a softer penalty for aspect ratio differences
            aspect_diff = abs(aspect_ratio - target_aspect)
            aspect_score = max(0.0, 1.0 - (aspect_diff / 1.5))  # More forgiving
        
        # Area fraction
        area_fraction = area / total_area
        
        # Rectangularity: how well does bounding rect match contour?
        contour_area = cv2.contourArea(contour)
        rectangularity = contour_area / area if area > 0 else 0
        
        # Position score: prefer top-left corner (83% of manual bboxes are at X=0 or Y=0)
        # Give bonus for being close to top-left
        edge_distance = min(x, y)  # Distance to nearest edge
        position_score = max(0.0, 1.0 - (edge_distance / 30.0))  # Full score within 30px
        
        # Size preference: bonus for common sizes
        size_score = 0.0
        for common_w, common_h in common_sizes:
            # Check if size is close to common size (within 10% tolerance)
            w_match = abs(w_rect - common_w) / max(common_w, 1) < 0.1
            h_match = abs(h_rect - common_h) / max(common_h, 1) < 0.1
            if w_match and h_match:
                size_score = 0.15  # Bonus for matching common size
                break
        
        # Check if the region has good contrast (OLED screens should have contrast)
        roi = gray[y:y+h_rect, x:x+w_rect]
        if roi.size > 0:
            std_dev = np.std(roi)
            contrast_score = min(std_dev / 50.0, 1.0)  # Normalize contrast
        else:
            contrast_score = 0.0
        
        # Penalize oversized bboxes in scoring
        # If area_fraction is very high (>0.9), reduce confidence significantly
        area_penalty = 1.0
        if area_fraction > 0.90:
            area_penalty = 0.4  # Strong penalty for full-image detection
        elif area_fraction > 0.85:
            area_penalty = 0.7  # Moderate penalty for near-full-image
        
        # Combined confidence score with improved weights
        confidence = (
            aspect_score * 0.30 +  # Aspect ratio (slightly reduced weight)
            min(area_fraction, 0.5) * 2.0 * 0.20 * area_penalty +  # Area fraction (capped at 0.5, with penalty)
            rectangularity * 0.20 +  # Rectangularity
            contrast_score * 0.15 +  # Contrast
            position_score * 0.15 +  # Position preference (NEW)
            size_score  # Size preference bonus (NEW)
        ) * area_penalty  # Apply penalty to overall confidence
        
        if confidence > best_score:
            best_score = confidence
            best_bbox = (x, y, w_rect, h_rect)
            best_metrics = {
                "aspect_ratio": aspect_ratio,
                "aspect_score": aspect_score,
                "area_fraction": area_fraction,
                "rectangularity": rectangularity,
                "contrast_score": contrast_score,
                "position_score": position_score,
                "size_score": size_score,
            }
    
    if best_bbox is None:
        return None, 0.0, {"bbox_missing": 1.0}
    
    # Refine bbox if it appears to be oversized (full-image detection)
    x, y, w_rect, h_rect = best_bbox
    area_fraction = (w_rect * h_rect) / total_area
    if area_fraction > 0.90:  # Likely oversized, try to refine
        # Pass original image (not gray) for refinement
        original_image = image if len(image.shape) == 3 else cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        refined_bbox, refinement_metrics = refine_bbox(original_image, best_bbox, min_area_fraction)
        if refinement_metrics.get("refined", False):
            best_bbox = refined_bbox
            best_metrics["refined"] = True
            best_metrics.update(refinement_metrics)
            # Recalculate metrics for refined bbox
            x, y, w_rect, h_rect = best_bbox
            area_fraction = (w_rect * h_rect) / total_area
            best_metrics["area_fraction"] = area_fraction
            aspect_ratio = w_rect / h_rect if h_rect > 0 else 0
            best_metrics["aspect_ratio"] = aspect_ratio
    
    return best_bbox, best_score, best_metrics


def refine_bbox(
    image: np.ndarray,
    bbox: Tuple[int, int, int, int],
    min_area_fraction: float = 0.1
) -> Tuple[Tuple[int, int, int, int], Dict[str, float]]:
    """
    Refine bbox to better fit screen boundaries, especially for oversized bboxes.
    
    For Review items, bboxes are often full-image (area_fraction = 1.0).
    This function attempts to shrink them by detecting actual screen edges.
    
    Args:
        image: Input image (BGR or grayscale)
        bbox: Initial bounding box (x, y, w, h)
        min_area_fraction: Minimum area fraction to consider
        
    Returns:
        Tuple of (refined_bbox, refinement_metrics)
    """
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    h, w = gray.shape
    total_area = h * w
    x, y, w_rect, h_rect = bbox
    area_fraction = (w_rect * h_rect) / total_area if total_area > 0 else 0
    
    metrics = {}
    
    # If bbox is already reasonable size (not full image), return as-is
    if area_fraction < 0.95:
        metrics["refined"] = False
        metrics["reason"] = "bbox_already_reasonable"
        return bbox, metrics
    
    # Extract the region
    x_end = min(x + w_rect, w)
    y_end = min(y + h_rect, h)
    roi = gray[y:y_end, x:x_end]
    
    if roi.size == 0:
        metrics["refined"] = False
        metrics["reason"] = "invalid_roi"
        return bbox, metrics
    
    # Look for screen boundaries within the ROI
    # Use edge detection to find strong vertical and horizontal edges
    edges = cv2.Canny(roi, 50, 150)
    
    # Look for vertical edges (left and right screen boundaries)
    # Sum edges vertically to find strong vertical lines
    vertical_edges = np.sum(edges, axis=0)
    horizontal_edges = np.sum(edges, axis=1)
    
    # Find peaks in edge sums (indicating screen boundaries)
    # Use a threshold based on mean + std
    v_threshold = np.mean(vertical_edges) + 2 * np.std(vertical_edges)
    h_threshold = np.mean(horizontal_edges) + 2 * np.std(horizontal_edges)
    
    # Find left and right boundaries
    left_candidates = np.where(vertical_edges > v_threshold)[0]
    right_candidates = np.where(vertical_edges > v_threshold)[0]
    
    # Find top and bottom boundaries
    top_candidates = np.where(horizontal_edges > h_threshold)[0]
    bottom_candidates = np.where(horizontal_edges > h_threshold)[0]
    
    # Try to find a tighter bbox
    # Look for a region with high contrast (screen content) surrounded by lower contrast (background)
    # Divide ROI into grid and find region with highest contrast
    grid_size = 10
    cell_h, cell_w = roi.shape[0] // grid_size, roi.shape[1] // grid_size
    
    best_region = None
    best_contrast = 0
    
    for i in range(grid_size - 2):  # Leave margin
        for j in range(grid_size - 2):
            y_start = i * cell_h
            y_end = min((i + 3) * cell_h, roi.shape[0])  # 3x3 region
            x_start = j * cell_w
            x_end = min((j + 3) * cell_w, roi.shape[1])
            
            cell = roi[y_start:y_end, x_start:x_end]
            if cell.size > 0:
                cell_contrast = np.std(cell)
                if cell_contrast > best_contrast:
                    best_contrast = cell_contrast
                    best_region = (x_start, y_start, x_end - x_start, y_end - y_start)
    
    # Try multiple strategies to find screen boundaries
    
    # Strategy 1: Look for high-contrast rectangular region
    # Based on OK items: mean width=496, height=249, positioned at x~25, y~18
    # Try common screen sizes at different positions
    common_screen_sizes = [
        (496, 249),  # Most common from OK items
        (500, 250),  # Alternative
        (540, 280),  # Slightly larger
    ]
    
    best_refined_bbox = None
    best_refined_score = 0
    
    for screen_w, screen_h in common_screen_sizes:
        # Try different starting positions
        for start_x in range(0, min(50, w - screen_w), 5):
            for start_y in range(0, min(50, h - screen_h), 5):
                if start_x + screen_w > w or start_y + screen_h > h:
                    continue
                
                test_roi = gray[start_y:start_y+screen_h, start_x:start_x+screen_w]
                if test_roi.size == 0:
                    continue
                
                # Check contrast (screen should have good contrast)
                test_contrast = np.std(test_roi)
                if test_contrast < 50:
                    continue
                
                # Check edge strength at boundaries (screen should have clear edges)
                edge_thickness = 3
                top_edge = test_roi[:edge_thickness, :]
                bottom_edge = test_roi[-edge_thickness:, :]
                left_edge = test_roi[:, :edge_thickness]
                right_edge = test_roi[:, -edge_thickness:]
                
                edges = [top_edge, bottom_edge, left_edge, right_edge]
                edge_contrasts = [np.std(edge) for edge in edges if edge.size > 0]
                avg_edge_contrast = np.mean(edge_contrasts) if edge_contrasts else 0
                
                # Score based on contrast and edge strength
                # OK items have edge_contrast around 48, gradient around 61
                score = (test_contrast / 100.0) * 0.5 + (avg_edge_contrast / 50.0) * 0.5
                
                if score > best_refined_score:
                    best_refined_score = score
                    best_refined_bbox = (start_x, start_y, screen_w, screen_h)
    
    # If we found a good candidate, use it
    if best_refined_bbox and best_refined_score > 0.6:
        metrics["refined"] = True
        metrics["reason"] = "found_screen_region"
        metrics["original_area_fraction"] = area_fraction
        metrics["refined_area_fraction"] = (best_refined_bbox[2] * best_refined_bbox[3]) / total_area
        metrics["refined_score"] = best_refined_score
        return best_refined_bbox, metrics
    
    # If refinement didn't work, return original
    metrics["refined"] = False
    metrics["reason"] = "refinement_failed"
    return bbox, metrics


def qualify_oled(
    bbox: Optional[Tuple[int, int, int, int]],
    confidence: float,
    metrics: Dict[str, float],
    image: Optional[np.ndarray] = None,
    threshold: float = 0.75,  # Lowered from 0.85 based on manual adjustment patterns
    diagram_threshold: float = 0.4,  # Threshold for diagram detection
) -> Tuple[bool, List[str]]:
    """
    Qualify whether detected bbox is a valid OLED screenshot.
    
    Updated thresholds based on analysis of manually adjusted bboxes:
    - Aspect ratios range from 0.71 to 4.22, so we're more lenient
    - Lower confidence threshold to account for valid variations
    - Added diagram detection to reject non-screenshot images
    - Added bbox size validation to catch oversized bboxes
    
    Args:
        bbox: Detected bounding box or None
        confidence: Confidence score from detection
        metrics: Detailed metrics dict
        image: Original image (optional, for diagram detection)
        threshold: Minimum confidence threshold
        diagram_threshold: Maximum diagram confidence to accept (higher = more diagram-like)
        
    Returns:
        Tuple of (is_qualifying, reason_codes)
    """
    if bbox is None:
        return False, ["bbox_missing"]
    
    reasons = []
    
    # Check for diagram features if image is provided
    if image is not None:
        diagram_features = detect_diagram_features(image)
        diagram_confidence = diagram_features.get("diagram_confidence", 0)
        if diagram_confidence > diagram_threshold:
            reasons.append("diagram_detected")
    
    if confidence < threshold:
        reasons.append("low_confidence")
    
    # Check aspect ratio - more lenient based on observed range (0.71-4.22)
    if "aspect_ratio" in metrics:
        aspect_ratio = metrics["aspect_ratio"]
        if aspect_ratio < 0.5 or aspect_ratio > 5.0:
            reasons.append("aspect_ratio")
        elif "aspect_score" in metrics and metrics["aspect_score"] < 0.3:
            # Very low aspect score even within acceptable range
            reasons.append("aspect_ratio")
    elif "aspect_score" in metrics and metrics["aspect_score"] < 0.3:
        reasons.append("aspect_ratio")
    
    # Check area fraction - be stricter about oversized bboxes
    if "area_fraction" in metrics:
        if metrics["area_fraction"] < 0.05:  # More lenient minimum
            reasons.append("area_too_small")
        elif metrics["area_fraction"] > 0.90:  # Stricter maximum - reject full-image bboxes
            reasons.append("bbox_too_large")
    
    # Check rectangularity - slightly more lenient
    if "rectangularity" in metrics and metrics["rectangularity"] < 0.6:
        reasons.append("low_rectangularity")
    
    # Check if bbox is at edges with very low edge contrast (indicates full-image detection)
    # Calculate edge position from bbox
    x, y, w_rect, h_rect = bbox
    bbox_at_left_edge = 1 if x < 10 else 0
    bbox_at_top_edge = 1 if y < 10 else 0
    
    # If bbox is at edges and covers most of image, likely full-image detection
    if (bbox_at_left_edge and bbox_at_top_edge and 
        metrics.get("area_fraction", 0) > 0.95):
        # Check edge contrast if available, otherwise assume low contrast for full-image
        if metrics.get("bbox_edge_contrast", 100) < 5:
            reasons.append("bbox_too_large")
        elif not metrics.get("bbox_edge_contrast"):  # Not calculated, but at edges + full image = likely wrong
            reasons.append("bbox_too_large")
    
    is_qualifying = confidence >= threshold and len(reasons) == 0
    
    if not is_qualifying and not reasons:
        reasons.append("unknown")
    
    return is_qualifying, reasons

