import noble, { type Characteristic, type Peripheral } from '@abandonware/noble';
import { BLE_UUIDS, decodeDeviceEvent, encodeDashboardFrames } from '@token-usage-buddy/shared';
import {
  type RefreshRequestHandler,
  invokeRefreshHandler,
  scanForPeripheral,
} from './ble-client-internals.js';

export interface MacBleClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendJson(json: string): Promise<void>;
  onRefreshRequest(handler: RefreshRequestHandler): void;
}

const SERVICE_UUID = compactUuid(BLE_UUIDS.service);
const DASHBOARD_RX_UUID = compactUuid(BLE_UUIDS.dashboardRx);
const EVENT_TX_UUID = compactUuid(BLE_UUIDS.eventTx);
const SCAN_TIMEOUT_MS = 30_000;

export function createBleClient(): MacBleClient {
  let peripheral: Peripheral | null = null;
  let dashboardRx: Characteristic | null = null;
  let eventTx: Characteristic | null = null;
  let eventDataListener: ((data: Buffer) => void) | null = null;
  let refreshHandler: RefreshRequestHandler | null = null;
  let nextFrameId = 1;
  let writeQueue = Promise.resolve();

  async function connect(): Promise<void> {
    if (isConnected(peripheral, dashboardRx, eventTx)) return;

    cleanupEventListener();
    await waitForPoweredOn();
    const tokenPeripheral = await scanForTokenUsageBuddy();
    try {
      await tokenPeripheral.connectAsync();
      peripheral = tokenPeripheral;
      tokenPeripheral.once('disconnect', () => {
        if (peripheral === tokenPeripheral) {
          clearConnection();
        }
      });

      const discovered = await tokenPeripheral.discoverSomeServicesAndCharacteristicsAsync(
        [SERVICE_UUID],
        [DASHBOARD_RX_UUID, EVENT_TX_UUID],
      );
      dashboardRx = discovered.characteristics.find((characteristic) => compactUuid(characteristic.uuid) === DASHBOARD_RX_UUID)
        ?? null;
      eventTx = discovered.characteristics.find((characteristic) => compactUuid(characteristic.uuid) === EVENT_TX_UUID)
        ?? null;

      if (!dashboardRx || !eventTx) {
        throw new Error('TokenUsageBuddy BLE characteristics were not found');
      }

      eventDataListener = (data) => {
        const event = decodeDeviceEvent(data);
        if (event?.ev === 'refresh') invokeRefreshHandler(refreshHandler);
      };
      eventTx.on('data', eventDataListener);
      await eventTx.subscribeAsync();
    } catch (error) {
      clearConnection();
      await tokenPeripheral.disconnectAsync().catch(() => undefined);
      throw error;
    }
  }

  async function disconnect(): Promise<void> {
    const connectedPeripheral = peripheral;
    clearConnection();
    if (connectedPeripheral?.state === 'connected') await connectedPeripheral.disconnectAsync();
  }

  async function sendJson(json: string): Promise<void> {
    const operation = writeQueue.then(async () => {
      if (!isConnected(peripheral, dashboardRx, eventTx)) throw new Error('TokenUsageBuddy BLE device is not connected');
      const frameId = nextFrameId;
      const frames = encodeDashboardFrames(json, frameId);
      nextFrameId = frameId === 255 ? 1 : frameId + 1;

      for (const frame of frames) {
        await dashboardRx.writeAsync(frame, false);
      }
    });
    writeQueue = operation.catch(() => undefined);
    await operation;
  }

  function onRefreshRequest(handler: RefreshRequestHandler): void {
    refreshHandler = handler;
  }

  return { connect, disconnect, sendJson, onRefreshRequest };

  function clearConnection(): void {
    cleanupEventListener();
    peripheral = null;
    dashboardRx = null;
    eventTx = null;
  }

  function cleanupEventListener(): void {
    if (eventTx && eventDataListener) {
      eventTx.removeListener('data', eventDataListener);
    }
    eventDataListener = null;
  }
}

function compactUuid(uuid: string): string {
  return uuid.replaceAll('-', '').toLowerCase();
}

function isConnected(
  peripheral: Peripheral | null,
  dashboardRx: Characteristic | null,
  eventTx: Characteristic | null,
): dashboardRx is Characteristic {
  return peripheral?.state === 'connected' && dashboardRx !== null && eventTx !== null;
}

async function waitForPoweredOn(): Promise<void> {
  if (noble._state === 'poweredOn') return;

  await new Promise<void>((resolve, reject) => {
    const onStateChange = (state: string) => {
      if (state === 'poweredOn') {
        cleanup();
        resolve();
      } else if (state === 'unsupported' || state === 'unauthorized') {
        cleanup();
        reject(new Error(`Bluetooth adapter is ${state}`));
      }
    };
    const cleanup = () => {
      noble.removeListener('stateChange', onStateChange);
    };
    noble.on('stateChange', onStateChange);
  });
}

async function scanForTokenUsageBuddy(): Promise<Peripheral> {
  return scanForPeripheral(noble, {
    serviceUuids: [SERVICE_UUID],
    allowDuplicates: true,
    timeoutMs: SCAN_TIMEOUT_MS,
    timeoutMessage: `Timed out scanning for ${BLE_UUIDS.deviceName}`,
    isMatch: (candidate) => {
      const localName = candidate.advertisement.localName;
      const serviceUuids = candidate.advertisement.serviceUuids.map(compactUuid);
      return localName === BLE_UUIDS.deviceName && serviceUuids.includes(SERVICE_UUID);
    },
  });
}
