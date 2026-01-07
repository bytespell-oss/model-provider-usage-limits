# Quick Start: Testing the Plugin

## 1. Build and Verify

```bash
cd ~/repos/model-provider-usage-limits
./test-plugin.sh
```

You should see:
```
✅ Build successful
✅ CLI runs
✅ UsageLimitsPlugin exported
✅ event hook registered
✅ config hook registered
```

## 2. Test CLI (Standalone)

```bash
# Show usage for all providers
node packages/opencode-usage-limits-router/dist/cli.js

# Show specific provider
node packages/opencode-usage-limits-router/dist/cli.js --provider anthropic

# JSON output
node packages/opencode-usage-limits-router/dist/cli.js --json
```

Expected output:
```
anthropic:
  5h: 84% remaining (used 16%) [-73%]
    resets at 2026-01-07T06:00:00Z
  7d: 59% remaining (used 41%)

github-copilot:
  monthly: 98% remaining (used 2%) [-87%]
  plan: individual
```

## 3. Test Plugin in OpenCode

### Quick Setup (This Repo)

Add the plugin to this repo:

```bash
cd ~/repos/model-provider-usage-limits

# Create plugin config
mkdir -p .opencode/plugin
cat > .opencode/plugin/usage-limits.ts << 'EOF'
export { UsageLimitsPlugin } from '@bytespell/opencode-usage-limits-router';
EOF

# Create package.json
cat > .opencode/package.json << 'EOF'
{
  "type": "module",
  "dependencies": {
    "@opencode-ai/plugin": "^1.1.4",
    "@bytespell/opencode-usage-limits-router": "file:./packages/opencode-usage-limits-router"
  }
}
EOF

# Install dependencies
cd .opencode
npm install
cd ..
```

### Enable Debug Mode

```bash
export USAGE_LIMITS_DEBUG=1
```

### Start OpenCode

```bash
opencode
```

### Send a Test Message

1. In OpenCode, type: "Hello!"
2. Wait for response to complete
3. Watch for toast notification showing usage info

### Check Debug Log

```bash
tail -f plugin-debug.log
```

You should see:
```
[2026-01-07T...] === session.idle event received for session ses_... ===
[2026-01-07T...] [INFO] Session ses_...: Assistant response completed using anthropic/claude-sonnet-4-5-20250929
[2026-01-07T...] Provider anthropic pace: -73
[2026-01-07T...] On pace (-73%), no action needed
```

## 4. Test Auto-Switching (TEST MODE)

### Enable Test Mode

```bash
export USAGE_LIMITS_DEBUG=1
export USAGE_LIMITS_TEST_MODE=1
export USAGE_LIMITS_TEST_SCENARIO=anthropic_over_pace
```

### Start OpenCode and Test

```bash
opencode
```

1. Make sure you're using `anthropic/claude-sonnet-4-5-20250929`
2. Send a message: "test"
3. Watch for TWO toasts:
   - First: Usage info (debug mode)
   - Second: **"Switched to github-copilot..."** (auto-switch!)

4. Send another message - should use `github-copilot/claude-sonnet-4.5`

### Check Log

```bash
grep "INFO" plugin-debug.log
```

Expected:
```
[INFO] Provider anthropic is over pace: +10% (threshold: +5%)
[INFO] AUTO-SWITCH: anthropic/claude-sonnet-4-5-20250929 -> github-copilot/claude-sonnet-4.5 (pace: 10% -> -20%)
[INFO] Config updated: model set to github-copilot/claude-sonnet-4.5
```

## 5. Normal Usage (No Debug)

### Disable Debug Mode

```bash
unset USAGE_LIMITS_DEBUG
unset USAGE_LIMITS_TEST_MODE
unset USAGE_LIMITS_TEST_SCENARIO
```

### Start OpenCode

```bash
opencode
```

Now the plugin runs silently:
- No debug toasts
- Auto-switches when needed
- Shows notification only when switching providers
- Logs important events to `plugin-debug.log` (INFO level)

## Troubleshooting

### "No tokens available"

```bash
# Authenticate with providers
opencode auth login
```

### Plugin not loading

```bash
# Check package.json syntax
cat .opencode/package.json

# Reinstall dependencies
cd .opencode
rm -rf node_modules package-lock.json
npm install
cd ..
```

### No session.idle events

- Make sure you're in the OpenCode TUI (not CLI)
- Send a message and wait for completion
- Check `plugin-debug.log` exists

### Toast not showing

- Check OpenCode version (need recent version with TUI toast support)
- Verify debug mode is enabled: `echo $USAGE_LIMITS_DEBUG`

## What to Watch For

### ✅ Good Signs

- Toast appears after each response (debug mode)
- Log shows `[INFO]` entries for important events
- Auto-switch happens when over pace
- Config updates successfully

### ❌ Problems

- `ERROR` in logs - check error message
- Toast doesn't appear - check OpenCode version
- No auto-switch - check pace thresholds in logs
- Multiple switches in rapid succession - debounce issue

## Next Steps

See [TESTING.md](./TESTING.md) for comprehensive testing guide.
