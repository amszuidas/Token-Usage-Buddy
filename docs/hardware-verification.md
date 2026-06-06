# Hardware Verification

Use this checklist with an M5Stack Core2 v1.3 and the Mac bridge.

## Manual Checklist

1. Flash firmware to the device.
   ```sh
   cd firmware
   PATH=/Users/minimax/Library/Python/3.9/bin:$PATH pio run -e m5stack-core2 -t upload
   ```

2. Start the Mac bridge after building the workspace.
   ```sh
   pnpm build
   pnpm --filter @token-usage-buddy/mac-bridge start
   ```

3. Confirm the device advertises as `TokenUsageBuddy` and the bridge connects over BLE.

4. Confirm the top bar shows Bluetooth state and battery. There should be no WiFi setup prompt, WiFi icon, SSID, or WiFi requirement.

5. Confirm the initial snapshot renders on the Today view with today's total, cost, updated time, and stale/current state.

6. Navigate to Agents and confirm the four rows use the expected colors:
   - Claude: `#D97757`
   - Codex: `#10A37F`
   - OpenCode: `#03B000`
   - Others: `#8E8EA0`

7. Confirm touch behavior in the invisible bottom zones:
   - Bottom left: previous view.
   - Bottom center: manual refresh.
   - Bottom right: next view.
   - No bottom navigation labels are rendered.

8. On bottom-center refresh, confirm the device sends the refresh event, shows `Updating` and `Running ccusage...`, then clears the overlay when fresh data or an error payload arrives.

9. Confirm the 7-day Trend view shows seven bars.

10. Confirm the Breakdown view shows input, cache-create, cache-read, and output token buckets, or `No breakdown yet` when totals are zero.

11. Confirm the Status view shows Bluetooth, ccusage version, next refresh, state, and any error text.

12. Disconnect the Mac bridge or move out of BLE range. The last data should remain visible, BLE status should update, and any refresh overlay should clear instead of sticking.

13. Reconnect the bridge and confirm the device receives a fresh snapshot.

14. Leave the bridge running and confirm a subsequent scheduled refresh occurs after the configured cadence, 10 minutes by default.
