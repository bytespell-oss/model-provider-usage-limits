#!/bin/bash

# Demo script for model-provider-usage-limits
# Runs the actual CLI with --demo flag to show sample output

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_PATH="$SCRIPT_DIR/../packages/core/dist/cli.js"

# Command 1: Basic usage check
echo "$ npx @bytespell/model-provider-usage-limits"
sleep 0.5
node "$CLI_PATH" --demo

sleep 2.5

# Command 2: Route to find best provider  
echo ""
echo "$ npx @bytespell/model-provider-usage-limits --route claude-sonnet-4-5"
sleep 0.5
node "$CLI_PATH" --demo --route claude-sonnet-4-5

sleep 4
