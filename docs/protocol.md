# BLE Protocol

Token Usage Buddy uses one BLE service with one Mac-to-device write characteristic and one device-to-Mac notify characteristic.

## Identity

- Device name: `TokenUsageBuddy`
- Service UUID: `8f720001-7a5f-4a9d-9b0f-6e2d3c4b5a10`
- Dashboard RX UUID: `8f720002-7a5f-4a9d-9b0f-6e2d3c4b5a10`
- Event TX UUID: `8f720003-7a5f-4a9d-9b0f-6e2d3c4b5a10`

The Mac scans for the service UUID and requires the advertised local name to be `TokenUsageBuddy`.

## Dashboard Frames

Dashboard payloads are UTF-8 JSON split into binary BLE frames. Each frame has a 9-byte header followed by a UTF-8 fragment of at most 150 bytes.

| Offset | Size | Value |
| --- | ---: | --- |
| 0 | 4 | ASCII magic `TUB1` |
| 4 | 1 | kind; dashboard is `1` |
| 5 | 1 | frameId, `1..255` |
| 6 | 1 | zero-based chunk index |
| 7 | 1 | chunk count, `1..255` |
| 8 | 1 | payload length for this fragment |
| 9 | N | UTF-8 JSON fragment, `0..150` bytes |

The Mac increments `frameId` from 1 through 255, then wraps back to 1. A new `frameId` starts a new receive sequence on the device.

## Reassembly and Validation

The device rejects frames with bad magic, unsupported kind, frameId `0`, invalid total length, fragment length greater than 150 bytes, zero chunk count, or a chunk index outside the declared count. Within a sequence, it rejects duplicate chunks and mismatched chunk counts. Completion requires every chunk from index `0` through `chunkCount - 1`; missing chunks leave the sequence incomplete. When all chunks are present, fragments are concatenated by chunk index and parsed as JSON.

The shared TypeScript decoder performs the same basic frame validation for tests and tooling, including bad magic, unsupported kind, invalid length, oversized fragments, invalid chunk count, invalid chunk index, mismatched frameId, mismatched chunk count, and incomplete sequences.

## Device Events

Manual refresh uses the Event TX notify characteristic. The device sends exactly this no-space JSON payload:

```json
{"ev":"refresh"}
```

The Mac bridge accepts refresh events with normal JSON whitespace around the single `ev` field, but firmware emits the compact payload above.

## Dashboard JSON

Full dashboard snapshots match `packages/shared/src/dashboard.ts`:

```ts
type AgentId = 'claude' | 'codex' | 'opencode' | 'others';

interface DashboardSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  timezone: string;
  ccusageVersion: string;
  stale: boolean;
  refreshInProgress: boolean;
  error: string | null;
  nextRefreshAt: string | null;
  today: {
    date: string;
    totalTokens: number;
    totalTokensLabel: string;
    costUsd: number;
    costLabel: string;
    breakdown: {
      input: number;
      cacheCreate: number;
      cacheRead: number;
      output: number;
    };
    agents: Array<{
      id: AgentId;
      label: string;
      totalTokens: number;
      percent: number;
    }>;
  };
  sevenDays: Array<{
    date: string;
    label: string;
    totalTokens: number;
  }>;
}
```

During refresh or error handling, the bridge may send a cached full snapshot with only `stale`, `refreshInProgress`, and `error` updated. If no cached snapshot exists yet, it can send a partial status payload:

```json
{
  "schemaVersion": 1,
  "stale": true,
  "refreshInProgress": true,
  "generatedAt": "2026-06-06T00:00:00.000Z",
  "timezone": "Asia/Shanghai",
  "error": null,
  "nextRefreshAt": null
}
```

The firmware accepts partial payloads. It updates only fields present in the JSON and leaves previously rendered usage data intact.

## Privacy

The BLE dashboard carries aggregate usage and status only: token totals, cost, token breakdowns, agent totals, seven-day totals, timestamps, ccusage version, stale/refresh/error state, and Bluetooth status rendered locally on the device. Prompts, logs, session transcripts, and raw `ccusage` records are not sent to the device.
