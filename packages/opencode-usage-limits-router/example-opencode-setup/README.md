# Example OpenCode Setup

This folder contains an example `.opencode/` configuration for testing the plugin during development.

## Usage

To test the plugin locally:

```bash
# From the repo root
cp -r packages/opencode-usage-limits-router/example-opencode-setup .opencode

# Install dependencies
cd .opencode && npm install && cd ..

# Run OpenCode
opencode
```

## Structure

```
.opencode/
├── package.json          # Plugin dependency
├── plugin/
│   └── usage-limits.ts   # Plugin export
└── command/
    ├── usage.md          # /usage command
    └── route.md          # /route command
```

See [TESTING.md](../TESTING.md) for detailed testing instructions.
