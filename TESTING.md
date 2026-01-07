# Testing Guide for OpenCode Usage Limits Router Plugin

## Prerequisites

1. **Install the plugin locally**:
   ```bash
   cd ~/repos/model-provider-usage-limits
   npm run build
   npm link --workspace=packages/core
   npm link --workspace=packages/opencode-usage-limits-router
   ```

2. **Authenticate with providers**:
   ```bash
   opencode auth login
   ```
   - Login to Anthropic
   - Login to GitHub Copilot

## Test Setup

### Option 1: Local Plugin Development (Recommended)

Create a test project:

```bash
mkdir -p ~/test-usage-limits-plugin/.opencode/plugin
cd ~/test-usage-limits-plugin
```

Create `.opencode/package.json`:
```json
{
  "type": "module",
  "dependencies": {
    "@opencode-ai/plugin": "^1.1.4",
    "@bytespell/opencode-usage-limits-router": "file:../../../model-provider-usage-limits/packages/opencode-usage-limits-router"
  }
}
```

Create `.opencode/plugin/usage-limits.ts`:
```typescript
export { UsageLimitsPlugin } from '@bytespell/opencode-usage-limits-router';
```

Install dependencies:
```bash
cd .opencode
npm install
cd ..
```

### Option 2: Global config.json

Add to `~/.config/opencode/opencode.json` (Linux) or equivalent:
```json
{
  "plugin": ["@bytespell/opencode-usage-limits-router"]
}
```

## Running Tests

### 1. Test Plugin Loads

Start OpenCode in your test project:
```bash
cd ~/test-usage-limits-plugin
opencode
```

Check the logs to verify plugin loaded:
- Look for any plugin initialization errors
- The plugin should load silently (no output is good)

### 2. Test CLI Works

Test the CLI to verify auth and usage fetching works:

```bash
# Show all provider usage
npx @bytespell/opencode-usage-limits-router

# Show specific provider
npx @bytespell/opencode-usage-limits-router --provider anthropic

# JSON output
npx @bytespell/opencode-usage-limits-router --json

# Bypass cache
npx @bytespell/opencode-usage-limits-router --no-cache
```

Expected output should show:
- Provider name
- Usage percentages
- Pace indicators ([-X%] or [+X%])
- Reset times

### 3. Test session.idle Event Handler

**Enable debug mode** to see all plugin activity:

```bash
cd ~/test-usage-limits-plugin
USAGE_LIMITS_DEBUG=1 opencode
```

This will:
- Create `plugin-debug.log` in the current directory
- Show toast notifications after every assistant response with usage info

**Send a test message**:
1. Type a message in OpenCode: "Hello, how are you?"
2. Wait for assistant response to complete
3. Watch for:
   - Toast notification showing usage info
   - `plugin-debug.log` getting updated

**Check the debug log**:
```bash
tail -f plugin-debug.log
```

You should see entries like:
```
[2026-01-07T...] === session.idle event received for session ses_... ===
[2026-01-07T...] Fetching session messages...
[2026-01-07T...] Last assistant message used: anthropic/claude-sonnet-4-5-20250929
[2026-01-07T...] [INFO] Session ses_...: Assistant response completed using anthropic/claude-sonnet-4-5-20250929
[2026-01-07T...] Tokens available: anthropic, github-copilot
[2026-01-07T...] Fetching usage data...
[2026-01-07T...] Provider anthropic pace: -73
[2026-01-07T...] On pace (-73%), no action needed
```

### 4. Test Auto-Switching (TEST MODE)

The plugin supports test mode with mock data to simulate different scenarios.

**Test Scenario: anthropic_over_pace**

This simulates Anthropic being +10% over pace, GitHub Copilot at -20% pace.

Set environment variables:
```bash
export USAGE_LIMITS_DEBUG=1
export USAGE_LIMITS_TEST_MODE=1
export USAGE_LIMITS_TEST_SCENARIO=anthropic_over_pace
```

Start OpenCode and configure to use Anthropic:
```bash
opencode
# In OpenCode TUI, switch to anthropic/claude-sonnet-4-5-20250929
```

