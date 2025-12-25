"""Image normalization and binarization."""

import cv2
import numpy as np
from typing import Optional, Tuple, List, Dict


def normalize_image(
    image: np.ndarray,
    bbox: Tuple[int, int, int, int],
    target_size: Tuple[int, int] = (128, 64),
) -> np.ndarray:
    """
    Normalize image to target size by cropping to bbox and resizing.
    
    Args:
        image: Input image (BGR or grayscale)
        bbox: Bounding box (x, y, w, h)
        target_size: Target size (width, height)
        
    Returns:
        Normalized grayscale image of target_size
    """
    x, y, w, h = bbox
    
    # Crop to bbox
    if len(image.shape) == 3:
        cropped = image[y : y + h, x : x + w]
        # Convert to grayscale
        cropped = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
    else:
        cropped = image[y : y + h, x : x + w]
    
    # Resize to target size using INTER_AREA (best for downsampling)
    normalized = cv2.resize(cropped, target_size, interpolation=cv2.INTER_AREA)
    
    return normalized


def compute_pixel_density(normalized: np.ndarray) -> float:
    """
    Compute pixel density (fraction of ON pixels) after normalization.
    
    Args:
        normalized: Normalized grayscale image
        
    Returns:
        Pixel density [0, 1]
    """
    # Use a threshold to determine "ON" pixels
    # For OLED, we expect some pixels to be bright
    _, binary = cv2.threshold(normalized, 127, 1, cv2.THRESH_BINARY)
    density = np.mean(binary)
    return float(density)


def binarize(
    image: np.ndarray,
    threshold: Optional[float] = None,
    overrides: Optional[Dict[str, List[Tuple[int, int]]]] = None,
) -> np.ndarray:
    """
    Binarize normalized image to boolean bitmap.
    
    Args:
        image: Normalized grayscale image (128×64)
        threshold: Manual threshold value (0-255), or None for Otsu
        overrides: Dict with 'force_on' and 'force_off' lists of (x, y) coordinates
        
    Returns:
        Boolean bitmap (128×64) where True = ON pixel
    """
    # Apply thresholding
    if threshold is None:
        # Use Otsu's method
        _, binary = cv2.threshold(image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        _, binary = cv2.threshold(image, int(threshold), 255, cv2.THRESH_BINARY)
    
    # Convert to boolean (True = ON pixel)
    bitmap = binary > 127
    
    # Apply overrides
    if overrides:
        force_on = overrides.get("force_on", [])
        force_off = overrides.get("force_off", [])
        
        for x, y in force_on:
            if 0 <= x < 128 and 0 <= y < 64:
                bitmap[y, x] = True
        
        for x, y in force_off:
            if 0 <= x < 128 and 0 <= y < 64:
                bitmap[y, x] = False
    
    return bitmap


def compute_otsu_threshold(image: np.ndarray) -> float:
    """
    Compute Otsu threshold for image.
    
    Args:
        image: Grayscale image
        
    Returns:
        Threshold value (0-255)
    """
    threshold, _ = cv2.threshold(image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return float(threshold)

