#!/bin/bash

# Demo script for model-provider-usage-limits
# This script demonstrates the basic usage and routing functionality

echo "$ npx @bytespell/model-provider-usage-limits" | pv -qL 50
sleep 0.5
cat <<OUTPUT | pv -qL 200
anthropic:
  5h: 45% used
  7d: 30% used

github-copilot:
  monthly: 60% used
OUTPUT

sleep 1.5
echo ""
echo "$ npx @bytespell/model-provider-usage-limits --route claude-sonnet-4-5" | pv -qL 50
sleep 0.5
cat <<OUTPUT | pv -qL 200
github-copilot has most headroom (-15% pace)
  - github-copilot: score -15 (pace: -15%)
  - anthropic: score 8 (pace: +8%)
OUTPUT

sleep 2
