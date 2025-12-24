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
    
    # Find largest rectangular contour
    best_bbox = None
    best_score = 0.0
    best_metrics = {}
    
    for contour in all_contours:
        # Get bounding rectangle
        x, y, w_rect, h_rect = cv2.boundingRect(contour)
        area = w_rect * h_rect
        
        # Filter by minimum area
        if area < total_area * min_area_fraction:
            continue
        
        # Calculate metrics
        aspect_ratio = w_rect / h_rect if h_rect > 0 else 0
        target_aspect = 128 / 64  # 2:1
        aspect_score = 1.0 - min(abs(aspect_ratio - target_aspect) / target_aspect, 1.0)
        
        # Area fraction
        area_fraction = area / total_area
        
        # Rectangularity: how well does bounding rect match contour?
        contour_area = cv2.contourArea(contour)
        rectangularity = contour_area / area if area > 0 else 0
        
        # Check if the region has good contrast (OLED screens should have contrast)
        roi = gray[y:y+h_rect, x:x+w_rect]
        if roi.size > 0:
            std_dev = np.std(roi)
            contrast_score = min(std_dev / 50.0, 1.0)  # Normalize contrast
        else:
            contrast_score = 0.0
        
        # Combined confidence score
        confidence = (
            aspect_score * 0.35 +  # Aspect ratio is important
            min(area_fraction, 0.5) * 2.0 * 0.25 +  # Area fraction (capped at 0.5)
            rectangularity * 0.25 +  # Rectangularity
            contrast_score * 0.15  # Contrast
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
            }
    
    if best_bbox is None:
        return None, 0.0, {"bbox_missing": 1.0}
    
    return best_bbox, best_score, best_metrics


def qualify_oled(
    bbox: Optional[Tuple[int, int, int, int]],
    confidence: float,
    metrics: Dict[str, float],
    threshold: float = 0.85,
) -> Tuple[bool, List[str]]:
    """
    Qualify whether detected bbox is a valid OLED screenshot.
    
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
    
    # Check aspect ratio
    if "aspect_score" in metrics and metrics["aspect_score"] < 0.7:
        reasons.append("aspect_ratio")
    
    # Check area fraction
    if "area_fraction" in metrics:
        if metrics["area_fraction"] < 0.1:
            reasons.append("area_too_small")
        elif metrics["area_fraction"] > 0.9:
            reasons.append("area_too_large")
    
    # Check rectangularity
    if "rectangularity" in metrics and metrics["rectangularity"] < 0.7:
        reasons.append("low_rectangularity")
    
    is_qualifying = confidence >= threshold and len(reasons) == 0
    
    if not is_qualifying and not reasons:
        reasons.append("unknown")
    
    return is_qualifying, reasons

