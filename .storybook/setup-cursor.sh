#!/bin/bash
# Setup script to add Cursor CLI to PATH for Storybook editor integration
# Run this once: source .storybook/setup-cursor.sh

CURSOR_BIN="/Applications/Cursor.app/Contents/Resources/app/bin"
LOCAL_BIN="$HOME/.local/bin"

# Create ~/.local/bin if it doesn't exist
mkdir -p "$LOCAL_BIN"

# Create symlink if it doesn't exist
if [ ! -f "$LOCAL_BIN/cursor" ]; then
  ln -s "$CURSOR_BIN/cursor" "$LOCAL_BIN/cursor"
  echo "✓ Created symlink: $LOCAL_BIN/cursor -> $CURSOR_BIN/cursor"
else
  echo "✓ Symlink already exists: $LOCAL_BIN/cursor"
fi

# Add to PATH if not already there
if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
  echo ""
  echo "Add this to your ~/.zshrc (or ~/.bash_profile):"
  echo "export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
  echo "Then run: source ~/.zshrc"
else
  echo "✓ $LOCAL_BIN is already in PATH"
fi