Send a message and watch for:
1. Toast showing usage info (debug mode)
2. Toast showing **"Switched to github-copilot"** (auto-switch)
3. Check debug log for:
   ```
   [INFO] Provider anthropic is over pace: +10% (threshold: +5%)
   [INFO] AUTO-SWITCH: anthropic/claude-sonnet-4-5-20250929 -> github-copilot/claude-sonnet-4.5 (pace: 10% -> -20%)
   ```

Verify the model changed:
- Send another message
- It should use `github-copilot/claude-sonnet-4.5` automatically

**Other Test Scenarios:**
```bash
# Both providers over pace (should warn, no switch)
export USAGE_LIMITS_TEST_SCENARIO=both_over_pace

# Only headless data (no switching logic, just display)
export USAGE_LIMITS_TEST_SCENARIO=headless
```

### 5. Test Real Auto-Switching

To test real auto-switching (without test mode):

**Option A: Wait for natural over-pace**
1. Use OpenCode normally
2. Monitor `plugin-debug.log` (with `USAGE_LIMITS_DEBUG=1`)
3. When you hit +5% over pace, plugin should auto-switch

**Option B: Manually set pace (advanced)**
1. Use the CLI to check current pace
2. Use OpenCode heavily on one provider to push it over pace
3. Watch for auto-switch

### 6. Test Debounce

The plugin debounces `session.idle` events (2 second window).

Test:
1. Send a message
2. Immediately check the log - should see ONE processing cycle
3. Should NOT see duplicate "session.idle event received" within 2 seconds

### 7. Test Error Handling

**Missing auth:**
```bash
# Temporarily move auth.json
mv ~/.local/share/opencode/auth.json ~/.local/share/opencode/auth.json.bak

# Start OpenCode
opencode

# Send a message - plugin should silently skip (no tokens)

# Restore auth
mv ~/.local/share/opencode/auth.json.bak ~/.local/share/opencode/auth.json
```

**Network error simulation:**
- Disconnect internet
- Send a message
- Plugin should fail gracefully, check logs for error handling

### 8. Test Commands (Future)

The `/usage` and `/route` commands are registered but may need OpenCode support.

Try:
```
/usage
/route claude-sonnet-4-5
```

## Expected Behaviors

### ✅ Success Cases

1. **On pace**: No toast (unless debug mode), no switching
2. **Over pace, better option available**: Toast + auto-switch + config update
3. **Over pace, no better option**: Warning toast only, no switch
4. **Non-routable model**: Warning toast about pace, no switch (can't route)

### ⚠️ Edge Cases to Test

1. **Instance disposal**: After auto-switch, verify:
   - Toast appeared before disposal
   - TUI reloaded correctly
   - Next message uses new provider

2. **Concurrent messages**: 
   - Send message
   - While processing, send another
   - Verify debounce prevents duplicate processing

3. **Manual model change**:
   - Plugin auto-switches to provider B
   - Manually switch back to provider A
   - Plugin should respect manual choice for current session

## Debug Log Analysis

Good log patterns:
```
[INFO] Session ...: Assistant response completed using ...
[INFO] Provider ... is over pace: +X%
[INFO] AUTO-SWITCH: ... -> ... (pace: X% -> Y%)
```

Bad log patterns:
```
ERROR in session.idle handler: ...
ERROR: ...
```

If you see errors, share the relevant log section.

## Cleanup

```bash
# Stop debug mode
unset USAGE_LIMITS_DEBUG
unset USAGE_LIMITS_TEST_MODE
unset USAGE_LIMITS_TEST_SCENARIO

# Remove test project
rm -rf ~/test-usage-limits-plugin
```

## Troubleshooting

### Plugin not loading
- Check `.opencode/package.json` syntax
- Run `cd .opencode && npm install`
- Check OpenCode startup logs

### No session.idle events
- Verify you're using OpenCode (not running CLI)
- Check that messages are completing (not aborting)

### Toast not showing
- Debug mode disabled?
- Check if `client.tui.showToast` is available (might need recent OpenCode version)

### Auto-switch not working
- Check pace thresholds in logs
- Verify model is routable (see `listRoutableModels()`)
- Check if better provider exists with enough headroom

## Next Steps

After testing works:
1. Disable debug mode for normal usage
2. Let it run in background and monitor for auto-switches
3. Check `plugin-debug.log` periodically for [INFO] entries
4. Report any issues or unexpected behavior
