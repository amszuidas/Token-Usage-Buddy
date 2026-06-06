#!/usr/bin/env bash
set -euo pipefail

LABEL="${TOKEN_BUDDY_LAUNCHD_LABEL:-com.amszuidas.token-usage-buddy.bridge}"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs/TokenUsageBuddy"
GUI_DOMAIN="gui/$(id -u)"

echo "Label: $LABEL"
echo "Plist: $PLIST_PATH"

if launchctl print "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1; then
  echo "State: loaded"
  launchctl print "$GUI_DOMAIN/$LABEL" | grep -E 'state =|pid =|last exit code =|program =|working directory =|path = ' || true
else
  echo "State: not loaded"
fi

if [[ -f "$LOG_DIR/bridge.err.log" ]]; then
  echo
  echo "Last stderr lines:"
  tail -n 20 "$LOG_DIR/bridge.err.log"
fi

if [[ -f "$LOG_DIR/bridge.out.log" ]]; then
  echo
  echo "Last stdout lines:"
  tail -n 20 "$LOG_DIR/bridge.out.log"
fi
