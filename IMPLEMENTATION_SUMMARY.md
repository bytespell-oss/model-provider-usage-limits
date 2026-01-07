# Implementation Summary: session.idle Event Handler

## Changes Made

### Plugin Refactor (`packages/opencode-usage-limits-router/src/plugin.ts`)

**Before:**
- Used `chat.message` hook (fired when user sent message - wrong timing)
- Tried to check usage before LLM call
- Had race conditions with deferred config updates

**After:**
- Uses `event` hook listening for `session.idle` (fires after assistant completes)
- Fetches last assistant message to determine which provider was used
- Shows toast notification, then updates config
- Toast displays before instance disposal (won't be lost)

### Key Implementation Details

#### 1. Event Handling
```typescript
event: async ({ event }: { event: Event }) => {
  if (event.type !== 'session.idle') return;
  
  const { sessionID } = event.properties;
  
  // Debounce duplicate events
  if (sessionID === lastProcessedSessionId && (now - lastProcessedTime) < 2000) {
    return;
  }
  
  // Fetch messages to get last provider/model used
  const messagesResponse = await client.session.messages({
    path: { id: sessionID },
    query: { limit: 10 },
  });
  
  const lastAssistant = messagesResponse.data
    .filter(m => m.info.role === 'assistant')
    .sort((a, b) => b.info.id.localeCompare(a.info.id))[0];
  
  const { providerID, modelID } = lastAssistant.info;
  // ... check usage and route
}
```

#### 2. Toast Before Config Update
```typescript
// Show toast FIRST
await client.tui.showToast({
  body: {
    message: `Switched to ${newProvider}...`,
    variant: 'success',
    duration: 6000,
  },
});

// THEN update config (triggers instance disposal)
await client.config.update({
  body: { model: newModelString },
});
```

#### 3. Enhanced Logging
```typescript
// Debug logs (only when USAGE_LIMITS_DEBUG=1)
debugLog('=== session.idle event received ===');
debugLog(`Provider ${providerID} pace: ${currentPace}`);

// Info logs (always logged for important events)
infoLog(`Session ${sessionID}: Assistant response completed using ${providerID}/${modelID}`);
infoLog(`Provider ${providerID} is over pace: +${currentPace}%`);
infoLog(`AUTO-SWITCH: ${oldModel} -> ${newModel} (pace: ${oldPace}% -> ${newPace}%)`);
```

## Flow Diagram

```
User sends message
    ↓
LLM processes with current model
    ↓
Assistant response completes
    ↓
session.idle event fires ← PLUGIN ACTIVATES HERE
    ↓
Plugin fetches last assistant message
    ↓
Gets providerID/modelID that was used
    ↓
Fetches usage data for all providers
    ↓
Check if current provider ≥ +5% over pace?
    ├─ No → Exit (maybe show debug toast)
    └─ Yes → Continue
           ↓
       Find alternative provider with ≤ -5% pace?
           ├─ No → Show warning toast, exit
           └─ Yes → Continue
                  ↓
              Show "Switching..." toast
                  ↓
              Update config.json
                  ↓
              Instance.dispose() called
                  ↓
              TUI receives server.instance.disposed
                  ↓
              TUI calls bootstrap() → reloads config
                  ↓
              Next message uses new provider
```

## Important Considerations

### Model Persistence ⚠️

**The plugin writes to `config.json`** when switching providers:

```json
{
  "model": "github-copilot/claude-sonnet-4.5"
}
```

**Implications:**
- ✅ Changes persist across OpenCode restarts
- ✅ Each project can have different provider preferences
- ✅ Git-trackable (can commit preferred provider)
- ⚠️ Not session-only (affects all future sessions in this project)
- ⚠️ Writes to disk (not in-memory)
- ⚠️ Triggers instance disposal (causes TUI reload)

**Why we do this:**
- No SDK API exists for session-only model override
- TUI's `modelStore` is in-memory only, not accessible from plugins
- `session.prompt({ model })` is per-message, not persistent
- `client.config.update()` is the only available API

### Instance Disposal

When `Config.update()` is called:
1. Writes to `{projectDir}/config.json`
2. Calls `Instance.dispose()`
3. Emits `server.instance.disposed` event
4. TUI receives event and calls `bootstrap()`
5. TUI reloads config, providers, agents, etc.

**Impact:**
- Usually transparent to user
- Brief reload (< 1 second typically)
- Session state preserved (messages, history)
- Only instance-level cache is cleared

### Toast Timing

Critical: **Toast MUST show before config update**

```typescript
// ✅ CORRECT ORDER
await client.tui.showToast({ ... });  // 1. Show toast first
await client.config.update({ ... });  // 2. Then update (triggers disposal)

// ❌ WRONG ORDER (toast would be disposed)
await client.config.update({ ... });  // Instance disposal starts
await client.tui.showToast({ ... });  // Toast might be lost
```

The toast is TUI-side state and survives instance disposal, but we show it first to be safe.

## Testing

### Quick Verification
```bash
cd ~/repos/model-provider-usage-limits
./test-plugin.sh
```

### Debug Mode Testing
```bash
export USAGE_LIMITS_DEBUG=1
opencode
# Send message, watch for toast and check plugin-debug.log
```

### Test Mode (Simulated Over-Pace)
```bash
export USAGE_LIMITS_DEBUG=1
export USAGE_LIMITS_TEST_MODE=1
export USAGE_LIMITS_TEST_SCENARIO=anthropic_over_pace
opencode
# Send message, should auto-switch to github-copilot
```

## Files Modified

- `packages/opencode-usage-limits-router/src/plugin.ts` - Main implementation
- `packages/opencode-usage-limits-router/README.md` - Updated documentation

## Files Created

- `TESTING.md` - Comprehensive testing guide
- `QUICKSTART.md` - Quick start instructions
- `test-plugin.sh` - Automated verification script
- `IMPLEMENTATION_SUMMARY.md` - This file

## Success Criteria

✅ Plugin loads without errors
✅ `session.idle` events are received
✅ Last assistant message is fetched correctly
✅ Usage data fetched for all providers
✅ Toast shows before config update
✅ Config update succeeds
✅ Instance disposal doesn't break functionality
✅ Next message uses new provider
✅ Debug logging works
✅ Debounce prevents duplicate processing

## Known Limitations

1. **No per-session override** - Changes persist to config.json (project-level)
2. **Instance disposal** - Triggers TUI reload (usually quick but noticeable)
3. **Manual switches overridden** - If you manually switch back, plugin will switch again if still over pace
4. **Limited to routable models** - Only works for models available on multiple providers

## Future Improvements

- [ ] Request OpenCode API for per-session model override (no persistence)
- [ ] Add opt-out mechanism (disable auto-switch per project)
- [ ] Support more model aliases (e.g., "sonnet" → "claude-sonnet-4-5")
- [ ] Track manual user switches and respect them for N messages
- [ ] Add rate limiting (don't switch more than once per N minutes)

## Conclusion

The implementation successfully switches providers based on usage limits, with proper timing and logging. The main trade-off is writing to `config.json` instead of session-only state, but this is the best available approach given OpenCode's current API surface.
