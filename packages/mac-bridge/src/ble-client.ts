import * as noble from '@abandonware/noble';
import { BLE_UUIDS, decodeDeviceEvent, encodeDashboardFrames } from '@token-usage-buddy/shared';

export interface MacBleClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendJson(json: string): Promise<void>;
  onRefreshRequest(handler: () => void): void;
}

const SERVICE_UUID = compactUuid(BLE_UUIDS.service);
const DASHBOARD_RX_UUID = compactUuid(BLE_UUIDS.dashboardRx);
const EVENT_TX_UUID = compactUuid(BLE_UUIDS.eventTx);

export function createBleClient(): MacBleClient {
  let peripheral: noble.Peripheral | null = null;
  let dashboardRx: noble.Characteristic | null = null;
  let eventTx: noble.Characteristic | null = null;
  let refreshHandler: (() => void) | null = null;
  let nextFrameId = 1;
  let writeQueue = Promise.resolve();

  async function connect(): Promise<void> {
    if (isConnected(peripheral, dashboardRx, eventTx)) return;

    await waitForPoweredOn();
    const tokenPeripheral = await scanForTokenUsageBuddy();
    await tokenPeripheral.connectAsync();
    peripheral = tokenPeripheral;
    tokenPeripheral.once('disconnect', () => {
      if (peripheral === tokenPeripheral) {
        peripheral = null;
        dashboardRx = null;
        eventTx = null;
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
      await tokenPeripheral.disconnectAsync().catch(() => undefined);
      throw new Error('TokenUsageBuddy BLE characteristics were not found');
    }

    eventTx.on('data', (data) => {
      const event = decodeDeviceEvent(data);
      if (event?.ev === 'refresh') refreshHandler?.();
    });
    await eventTx.subscribeAsync();
  }

  async function disconnect(): Promise<void> {
    const connectedPeripheral = peripheral;
    peripheral = null;
    dashboardRx = null;
    eventTx = null;
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

  function onRefreshRequest(handler: () => void): void {
    refreshHandler = handler;
  }

  return { connect, disconnect, sendJson, onRefreshRequest };
}

function compactUuid(uuid: string): string {
  return uuid.replaceAll('-', '').toLowerCase();
}

function isConnected(
  peripheral: noble.Peripheral | null,
  dashboardRx: noble.Characteristic | null,
  eventTx: noble.Characteristic | null,
): dashboardRx is noble.Characteristic {
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

async function scanForTokenUsageBuddy(): Promise<noble.Peripheral> {
  await noble.startScanningAsync([SERVICE_UUID], false);
  try {
    return await new Promise<noble.Peripheral>((resolve) => {
      const onDiscover = (candidate: noble.Peripheral) => {
        const localName = candidate.advertisement.localName;
        const serviceUuids = candidate.advertisement.serviceUuids.map(compactUuid);
        if (localName === BLE_UUIDS.deviceName && serviceUuids.includes(SERVICE_UUID)) {
          noble.removeListener('discover', onDiscover);
          resolve(candidate);
        }
      };
      noble.on('discover', onDiscover);
    });
  } finally {
    await noble.stopScanningAsync().catch(() => undefined);
  }
}
