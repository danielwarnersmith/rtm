# Test Fixtures

This directory should contain test images for regression testing.

## Required Fixtures

- `test_oled.png`: A test image containing an OLED screenshot with white padding.
  The OLED area should be approximately 2:1 aspect ratio (e.g., 300×150 pixels).
  
  If this file doesn't exist, the test will create a simple synthetic image.
  For better testing, add real OLED screenshots here.

## Adding Fixtures

1. Place test images in this directory
2. Update `test_pipeline.py` to reference new fixtures
3. Ensure fixtures are deterministic (same input = same output)

