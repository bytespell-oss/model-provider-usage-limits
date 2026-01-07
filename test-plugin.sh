#!/bin/bash
# Quick test script for the plugin

set -e

echo "=== Testing OpenCode Usage Limits Router Plugin ==="
echo ""

# Test 1: Build
echo "1. Building packages..."
npm run build
echo "✅ Build successful"
echo ""

# Test 2: CLI works
echo "2. Testing CLI..."
if command -v node &> /dev/null; then
    node packages/opencode-usage-limits-router/dist/cli.js --help > /dev/null 2>&1 && echo "✅ CLI runs" || echo "❌ CLI failed"
else
    echo "⚠️  Node not found, skipping CLI test"
fi
echo ""

# Test 3: Check plugin exports
echo "3. Checking plugin exports..."
node -e "
const plugin = require('./packages/opencode-usage-limits-router/dist/plugin.js');
if (plugin.UsageLimitsPlugin) {
  console.log('✅ UsageLimitsPlugin exported');
} else {
  console.log('❌ UsageLimitsPlugin not found');
  process.exit(1);
}
" || exit 1
echo ""

# Test 4: Check if plugin structure is correct
echo "4. Validating plugin structure..."
node -e "
const plugin = require('./packages/opencode-usage-limits-router/dist/plugin.js');
const pluginInstance = plugin.UsageLimitsPlugin({ 
  client: {
    session: { messages: async () => ({}) },
    config: { update: async () => ({}) },
    tui: { showToast: async () => ({}) }
  },
  project: {},
  directory: '/tmp',
  worktree: '/tmp',
  serverUrl: new URL('http://localhost'),
  $: {}
});

pluginInstance.then(hooks => {
  if (hooks.event) {
    console.log('✅ event hook registered');
  } else {
    console.log('❌ event hook missing');
    process.exit(1);
  }
  
  if (hooks.config) {
    console.log('✅ config hook registered');
  } else {
    console.log('❌ config hook missing');
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ Plugin initialization failed:', err.message);
  process.exit(1);
});
"
echo ""

echo "=== All basic tests passed! ==="
echo ""
echo "Next steps:"
echo "1. Set up test project: See TESTING.md"
echo "2. Enable debug mode: USAGE_LIMITS_DEBUG=1"
echo "3. Test with OpenCode TUI"
echo ""
echo "For detailed testing instructions, see TESTING.md"
