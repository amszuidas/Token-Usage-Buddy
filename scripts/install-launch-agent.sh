#!/usr/bin/env bash
set -euo pipefail

LABEL="${TOKEN_BUDDY_LAUNCHD_LABEL:-com.amszuidas.token-usage-buddy.bridge}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs/TokenUsageBuddy"
BRIDGE_JS="$REPO_ROOT/packages/mac-bridge/dist/bin/token-usage-buddy.js"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
PNPM_BIN="${PNPM_BIN:-$(command -v pnpm)}"
NODE_DIR="$(dirname "$NODE_BIN")"
PNPM_DIR="$(dirname "$PNPM_BIN")"
LAUNCHD_PATH="$NODE_DIR:$PNPM_DIR:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
GUI_DOMAIN="gui/$(id -u)"

xml_escape() {
  sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' <<< "$1"
}

if [[ "${TOKEN_BUDDY_SKIP_BUILD:-0}" != "1" ]]; then
  (cd "$REPO_ROOT" && "$PNPM_BIN" --filter @token-usage-buddy/mac-bridge build)
fi

if [[ ! -f "$BRIDGE_JS" ]]; then
  echo "Bridge entrypoint not found: $BRIDGE_JS" >&2
  echo "Run pnpm --filter @token-usage-buddy/mac-bridge build and try again." >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

if launchctl print "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1; then
  launchctl bootout "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1 || true
fi

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$(xml_escape "$LABEL")</string>

  <key>ProgramArguments</key>
  <array>
    <string>$(xml_escape "$NODE_BIN")</string>
    <string>$(xml_escape "$BRIDGE_JS")</string>
  </array>

  <key>WorkingDirectory</key>
  <string>$(xml_escape "$REPO_ROOT")</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>$(xml_escape "$HOME")</string>
    <key>PATH</key>
    <string>$(xml_escape "$LAUNCHD_PATH")</string>
  </dict>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>ThrottleInterval</key>
  <integer>30</integer>

  <key>StandardOutPath</key>
  <string>$(xml_escape "$LOG_DIR/bridge.out.log")</string>

  <key>StandardErrorPath</key>
  <string>$(xml_escape "$LOG_DIR/bridge.err.log")</string>
</dict>
</plist>
PLIST

plutil -lint "$PLIST_PATH" >/dev/null
launchctl bootstrap "$GUI_DOMAIN" "$PLIST_PATH"
launchctl enable "$GUI_DOMAIN/$LABEL"
launchctl kickstart -k "$GUI_DOMAIN/$LABEL"

echo "Installed and started $LABEL"
echo "Plist: $PLIST_PATH"
echo "Logs: $LOG_DIR/bridge.out.log and $LOG_DIR/bridge.err.log"
