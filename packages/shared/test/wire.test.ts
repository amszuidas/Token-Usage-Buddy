import { describe, expect, it } from 'vitest';
import {
  BLE_UUIDS,
  decodeDeviceEvent,
  encodeDashboardFrames,
  reassembleDashboardFrames,
} from '../src/wire.js';

describe('BLE_UUIDS', () => {
  it('defines stable Token Usage Buddy UUIDs', () => {
    expect(BLE_UUIDS.deviceName).toBe('TokenUsageBuddy');
    expect(BLE_UUIDS.service).toBe('8f720001-7a5f-4a9d-9b0f-6e2d3c4b5a10');
  });
});

describe('dashboard frames', () => {
  it('splits and reassembles UTF-8 JSON payload bytes', () => {
    const payload = JSON.stringify({ schemaVersion: 1, title: 'Token Usage Buddy', value: '493.8M'.repeat(80) });
    const frames = encodeDashboardFrames(payload, 7);
    expect(frames.length).toBeGreaterThan(1);
    expect(frames.every((frame) => frame.length <= 160)).toBe(true);
    expect(reassembleDashboardFrames(frames)).toBe(payload);
  });

  it('rejects frames with the wrong magic', () => {
    const frames = encodeDashboardFrames('{"ok":true}', 1);
    frames[0][0] = 0x00;
    expect(() => reassembleDashboardFrames(frames)).toThrow('Invalid Token Usage Buddy frame magic');
  });

  it('rejects frames with fragments over the maximum payload length', () => {
    const frame = Buffer.alloc(160, 0x41);
    Buffer.from('TUB1', 'ascii').copy(frame, 0);
    frame[4] = 1;
    frame[5] = 1;
    frame[6] = 0;
    frame[7] = 1;
    frame[8] = 151;

    expect(() => reassembleDashboardFrames([frame])).toThrow('Dashboard frame fragment exceeds maximum length');
  });
});

describe('decodeDeviceEvent', () => {
  it('accepts refresh events only', () => {
    expect(decodeDeviceEvent(Buffer.from('{"ev":"refresh"}'))).toEqual({ ev: 'refresh' });
    expect(decodeDeviceEvent(Buffer.from('{"ev":"deny"}'))).toBeNull();
    expect(decodeDeviceEvent(Buffer.from('not-json'))).toBeNull();
  });

  it('rejects refresh events with extra fields', () => {
    expect(decodeDeviceEvent(Buffer.from('{"ev":"refresh","extra":true}'))).toBeNull();
  });
});
