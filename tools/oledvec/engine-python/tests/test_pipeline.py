"""Regression tests for OLED processing pipeline."""

import unittest
import hashlib
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import cv2
import numpy as np

from oledvec.detect import detect_oled_bbox, qualify_oled
from oledvec.process import normalize_image, binarize
from oledvec.export_svg import export_svg, bitmap_to_svg_rectangles


def hash_bitmap(bitmap: np.ndarray) -> str:
    """Hash a bitmap for comparison."""
    return hashlib.sha256(bitmap.astype(np.uint8).tobytes()).hexdigest()


def hash_svg(svg: str) -> str:
    """Hash SVG content for comparison."""
    return hashlib.sha256(svg.encode("utf-8")).hexdigest()


class TestPipeline(unittest.TestCase):
    """Test the full processing pipeline."""
    
    @classmethod
    def setUpClass(cls):
        """Set up test fixtures."""
        cls.fixtures_dir = Path(__file__).parent / "fixtures"
        cls.fixtures_dir.mkdir(exist_ok=True)
        
        # Create a simple test fixture if it doesn't exist
        cls.test_image_path = cls.fixtures_dir / "test_oled.png"
        if not cls.test_image_path.exists():
            # Create a simple test image: white rectangle on black background
            # Simulating an OLED screen (128×64 scaled up)
            test_img = np.zeros((200, 400, 3), dtype=np.uint8)
            # Add white padding
            test_img[20:180, 20:380] = 255
            # Add inner "OLED" area (should be ~2:1 aspect ratio)
            # Scale 128×64 by 2.5 = 320×160, centered
            oled_x, oled_y = 50, 30
            oled_w, oled_h = 300, 140
            test_img[oled_y:oled_y+oled_h, oled_x:oled_x+oled_w] = 128  # Gray "OLED" area
            
            # Add some pattern inside (simulating pixels)
            pattern = np.random.randint(0, 255, (oled_h, oled_w), dtype=np.uint8)
            test_img[oled_y:oled_y+oled_h, oled_x:oled_x+oled_w, 0] = pattern
            test_img[oled_y:oled_y+oled_h, oled_x:oled_x+oled_w, 1] = pattern
            test_img[oled_y:oled_y+oled_h, oled_x:oled_x+oled_w, 2] = pattern
            
            cv2.imwrite(str(cls.test_image_path), test_img)
    
    def test_detect_oled_bbox(self):
        """Test OLED bbox detection."""
        image = cv2.imread(str(self.test_image_path))
        self.assertIsNotNone(image, "Test image should exist")
        
        bbox, confidence, metrics = detect_oled_bbox(image)
        
        self.assertIsNotNone(bbox, "Should detect a bbox")
        self.assertGreater(confidence, 0.5, "Should have reasonable confidence")
        self.assertIn("aspect_ratio", metrics)
        
        # Check aspect ratio is close to 2:1
        x, y, w, h = bbox
        aspect = w / h if h > 0 else 0
        self.assertAlmostEqual(aspect, 2.0, delta=0.5, msg="Aspect ratio should be ~2:1")
    
    def test_normalize_image(self):
        """Test image normalization."""
        image = cv2.imread(str(self.test_image_path))
        bbox, _, _ = detect_oled_bbox(image)
        
        self.assertIsNotNone(bbox, "Need bbox for normalization")
        
        normalized = normalize_image(image, bbox)
        
        self.assertEqual(normalized.shape, (64, 128), "Should be 128×64")
        self.assertEqual(normalized.dtype, np.uint8, "Should be uint8")
    
    def test_binarize(self):
        """Test binarization."""
        image = cv2.imread(str(self.test_image_path))
        bbox, _, _ = detect_oled_bbox(image)
        normalized = normalize_image(image, bbox)
        
        bitmap = binarize(normalized)
        
        self.assertEqual(bitmap.shape, (64, 128), "Should be 128×64")
        self.assertEqual(bitmap.dtype, bool, "Should be boolean")
    
    def test_export_svg(self):
        """Test SVG export."""
        image = cv2.imread(str(self.test_image_path))
        bbox, _, _ = detect_oled_bbox(image)
        normalized = normalize_image(image, bbox)
        bitmap = binarize(normalized)
        
        svg = export_svg(bitmap)
        
        self.assertIn("<svg", svg, "Should contain SVG tag")
        self.assertIn('viewBox="0 0 128 64"', svg, "Should have correct viewBox")
        self.assertIn('id="pixels"', svg, "Should have pixels group")
        self.assertIn('fill="var(--foreground)"', svg, "Should use theme variable")
    
    def test_deterministic_output(self):
        """Test that processing produces deterministic outputs."""
        image = cv2.imread(str(self.test_image_path))
        bbox, _, _ = detect_oled_bbox(image)
        normalized = normalize_image(image, bbox)
        bitmap1 = binarize(normalized)
        
        # Process again
        normalized2 = normalize_image(image, bbox)
        bitmap2 = binarize(normalized2)
        
        # Bitmaps should be identical
        self.assertTrue(np.array_equal(bitmap1, bitmap2), "Bitmaps should be identical")
        
        # SVG should be identical
        svg1 = export_svg(bitmap1)
        svg2 = export_svg(bitmap2)
        
        self.assertEqual(hash_svg(svg1), hash_svg(svg2), "SVG should be identical")
    
    def test_svg_rectangles_row_major(self):
        """Test that SVG rectangles are in row-major order."""
        # Create a simple test bitmap
        bitmap = np.zeros((64, 128), dtype=bool)
        bitmap[10, 20:30] = True  # Row 10, columns 20-29
        bitmap[10, 50:55] = True  # Row 10, columns 50-54
        bitmap[20, 10:15] = True  # Row 20, columns 10-14
        
        rectangles = bitmap_to_svg_rectangles(bitmap)
        
        # Check ordering: all row 10 should come before row 20
        row10_rects = [r for r in rectangles if r[1] == 10]
        row20_rects = [r for r in rectangles if r[1] == 20]
        
        self.assertGreater(len(row10_rects), 0, "Should have row 10 rectangles")
        self.assertGreater(len(row20_rects), 0, "Should have row 20 rectangles")
        
        # All row 10 should come before row 20
        if row10_rects and row20_rects:
            max_row10_y = max(r[1] for r in row10_rects)
            min_row20_y = min(r[1] for r in row20_rects)
            self.assertLess(max_row10_y, min_row20_y, "Row 10 should come before row 20")
        
        # Within row 10, rectangles should be left-to-right
        if len(row10_rects) > 1:
            x_coords = [r[0] for r in row10_rects]
            self.assertEqual(x_coords, sorted(x_coords), "Within row, should be left-to-right")


if __name__ == "__main__":
    unittest.main()

