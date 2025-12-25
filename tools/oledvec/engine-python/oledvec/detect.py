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
    
    # Always try to snap bbox to edges for better alignment
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


def snap_to_edges(
    gray: np.ndarray,
    bbox: Tuple[int, int, int, int],
    snap_tolerance: int = 10,
    aggressive: bool = False
) -> Tuple[int, int, int, int]:
    """
    Snap bbox edges to detected screen boundaries using edge detection.
    When aggressive=True, scans inward to find content boundaries and crop whitespace.
    
    Args:
        gray: Grayscale image
        bbox: Current bounding box (x, y, w, h)
        snap_tolerance: Maximum pixels to search for edge (when not aggressive)
        aggressive: If True, scan inward from edges to find content boundaries
        
    Returns:
        Snapped bbox (x, y, w, h)
    """
    h, w = gray.shape
    x, y, w_rect, h_rect = bbox
    
    if aggressive:
        # Aggressive mode: scan inward from each edge to find where content starts
        # Extract the ROI
        x_end = min(x + w_rect, w)
        y_end = min(y + h_rect, h)
        roi = gray[y:y_end, x:x_end]
        
        print(f"[snap_to_edges] aggressive mode, bbox: {bbox}, roi shape: {roi.shape if roi.size > 0 else 'empty'}")
        
        if roi.size == 0 or roi.shape[0] < 10 or roi.shape[1] < 10:
            print(f"[snap_to_edges] ROI too small, returning original bbox")
            return bbox
        
        # Use gradient magnitude to find content boundaries
        # Compute gradients with smaller kernel for finer edge detection
        grad_x = cv2.Sobel(roi, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(roi, cv2.CV_64F, 0, 1, ksize=3)
        grad_mag = np.abs(grad_x) + np.abs(grad_y)
        
        # Use more sensitive Canny edge detection to catch fine lines (half-pixel black lines)
        # Lower thresholds to detect weaker edges
        edges = cv2.Canny(roi, 20, 60)
        
        # Also compute Laplacian for additional edge detection sensitivity
        laplacian = cv2.Laplacian(roi, cv2.CV_64F, ksize=3)
        laplacian_mag = np.abs(laplacian)
        
        # Calculate baseline activity in the center region (where content likely is)
        center_h_start = roi.shape[0] // 4
        center_h_end = 3 * roi.shape[0] // 4
        center_w_start = roi.shape[1] // 4
        center_w_end = 3 * roi.shape[1] // 4
        center_grad = np.mean(grad_mag[center_h_start:center_h_end, center_w_start:center_w_end])
        center_edge_density = np.mean(edges[center_h_start:center_h_end, center_w_start:center_w_end] > 0)
        
        # Calculate overall activity for fallback
        overall_grad = np.mean(grad_mag)
        overall_edge_density = np.mean(edges > 0)
        
        # Use adaptive threshold: prefer center activity, but fall back to overall if center is too low
        # Lower thresholds to detect fine edges (half-pixel black lines)
        grad_threshold = max(center_grad * 0.3, overall_grad * 0.4, 3.0)  # Lower threshold for sensitivity
        edge_threshold = max(center_edge_density * 0.2, overall_edge_density * 0.2, 0.005)  # Lower for fine lines
        laplacian_threshold = np.mean(laplacian_mag[center_h_start:center_h_end, center_w_start:center_w_end]) * 0.3
        
        # Scan inward from each edge to find strongest content boundary
        # Skip the very edges (first/last few pixels) which might be image container edges
        edge_skip = 2  # Skip first 2 pixels from each edge
        scan_margin = min(80, min(w_rect, h_rect) // 4)  # Scan up to 25% inward, max 80px - conservative
        
        # Left edge: scan from left to right, find position with STRONGEST activity
        # Skip the very left edge to avoid image container
        best_left_offset = 0
        best_left_score = 0
        scan_start = max(edge_skip, 0)
        scan_end = min(scan_margin, w_rect - edge_skip)
        for offset in range(scan_start, scan_end):
            col_grad = grad_mag[:, offset]
            col_edges = edges[:, offset]
            col_laplacian = laplacian_mag[:, offset]
            col_intensity = roi[:, offset]
            grad_mean = np.mean(col_grad)
            edge_density = np.mean(col_edges > 0)
            laplacian_mean = np.mean(col_laplacian)
            intensity_std = np.std(col_intensity)
            
            # Check for actual edge line - look for strong edge signal (half-pixel black line)
            # Edge density is most important for detecting fine lines
            has_edge_line = edge_density > edge_threshold
            has_gradient = grad_mean > grad_threshold or laplacian_mean > laplacian_threshold
            
            # Score based on all factors, but heavily weight edge detection for fine lines
            score = grad_mean * 0.2 + edge_density * 200 * 0.5 + laplacian_mean * 0.2 + intensity_std * 0.1
            
            # Require actual edge detection OR strong gradient, but need good score
            if (has_edge_line or has_gradient) and score > best_left_score and score > 5:
                best_left_score = score
                best_left_offset = offset
        if best_left_offset > 0:
            print(f"[snap_to_edges] Found left edge at offset {best_left_offset}, score={best_left_score:.2f}")
        
        # Right edge: scan from right to left, find position with STRONGEST activity
        # Skip the very right edge to avoid image container
        best_right_offset = w_rect
        best_right_score = 0
        scan_start = min(w_rect - 1 - edge_skip, w_rect - 1)
        scan_end = max(w_rect - scan_margin, edge_skip)
        for offset in range(scan_start, scan_end - 1, -1):
            col_grad = grad_mag[:, offset]
            col_edges = edges[:, offset]
            col_laplacian = laplacian_mag[:, offset]
            col_intensity = roi[:, offset]
            grad_mean = np.mean(col_grad)
            edge_density = np.mean(col_edges > 0)
            laplacian_mean = np.mean(col_laplacian)
            intensity_std = np.std(col_intensity)
            
            has_edge_line = edge_density > edge_threshold
            has_gradient = grad_mean > grad_threshold or laplacian_mean > laplacian_threshold
            score = grad_mean * 0.2 + edge_density * 200 * 0.5 + laplacian_mean * 0.2 + intensity_std * 0.1
            
            if (has_edge_line or has_gradient) and score > best_right_score and score > 5:
                best_right_score = score
                best_right_offset = offset + 1  # +1 because offset is inclusive
        if best_right_offset < w_rect:
            print(f"[snap_to_edges] Found right edge at offset {best_right_offset-1}, score={best_right_score:.2f}")
        
        # Top edge: scan from top to bottom, find position with STRONGEST activity
        # Skip the very top edge to avoid image container
        best_top_offset = 0
        best_top_score = 0
        scan_start = max(edge_skip, 0)
        scan_end = min(scan_margin, h_rect - edge_skip)
        for offset in range(scan_start, scan_end):
            row_grad = grad_mag[offset, :]
            row_edges = edges[offset, :]
            row_laplacian = laplacian_mag[offset, :]
            row_intensity = roi[offset, :]
            grad_mean = np.mean(row_grad)
            edge_density = np.mean(row_edges > 0)
            laplacian_mean = np.mean(row_laplacian)
            intensity_std = np.std(row_intensity)
            
            has_edge_line = edge_density > edge_threshold
            has_gradient = grad_mean > grad_threshold or laplacian_mean > laplacian_threshold
            score = grad_mean * 0.2 + edge_density * 200 * 0.5 + laplacian_mean * 0.2 + intensity_std * 0.1
            
            if (has_edge_line or has_gradient) and score > best_top_score and score > 5:
                best_top_score = score
                best_top_offset = offset
        if best_top_offset > 0:
            print(f"[snap_to_edges] Found top edge at offset {best_top_offset}, score={best_top_score:.2f}")
        
        # Bottom edge: scan from bottom to top, find position with STRONGEST activity
        # Skip the very bottom edge to avoid image container
        best_bottom_offset = h_rect
        best_bottom_score = 0
        scan_start = min(h_rect - 1 - edge_skip, h_rect - 1)
        scan_end = max(h_rect - scan_margin, edge_skip)
        for offset in range(scan_start, scan_end - 1, -1):
            row_grad = grad_mag[offset, :]
            row_edges = edges[offset, :]
            row_laplacian = laplacian_mag[offset, :]
            row_intensity = roi[offset, :]
            grad_mean = np.mean(row_grad)
            edge_density = np.mean(row_edges > 0)
            laplacian_mean = np.mean(row_laplacian)
            intensity_std = np.std(row_intensity)
            
            has_edge_line = edge_density > edge_threshold
            has_gradient = grad_mean > grad_threshold or laplacian_mean > laplacian_threshold
            score = grad_mean * 0.2 + edge_density * 200 * 0.5 + laplacian_mean * 0.2 + intensity_std * 0.1
            
            if (has_edge_line or has_gradient) and score > best_bottom_score and score > 5:
                best_bottom_score = score
                best_bottom_offset = offset + 1  # +1 because offset is inclusive
        if best_bottom_offset < h_rect:
            print(f"[snap_to_edges] Found bottom edge at offset {best_bottom_offset-1}, score={best_bottom_score:.2f}")
        
        # Calculate new bbox in image coordinates
        new_x = x + best_left_offset
        new_y = y + best_top_offset
        new_w = best_right_offset - best_left_offset
        new_h = best_bottom_offset - best_top_offset
        
        # Ensure valid bbox (minimum size)
        min_size = 10
        if new_w < min_size:
            new_w = min_size
            if new_x + new_w > w:
                new_x = max(0, w - new_w)
        if new_h < min_size:
            new_h = min_size
            if new_y + new_h > h:
                new_y = max(0, h - new_h)
        
        # Ensure within image bounds
        new_x = max(0, min(new_x, w - 1))
        new_y = max(0, min(new_y, h - 1))
        new_w = max(1, min(new_w, w - new_x))
        new_h = max(1, min(new_h, h - new_y))
        
        print(f"[snap_to_edges] Final snapped bbox: ({new_x}, {new_y}, {new_w}, {new_h}) from original ({x}, {y}, {w_rect}, {h_rect})")
        return (new_x, new_y, new_w, new_h)
    
    else:
        # Original behavior: search within tolerance
        # Use Canny edge detection to find strong edges
        edges = cv2.Canny(gray, 50, 150)
        
        # Look for vertical edges near left and right boundaries
        left_search_start = max(0, x - snap_tolerance)
        left_search_end = min(w, x + snap_tolerance)
        right_search_start = max(0, x + w_rect - snap_tolerance)
        right_search_end = min(w, x + w_rect + snap_tolerance)
        
        top_search_start = max(0, y - snap_tolerance)
        top_search_end = min(h, y + snap_tolerance)
        bottom_search_start = max(0, y + h_rect - snap_tolerance)
        bottom_search_end = min(h, y + h_rect + snap_tolerance)
        
        # Find strongest vertical edges in search regions
        left_region = edges[:, left_search_start:left_search_end] if left_search_end > left_search_start else None
        right_region = edges[:, right_search_start:right_search_end] if right_search_end > right_search_start else None
        
        best_left = x
        best_right = x + w_rect
        if left_region is not None and left_region.size > 0:
            vertical_sums = np.sum(left_region, axis=0)
            if len(vertical_sums) > 0:
                max_idx = np.argmax(vertical_sums)
                if vertical_sums[max_idx] > np.mean(vertical_sums) + np.std(vertical_sums):
                    best_left = left_search_start + max_idx
        
        if right_region is not None and right_region.size > 0:
            vertical_sums = np.sum(right_region, axis=0)
            if len(vertical_sums) > 0:
                max_idx = np.argmax(vertical_sums)
                if vertical_sums[max_idx] > np.mean(vertical_sums) + np.std(vertical_sums):
                    best_right = right_search_start + max_idx
        
        # Find strongest horizontal edges
        top_region = edges[top_search_start:top_search_end, :] if top_search_end > top_search_start else None
        bottom_region = edges[bottom_search_start:bottom_search_end, :] if bottom_search_end > bottom_search_start else None
        
        best_top = y
        best_bottom = y + h_rect
        if top_region is not None and top_region.size > 0:
            horizontal_sums = np.sum(top_region, axis=1)
            if len(horizontal_sums) > 0:
                max_idx = np.argmax(horizontal_sums)
                if horizontal_sums[max_idx] > np.mean(horizontal_sums) + np.std(horizontal_sums):
                    best_top = top_search_start + max_idx
        
        if bottom_region is not None and bottom_region.size > 0:
            horizontal_sums = np.sum(bottom_region, axis=1)
            if len(horizontal_sums) > 0:
                max_idx = np.argmax(horizontal_sums)
                if horizontal_sums[max_idx] > np.mean(horizontal_sums) + np.std(horizontal_sums):
                    best_bottom = bottom_search_start + max_idx
        
        # Ensure valid bbox
        new_w = max(1, best_right - best_left)
        new_h = max(1, best_bottom - best_top)
        
        # Ensure within image bounds
        if best_left < 0:
            best_left = 0
        if best_top < 0:
            best_top = 0
        if best_left + new_w > w:
            new_w = w - best_left
        if best_top + new_h > h:
            new_h = h - best_top
        
        return (best_left, best_top, new_w, new_h)


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
    
    # Always try aggressive snapping to crop whitespace
    # Use aggressive mode to scan inward and find content boundaries
    print(f"[refine_bbox] Starting refinement for bbox: {bbox}, area_fraction: {area_fraction}")
    snapped_bbox = snap_to_edges(gray, bbox, aggressive=True)
    print(f"[refine_bbox] Snapped bbox: {snapped_bbox}")
    
    # Check if snapping made any change
    original_area = w_rect * h_rect
    snapped_area = snapped_bbox[2] * snapped_bbox[3]
    area_reduction = (original_area - snapped_area) / original_area if original_area > 0 else 0
    
    # Check if bbox actually changed (not just same coordinates)
    bbox_changed = (snapped_bbox[0] != x or snapped_bbox[1] != y or 
                    snapped_bbox[2] != w_rect or snapped_bbox[3] != h_rect)
    
    print(f"[refine_bbox] bbox_changed: {bbox_changed}, area_reduction: {area_reduction}")
    
    # Always apply if bbox changed, even slightly (for whitespace cropping)
    if bbox_changed:
        metrics["refined"] = True
        metrics["reason"] = "snapped_to_edges_cropped_whitespace"
        metrics["area_reduction"] = area_reduction
        metrics["original_bbox"] = bbox
        metrics["snapped_bbox"] = snapped_bbox
        print(f"[refine_bbox] Returning refined bbox: {snapped_bbox}")
        return snapped_bbox, metrics
    
    metrics["refined"] = False
    metrics["reason"] = "no_change_detected"
    print(f"[refine_bbox] No change detected, returning original bbox")
    return bbox, metrics
    
    # For oversized bboxes, try to find screen region
    # Extract the region
    x_end = min(x + w_rect, w)
    y_end = min(y + h_rect, h)
    roi = gray[y:y_end, x:x_end]
    
    if roi.size == 0:
        metrics["refined"] = False
        metrics["reason"] = "invalid_roi"
        return bbox, metrics
    
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
    
    # If we found a good candidate, snap it to edges aggressively and use it
    if best_refined_bbox and best_refined_score > 0.6:
        # Snap the found bbox to actual edges (aggressive mode to crop whitespace)
        snapped_bbox = snap_to_edges(gray, best_refined_bbox, aggressive=True)
        metrics["refined"] = True
        metrics["reason"] = "found_and_snapped_screen_region"
        metrics["original_area_fraction"] = area_fraction
        metrics["refined_area_fraction"] = (snapped_bbox[2] * snapped_bbox[3]) / total_area
        metrics["refined_score"] = best_refined_score
        return snapped_bbox, metrics
    
    # If refinement didn't work, try aggressive snapping on original bbox
    snapped_bbox = snap_to_edges(gray, bbox, aggressive=True)
    snapped_area = snapped_bbox[2] * snapped_bbox[3]
    snapped_area_fraction = snapped_area / total_area if total_area > 0 else 0
    
    # If snapped bbox is more reasonable (not full image), use it
    if snapped_area_fraction < 0.95 and snapped_area_fraction > 0.1:
        metrics["refined"] = True
        metrics["reason"] = "snapped_oversized_bbox"
        metrics["original_area_fraction"] = area_fraction
        metrics["refined_area_fraction"] = snapped_area_fraction
        return snapped_bbox, metrics
    
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

