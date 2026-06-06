# Token Usage Buddy

Standalone Token Usage Buddy shows local token usage on an M5Stack Core2 v1.3 from a Mac bridge. The device is BLE-only: it does not need WiFi, and the firmware does not configure WiFi.

The Mac bridge runs `npx ccusage@latest` and collects the last seven days for all agents plus Claude, Codex, and OpenCode. The dashboard uses the all-agent total as the source of truth, shows Claude, Codex, OpenCode, and computes Others as the remainder. Today is the primary view; the previous six days plus today form the 7-day trend.

## Views and Controls

The firmware has five views:

- Today: today's total tokens, cost, update time, and stale state.
- Agents: Claude, Codex, OpenCode, and Others.
- 7-day Trend: daily token bars for the last seven days.
- Breakdown: input, cache-create, cache-read, and output token buckets.
- Status: Bluetooth, ccusage version, next refresh, state, and errors.

Touch is handled by three invisible bottom zones. Tap the bottom left third for previous view, the bottom center third for manual refresh, and the bottom right third for next view. There are no bottom labels. Manual refresh sends a BLE event to the Mac; the device shows an `Updating` / `Running ccusage...` overlay until fresh data, an error payload, or a disconnect clears it.

The default refresh cadence is 10 minutes. Each scheduled or manual refresh first sends a stale `refreshInProgress` snapshot, then sends fresh data after `ccusage` finishes.

## Setup

Install dependencies from the repository root:

```sh
pnpm install
```

Build, test, and lint the TypeScript workspace:

```sh
pnpm build
pnpm test
pnpm lint
```

Build first, then start the Mac bridge from the repository root:

```sh
pnpm --filter @token-usage-buddy/mac-bridge build
pnpm --filter @token-usage-buddy/mac-bridge start
```

For bridge development:

```sh
pnpm --filter @token-usage-buddy/mac-bridge dev
```

The bridge uses native Bluetooth through `@abandonware/noble`. On macOS, the terminal or app running Node may need Bluetooth permission in System Settings before scanning or connecting works.

## Configuration

The Mac bridge reads these environment variables:

- `TOKEN_BUDDY_TIMEZONE`: timezone passed to `ccusage`; defaults to the Mac's resolved timezone.
- `TOKEN_BUDDY_REFRESH_MINUTES`: refresh interval in whole minutes; defaults to `10`, with a minimum valid value of `1`.
- `TOKEN_BUDDY_CACHE_PATH`: JSON cache path; defaults to `~/.token-usage-buddy-cache.json`.

Example:

```sh
TOKEN_BUDDY_TIMEZONE=Asia/Shanghai TOKEN_BUDDY_REFRESH_MINUTES=10 pnpm --filter @token-usage-buddy/mac-bridge start
```

## Firmware

PlatformIO commands are run from `firmware/`:

```sh
cd firmware
pio test -e native
pio run -e m5stack-core2
pio run -e m5stack-core2 -t upload
pio device monitor -b 115200
```

On this machine, `pio` may require the user Python bin directory on `PATH`:

```sh
cd firmware
PATH=/Users/minimax/Library/Python/3.9/bin:$PATH pio test -e native
PATH=/Users/minimax/Library/Python/3.9/bin:$PATH pio run -e m5stack-core2
```

See [docs/protocol.md](docs/protocol.md) for the BLE protocol and [docs/hardware-verification.md](docs/hardware-verification.md) for the manual device checklist.
