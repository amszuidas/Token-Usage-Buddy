#!/usr/bin/env bash
set -euo pipefail

LABEL="${TOKEN_BUDDY_LAUNCHD_LABEL:-com.amszuidas.token-usage-buddy.bridge}"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs/TokenUsageBuddy"
GUI_DOMAIN="gui/$(id -u)"

if launchctl print "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1; then
  launchctl bootout "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1 || true
fi

rm -f "$PLIST_PATH"

if [[ "${1:-}" == "--remove-logs" ]]; then
  rm -rf "$LOG_DIR"
fi

echo "Uninstalled $LABEL"
