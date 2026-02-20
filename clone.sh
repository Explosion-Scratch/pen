#!/bin/bash

# Configuration
REPO_URL="https://github.com/BloopAI/vibe-kanban.git"
TARGET_DIR="vibe_editor_extraction"
ASSETS_DIR="$TARGET_DIR/logos"
LOGIC_DIR="$TARGET_DIR/logic"

echo "🚀 Starting extraction from $REPO_URL..."

# 1. Clone the repo (shallow clone for speed)
git clone --depth 1 $REPO_URL temp_vibe_repo

# 2. Create target directories
mkdir -p "$ASSETS_DIR"
mkdir -p "$LOGIC_DIR"

# 3. Extract Logos
echo "🖼️  Extracting IDE logos..."
cp temp_vibe_repo/frontend/public/ide/*.svg "$ASSETS_DIR/"

# 4. Extract Registry Logic (Rust & TypeScript)
echo "⚙️  Extracting registry logic..."
# The "Database" of editors (Enum and Mapping)
cp temp_vibe_repo/crates/services/src/services/config/editor/mod.rs "$LOGIC_DIR/editor_registry.rs"
# The Command Builder logic
cp temp_vibe_repo/crates/executors/src/command.rs "$LOGIC_DIR/command_builder.rs"
# The PATH resolution logic
cp temp_vibe_repo/crates/utils/src/shell.rs "$LOGIC_DIR/shell_utils.rs"
# The Frontend Mapping
cp temp_vibe_repo/frontend/src/components/ide/IdeIcon.tsx "$LOGIC_DIR/IdeIcon.tsx"
cp temp_vibe_repo/shared/types.ts "$LOGIC_DIR/shared_types.ts"

# 5. Clean up
rm -rf temp_vibe_repo

echo "✅ Extraction complete! Files are in the '$TARGET_DIR' folder."
ls -R "$TARGET_DIR"