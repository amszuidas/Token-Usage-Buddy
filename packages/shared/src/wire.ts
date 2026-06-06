export const BLE_UUIDS = {
  deviceName: 'TokenUsageBuddy',
  service: '8f720001-7a5f-4a9d-9b0f-6e2d3c4b5a10',
  dashboardRx: '8f720002-7a5f-4a9d-9b0f-6e2d3c4b5a10',
  eventTx: '8f720003-7a5f-4a9d-9b0f-6e2d3c4b5a10',
} as const;

export interface DeviceEvent {
  ev: 'refresh';
}

const MAGIC = Buffer.from('TUB1', 'ascii');
const KIND_DASHBOARD = 1;
const MAX_FRAGMENT_BYTES = 150;
const JSON_WS = '[ \\t\\r\\n]*';
const REFRESH_EVENT_JSON = new RegExp(`^${JSON_WS}\\{${JSON_WS}"ev"${JSON_WS}:${JSON_WS}"refresh"${JSON_WS}\\}${JSON_WS}$`);

export function encodeDashboardFrames(jsonPayload: string, frameId: number): Buffer[] {
  if (!Number.isInteger(frameId) || frameId < 1 || frameId > 255) {
    throw new Error('frameId must be an integer from 1 to 255');
  }
  const payload = Buffer.from(jsonPayload, 'utf8');
  const chunkCount = Math.max(1, Math.ceil(payload.length / MAX_FRAGMENT_BYTES));
  if (chunkCount > 255) throw new Error('Dashboard payload exceeds 255 BLE chunks');

  const frames: Buffer[] = [];
  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * MAX_FRAGMENT_BYTES;
    const fragment = payload.subarray(start, start + MAX_FRAGMENT_BYTES);
    const frame = Buffer.alloc(9 + fragment.length);
    MAGIC.copy(frame, 0);
    frame[4] = KIND_DASHBOARD;
    frame[5] = frameId;
    frame[6] = index;
    frame[7] = chunkCount;
    frame[8] = fragment.length;
    fragment.copy(frame, 9);
    frames.push(frame);
  }
  return frames;
}

export function reassembleDashboardFrames(frames: Buffer[]): string {
  if (frames.length === 0) throw new Error('No dashboard frames received');
  const first = parseFrame(frames[0]);
  const chunks = new Array<Buffer>(first.chunkCount);
  for (const frame of frames) {
    const parsed = parseFrame(frame);
    if (parsed.kind !== KIND_DASHBOARD) throw new Error('Unsupported Token Usage Buddy frame kind');
    if (parsed.frameId !== first.frameId) throw new Error('Mismatched dashboard frame id');
    if (parsed.chunkCount !== first.chunkCount) throw new Error('Mismatched dashboard chunk count');
    chunks[parsed.chunkIndex] = parsed.payload;
  }
  if (chunks.some((chunk) => !chunk)) throw new Error('Incomplete dashboard frame sequence');
  return Buffer.concat(chunks).toString('utf8');
}

export function decodeDeviceEvent(buf: Buffer): DeviceEvent | null {
  const text = buf.toString('utf8');
  return REFRESH_EVENT_JSON.test(text) ? { ev: 'refresh' } : null;
}

function parseFrame(frame: Buffer) {
  if (frame.length < 9 || !frame.subarray(0, 4).equals(MAGIC)) {
    throw new Error('Invalid Token Usage Buddy frame magic');
  }
  const payloadLength = frame[8];
  if (frame.length !== 9 + payloadLength) throw new Error('Invalid Token Usage Buddy frame length');
  if (payloadLength > MAX_FRAGMENT_BYTES) throw new Error('Dashboard frame fragment exceeds maximum length');
  if (frame[7] === 0) throw new Error('Invalid dashboard chunk count');
  if (frame[6] >= frame[7]) throw new Error('Invalid dashboard chunk index');
  return {
    kind: frame[4],
    frameId: frame[5],
    chunkIndex: frame[6],
    chunkCount: frame[7],
    payload: frame.subarray(9),
  };
}
