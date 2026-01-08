---
name: record-readme-demo-for-cli
description: Create animated SVG demos for CLI tools to embed in README files. Supports two styling approaches - picocolors for lightweight output or @clack/prompts for polished interactive UIs. Use when building CLI demos, recording terminal output for documentation, or adding visual demos to READMEs.
compatibility: Requires Node.js, npm. Uses svg-term-cli for conversion.
metadata:
  author: bytespell
  version: "1.0"
---

# Record README Demo for CLI

Create professional animated terminal demos for your CLI tool's README.

## Overview

This skill helps you:
1. Add a `--demo` flag to your CLI that outputs sample data (no auth/API calls needed)
2. Record the CLI output as an asciinema cast file
3. Convert to animated SVG for embedding in README.md

## Choose Your Style

### Option A: Picocolors Only (Lightweight)

Best for: Small libraries, minimal dependencies, simple colored output.

```bash
npm install picocolors
```

Uses raw ANSI codes via picocolors (~3KB). See [references/pico-style.md](references/pico-style.md).

### Option B: @clack/prompts (Fancy)

Best for: User-facing CLIs, polished interactive experience, spinners and boxes.

```bash
npm install @clack/prompts picocolors
```

Adds ~50KB but gives you spinners, boxes, and structured output. See [references/clack-style.md](references/clack-style.md).

## Step-by-Step Instructions

### 1. Add --demo flag to CLI

Add a flag that returns realistic sample data without requiring authentication:

```typescript
const demoMode = values.demo ?? false;

if (demoMode) {
  // Return hardcoded sample data
  const results = getDemoResults();
  // ... display results
}
```

### 2. Install svg-term-cli

```bash
npm install -g svg-term-cli
```

### 3. Create the cast file

Create `assets/demo.cast` with asciinema v2 format:

```json
{"version": 2, "width": 80, "height": 24, "timestamp": 1704628800, "env": {"SHELL": "/bin/bash", "TERM": "xterm-256color"}}
[0.0, "o", "$ your-command\r\n"]
[0.5, "o", "output line 1\r\n"]
[1.0, "o", "output line 2\r\n"]
```

The format is NDJSON:
- First line: header with version, dimensions, env
- Subsequent lines: `[timestamp, "o", "text"]` where timestamp is seconds from start

**Tip:** Run your CLI with `script` to capture real ANSI codes:
```bash
script -q -c "node dist/cli.js --demo" /tmp/output.txt
```

Then use those escape sequences in your cast file.

### 4. Convert to SVG

```bash
svg-term --in assets/demo.cast --out assets/demo.svg --window --width 80 --height 24 --padding 10
```

Options:
- `--window` adds macOS-style window chrome
- `--width/--height` terminal dimensions
- `--padding` space around content

### 5. Add to README

```markdown
## Demo

![Demo](./assets/demo.svg)
```

### 6. Update .gitignore

```gitignore
# Demo intermediate files
*.cast
```

### 7. Create demo.sh for reproducibility

```bash
#!/bin/bash
# examples/demo.sh - Regenerate demo recording

CLI_PATH="./dist/cli.js"

echo "$ your-cli-command"
sleep 0.5
node "$CLI_PATH" --demo

sleep 5  # Pause for reading

echo ""
echo "$ your-cli-command --some-flag"
sleep 0.5
node "$CLI_PATH" --demo --some-flag

sleep 10  # Final pause before loop
```

## Timing Guidelines

- **Typing speed**: 0.05s per character looks natural
- **After command**: 0.3-0.5s before output appears
- **Between sections**: 3-5s for reading
- **Final pause**: 5-10s before loop restarts

## Color Guidelines

Use semantic colors:
- **Green**: Good values, success, recommended option
- **Yellow**: Warning, medium values (50-80%)
- **Red**: Bad values, errors, high usage (>80%)
- **Cyan**: Provider names, identifiers
- **Dim**: Labels, secondary info

## Checklist

- [ ] CLI has `--demo` flag with sample data
- [ ] `--demo` documented in `--help`
- [ ] Cast file uses real CLI output (not hand-written)
- [ ] SVG file is < 100KB
- [ ] README updated with demo section
- [ ] `.gitignore` excludes `.cast` files
- [ ] `examples/demo.sh` exists for regeneration
