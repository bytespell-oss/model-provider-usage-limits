#!/bin/bash

# Demo script for model-provider-usage-limits
# This script demonstrates the basic usage and routing functionality

# ANSI color codes
RESET='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'

echo "$ npx @bytespell/model-provider-usage-limits" | pv -qL 50
sleep 0.5
echo ""
echo -e "${BOLD}anthropic${RESET}:"
echo -e "  ${DIM}5h:${RESET} ${YELLOW}45%${RESET} used"
echo -e "  ${DIM}7d:${RESET} ${GREEN}30%${RESET} used"
echo ""
echo -e "${BOLD}github-copilot${RESET}:"
echo -e "  ${DIM}monthly:${RESET} ${YELLOW}60%${RESET} used"

sleep 1.5
echo ""
echo "$ npx @bytespell/model-provider-usage-limits --route claude-sonnet-4-5" | pv -qL 50
sleep 0.5
echo ""
echo -e "${BOLD}github-copilot has most headroom (-15% pace)${RESET}"
echo -e "  ${GREEN}→${RESET} ${CYAN}github-copilot${RESET}: score -15 ${DIM}(pace:${RESET} ${GREEN}-15%${RESET}${DIM})${RESET}"
echo -e "    ${CYAN}anthropic${RESET}: score 8 ${DIM}(pace:${RESET} ${YELLOW}+8%${RESET}${DIM})${RESET}"

sleep 2
