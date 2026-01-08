---
description: Pick best provider for a model based on usage limits
---

Pick the best provider for the model "$ARGUMENTS" based on current usage limits and switch to it.

First, check the current usage:
!`node packages/opencode-usage-limits-router/dist/cli.js --json`

Based on the usage data above, determine which provider has the most remaining capacity (lowest usage percentage, most negative paceDelta means more headroom).

Available routable models:
- claude-sonnet-4-5: available on anthropic, github-copilot
- claude-opus-4-5: available on anthropic, github-copilot

Then switch to the best provider using the /model command. For example:
- If github-copilot has more headroom: /model github-copilot/claude-sonnet-4.5
- If anthropic has more headroom: /model anthropic/claude-sonnet-4-5-20250929

Explain your reasoning for the choice.
