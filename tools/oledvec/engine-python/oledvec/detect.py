"""OLED bbox detection and qualification."""

import cv2
import numpy as np
from typing import Tuple, Optional, Dict, List
from pathlib import Path


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
        
        # Combined confidence score with improved weights
        confidence = (
            aspect_score * 0.30 +  # Aspect ratio (slightly reduced weight)
            min(area_fraction, 0.5) * 2.0 * 0.20 +  # Area fraction (capped at 0.5)
            rectangularity * 0.20 +  # Rectangularity
            contrast_score * 0.15 +  # Contrast
            position_score * 0.15 +  # Position preference (NEW)
            size_score  # Size preference bonus (NEW)
        )
        
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
    
    return best_bbox, best_score, best_metrics


def qualify_oled(
    bbox: Optional[Tuple[int, int, int, int]],
    confidence: float,
    metrics: Dict[str, float],
    threshold: float = 0.75,  # Lowered from 0.85 based on manual adjustment patterns
) -> Tuple[bool, List[str]]:
    """
    Qualify whether detected bbox is a valid OLED screenshot.
    
    Updated thresholds based on analysis of manually adjusted bboxes:
    - Aspect ratios range from 0.71 to 4.22, so we're more lenient
    - Lower confidence threshold to account for valid variations
    
    Args:
        bbox: Detected bounding box or None
        confidence: Confidence score from detection
        metrics: Detailed metrics dict
        threshold: Minimum confidence threshold
        
    Returns:
        Tuple of (is_qualifying, reason_codes)
    """
    if bbox is None:
        return False, ["bbox_missing"]
    
    reasons = []
    
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
    
    # Check area fraction
    if "area_fraction" in metrics:
        if metrics["area_fraction"] < 0.05:  # More lenient minimum
            reasons.append("area_too_small")
        elif metrics["area_fraction"] > 0.95:  # More lenient maximum
            reasons.append("area_too_large")
    
    # Check rectangularity - slightly more lenient
    if "rectangularity" in metrics and metrics["rectangularity"] < 0.6:
        reasons.append("low_rectangularity")
    
    is_qualifying = confidence >= threshold and len(reasons) == 0
    
    if not is_qualifying and not reasons:
        reasons.append("unknown")
    
    return is_qualifying, reasons

