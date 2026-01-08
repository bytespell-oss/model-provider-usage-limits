#!/bin/bash

# Demo script for model-provider-usage-limits
# This script simulates the clack-styled CLI output

# ANSI color codes
RESET='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
BG_CYAN='\033[46m'
BLACK='\033[30m'

echo "$ npx @bytespell/model-provider-usage-limits --route claude-sonnet-4-5" | pv -qL 50
sleep 0.5
echo ""
echo -e "┌  ${BG_CYAN}${BLACK} model-provider-usage-limits ${RESET}"
echo -e "│"
sleep 0.3
echo -e "◇  Usage limits retrieved"
echo -e "│"
sleep 0.3
echo -e "│  ${DIM}Current Usage${RESET}"
echo -e "│"
echo -e "│  ${CYAN}anthropic${RESET}"
echo -e "│    ${DIM}5h:${RESET}      ${YELLOW}45% used${RESET}"
echo -e "│    ${DIM}7d:${RESET}      ${GREEN}30% used${RESET}"
echo -e "│"
echo -e "│  ${CYAN}github-copilot${RESET}"
echo -e "│    ${DIM}monthly:${RESET} ${YELLOW}60% used${RESET}"
echo -e "│"
sleep 0.5
echo -e "◇  Route calculated"
echo -e "│"
sleep 0.3
echo -e "│  ${GREEN}✓ github-copilot has most headroom (-15% pace)${RESET}"
echo -e "│"
echo -e "│  ${GREEN}●${RESET} ${GREEN}github-copilot${RESET}  score ${GREEN}-15${RESET}${DIM} (pace: -15%)${RESET}"
echo -e "│  ${DIM}○ anthropic${RESET}       score ${YELLOW}8${RESET}${DIM}   (pace: +8%)${RESET}"
echo -e "│"
echo -e "└  ${GREEN}Done!${RESET}"

sleep 2
