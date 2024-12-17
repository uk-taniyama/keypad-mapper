import { findHidDevices } from 'with-hid';

import { getKeyCount } from './types';
import { dbg, splitUInt16LE } from './utils';

import type { ConsumerAction, KeyAction, KeypadInfo, MouseAction } from './types';
import type { HidDeviceQuery, HidIO } from 'with-hid';

// SECTION devices

/**
 * The default query object for finding keypad devices.
 */
export const defaultKeypadQuery: HidDeviceQuery = {
  vendorId: 0x1189,
  productId: 0x8840,
  usagePage: 0xFF00,
  usage: 0x01,
};

/**
 * Finds keypad devices.
 *
 * However, you can specify a custom query if needed.
 */
export function findKeypadDevices(query: HidDeviceQuery = defaultKeypadQuery) {
  return findHidDevices(query);
}

// !SECTION

// SECTION raw I/O

export const REQUEST_SIZE = 65;

/**
 * Sends a request to the HID device.
 */
export async function sendRequest(hid: HidIO, request: number[]) {
  dbg('send:%s', request.map((i) => i.toString(16).padStart(2, '0')).join(' '));
  const req = [...request];
  for (let i = req.length; i < REQUEST_SIZE; i += 1) {
    req.push(0);
  }
  return hid.write(req);
}

/**
 * Receives a response from the HID device.
 *
 * @throws {Error} If no response is received from the device, an error is thrown with the message "No response received."
 */
export async function recvResponse(device: HidIO) {
  const buffer = await device.read(250);
  if (buffer.length === 0) {
    throw new Error('No response received.');
  }
  dbg('recv:%s', buffer.toString('hex').replace(/(00)+$/, '').replace(/(..)/g, '$1 '));
  return buffer;
}

// !SECTION

// SECTION pack/unpack

/**
 * Packs an array of KeyAction objects into a byte array for transmission.
 *
 * @throws {Error} If the number of keys is invalid, an error is thrown.
 */
export function packKeyActrions(keys: KeyAction[]) {
  const len = keys.length;
  if (len < 0 || len > 18) {
    throw new Error(`Invalid size:${len}`);
  }

  const data: number[] = [];
  data.push(len);
  for (let i = 0; i < len; i += 1) {
    data.push(keys[i].modKey);
    data.push(keys[i].keyCode);
  }

  return data;
}

/**
 * Unpacks a byte buffer into an array of KeyAction objects.
 */
export function unpackKeyActions(buffer: Buffer) {
  //        0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F 10
  // Key-1 03 fa 0f 01-01-00 00 00 00 00:01:00 12
  // Key-2 03 fa 0f 01-01-00 00 00 00 00:02:00 12:00 13
  const len = buffer.readInt8(0x0A);
  const keys: KeyAction[] = [];
  for (let i = 0; i < len; i += 1) {
    const modKey = buffer.readUInt8(0x0B + 2 * i);
    const keyCode = buffer.readUInt8(0x0B + 2 * i + 1);
    keys.push({ modKey, keyCode });
  }
  return keys;
}

/**
 * Packs a ConsumerAction into a byte array for transmission.
 */
export function packConsumerAction({ id }: ConsumerAction) {
  return [0x01, ...splitUInt16LE(id)];
}

/**
 * Unpacks a byte buffer into a ConsumerAction.
 */
export function unpackConsumerAction(buffer: Buffer) {
  //          0  1  2  3  4  5  6  7  8  9  A  B  C
  // AL-Calc 03 fa 02 02-02-00 00 00 00 00:01:92 01
  return { id: buffer.readUInt16LE(0x0B) };
}

// Modified Keys States     1
// Button States            1 Button press states (e.g., left, right)
// X-Axis Movement          1 Horizontal movement (relative)
// Y-Axis Movement          1 Vertical movement (relative)
// Wheel Movement           1 Wheel rotation (vertical scroll)
// Horizontal Wheel (Tilt)  1 Tilt wheel movement (horizontal scroll)

/**
 * Packs a MouseAction object into a byte array.
 */
export function packMouseAction(action: MouseAction) {
  return [0x04, action.modKey, action.button, action.x, action.y, action.wheel];
}

/**
 * Unpacks a byte buffer into a MouseAction object.
 */
export function unpackMouseAction(buffer: Buffer): MouseAction {
  //        0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F 10
  // L-BTN 03 fa 01 02 03 00 00 00 00 00:04:00 01:00 00 00 00
  // M-BTN 03 fa 02 02 03 00 00 00 00 00:04:00 04:00 00 00 00
  // R-BTN 03 fa 03 02 03 00 00 00 00 00:04:00 02:00 00 00 00
  //   WH+ 03 fa 04 02 03 00 00 00 00 00:04:00.00:00 00 01 00
  //   WH- 03 fa 05 02 03 00 00 00 00 00:04:00.00:00 00 ff 00
  // C-WH+ 03 fa 06 02 03 00 00 00 00 00:04:01.00:00 00 01 00
  // C-WH- 03 fa 07 02 03 00 00 00 00 00:04:01.00:00 00 ff 00
  // S-WH+ 03 fa 08 02 03 00 00 00 00 00:04:02.00:00 00 01 00
  // S-WH- 03 fa 09 02 03 00 00 00 00 00:04:02.00:00 00 ff 00
  // A-WH+ 03 fa 0a 02 03 00 00 00 00 00:04:04.00:00 00 01 00
  // A-WH- 03 fa 0b 02 03 00 00 00 00 00:04:04.00:00 00 ff 00
  const modKey = buffer.readUInt8(0x0B);
  const button = buffer.readUInt8(0x0C);
  const x = buffer.readUInt8(0x0D);
  const y = buffer.readUInt8(0x0E);
  const wheel = buffer.readUInt8(0x0F);
  return {
    modKey, button, x, y, wheel,
  };
}

/**
 * Base interface for KeyMap types.
 */
export interface KeyMapBase {
  type: number;
}

/**
 * Represents an unknown KeyMap with raw buffer data.
 */
export interface KeyMapUnknown extends KeyMapBase {
  buffer: Buffer;
}

// KeyMap Types as constants
export const KeyMapTypes = {
  keys: 0x01,
  consumer: 0x02,
  mouse: 0x03,
} as const;

/**
 * Represents a KeyMap that contains a list of KeyAction objects triggered by key presses.
 */
export interface KeyMapKeys extends KeyMapBase {
  type: typeof KeyMapTypes['keys'];
  keys: KeyAction[];
}

export function isKeyMapKeys(keyMap: KeyMapBase): keyMap is KeyMapKeys {
  return keyMap.type === KeyMapTypes.keys;
}

/**
 * Creates a KeyMapKeys object from an array of KeyAction objects.
 */
export function createKeyMapKeys(keys: KeyAction[]): KeyMapKeys {
  return { type: KeyMapTypes.keys, keys };
}

/**
 * Represents a KeyMap that contains a consumer device action triggered by key presses.
 */
export interface KeyMapConsumer extends KeyMapBase {
  type: typeof KeyMapTypes['consumer'];
  consumer: ConsumerAction;
}

export function isKeyMapConsumer(keyMap: KeyMapBase): keyMap is KeyMapConsumer {
  return keyMap.type === KeyMapTypes.consumer;
}

/**
 * Creates a KeyMapMouse object from a MouseAction.
 */
export function createKeyMapConsumer(action: ConsumerAction): KeyMapConsumer {
  return { type: KeyMapTypes.consumer, consumer: action };
}

/**
 * Represents a KeyMap that contains a mouse action triggered by key presses.
 */
export interface KeyMapMouse extends KeyMapBase {
  type: typeof KeyMapTypes['mouse'];
  mouse: MouseAction;
}

export function isKeyMapMouse(keyMap: KeyMapBase): keyMap is KeyMapMouse {
  return keyMap.type === KeyMapTypes.mouse;
}

/**
 * Creates a KeyMapMouse object from a MouseAction.
 */
export function createKeyMapMouse(action: MouseAction): KeyMapMouse {
  return { type: KeyMapTypes.mouse, mouse: action };
}

export type KeyMap = KeyMapUnknown | KeyMapKeys | KeyMapConsumer | KeyMapMouse;
export type KeyMapList = KeyMap[];
export type KeyMapTable = KeyMapList[];

/**
 * Packs a KeyMap into a byte array.
 *
 * @throws {Error} Throws an error if the KeyMap type is unsupported.
 */
export function packKeyMap(keyMap: KeyMap) {
  let data: number[];
  if (isKeyMapKeys(keyMap)) {
    data = packKeyActrions(keyMap.keys);
  } else if (isKeyMapConsumer(keyMap)) {
    data = packConsumerAction(keyMap.consumer);
  } else if (isKeyMapMouse(keyMap)) {
    data = packMouseAction(keyMap.mouse);
  } else {
    throw new Error(`Unsupported KeyMap type: ${keyMap.type}.`);
  }

  //             type  ?  ?  ?  ?  ?
  return [keyMap.type, 0, 0, 0, 0, 0, ...data];
}

export interface KeyMapWithId {
  layerId: number;
  keyId: number;
  keyMap: KeyMap;
}

/**
 * Unpacks a KeyMap with its associated layerId and keyId from a buffer.
 *
 * @throws {Error} Throws an error if the KeyMap type is unsupported.
 */
export function unpackKeyMapWithId(buffer: Buffer): KeyMapWithId {
  //    0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F 10
  //    3 fa  k  l  t  ?  ?  ?  ?  ?
  // K 03 fa 0f 01-01 00 00 00 00 00 01 00 12
  // M 03 fa 10 01-03 00 00 00 00 00 04 00 00 00 00 ff 00
  // C 03 fa 01 02 02 00 00 00 00 00 01 b5 00
  const keyId = buffer.readUInt8(2);
  const layerId = buffer.readUInt8(3);
  const type = buffer.readUInt8(4);
  switch (type) {
    case KeyMapTypes.keys:
      return {
        layerId, keyId, keyMap: { type, keys: unpackKeyActions(buffer) },
      };
    case KeyMapTypes.consumer:
      return {
        layerId, keyId, keyMap: { type, consumer: unpackConsumerAction(buffer) },
      };
    case KeyMapTypes.mouse:
      return {
        layerId, keyId, keyMap: { type, mouse: unpackMouseAction(buffer) },
      };
    default:
      return {
        layerId, keyId, keyMap: { type, buffer },
      };
  }
}

// !SECTION

// SECTION api

// TODO layer数はどうやって知れるのかはナゾ

export const packetReadKeypadInfo = [0x03, 0xfb, 0xfb, 0xfb];
export const packetEnd = [0x03, 0xfd, 0xfe, 0xff];

/**
 * Reads keypad information from a HID device.
 */
export async function readKeypadInfo(hid: HidIO) {
  await sendRequest(hid, packetReadKeypadInfo);

  const res = await recvResponse(hid);

  const result: KeypadInfo = {
    keys: res.readUInt8(2),
    knobs: res.readUInt8(3),
  };

  return result;
}

export interface ReadKeypadKeyMapsRequest {
  keys: number;
  knobs: number;
  layerId: number;
}

/**
 * Packs the parameters into a request packet for readKeypadKeyMaps.
 */
export function packReadKeypadKeyMaps({ keys, knobs, layerId }: ReadKeypadKeyMapsRequest) {
  return [0x03, 0xfa, keys, knobs, layerId];
}

/**
 * Reads the keymap configuration for a kaypad from a HID device.
 *
 * @throws {Error} Throws an error if the layer ID in the response does not match the requested layer.
 */
export async function readKeypadKeyMaps(hid: HidIO, param: ReadKeypadKeyMapsRequest) {
  await sendRequest(hid, packReadKeypadKeyMaps(param));

  const { layerId, ...info } = param;

  const result: KeyMapList = [];

  const count = getKeyCount(info);
  for (let i = 0; i < count; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const buffer = await recvResponse(hid);
    const keyMapWithId = unpackKeyMapWithId(buffer);
    if (keyMapWithId.layerId !== layerId) {
      throw new Error(`Invalid layer response: ${buffer}`);
    }
    result[keyMapWithId.keyId - 1] = keyMapWithId.keyMap;
  }
  return result;
}

/**
 * Reads the keymap table for a kaypad from a HID device.
 *
 * @throws {Error} Throws an error if any layer response is invalid or cannot be read.
 */
export async function readKeypadKeyMapTable(hid: HidIO, info: KeypadInfo, layers: number) {
  const result: KeyMapTable = [];
  for (let i = 0; i < layers; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const list = await readKeypadKeyMaps(hid, { ...info, layerId: i + 1 });
    result.push(list);
  }
  return result;
}

export interface WriteKeypadKeyMapParam {
  keyId: number;
  layerId: number;
  data: number[];
}

/**
 * Packs the parameters into a request packet for writeKeypadKeyMapRaw.
 */
export function packWriteKeypadKeyMapParam({ keyId, layerId, data }: WriteKeypadKeyMapParam) {
  return [0x03, 0xfd, keyId, layerId, ...data];
}

/**
 * Writes a raw keymap data to the HID device.
 */
export async function writeKeypadKeyMapRaw(hid: HidIO, param: WriteKeypadKeyMapParam) {
  const request = packWriteKeypadKeyMapParam(param);
  return sendRequest(hid, request);
}

/**
 * Writes a keymap to the HID device.
 */
export async function writeKeypadKeyMap(hid: HidIO, { keyId, layerId, keyMap }: KeyMapWithId) {
  return writeKeypadKeyMapRaw(hid, { keyId, layerId, data: packKeyMap(keyMap) });
}

export interface WriteKeypadLedParam {
  layerId: number;
  ledModeId: number;
  ledColorId: number;
}

/**
 * Packs the parameters into a request packet for writeKeypadLed.
 */
export function packWriteKeypadLedParam({ layerId, ledModeId, ledColorId }: WriteKeypadLedParam) {
  //           0  1  2  3  4  5  6  7  8  9  A  B  C
  // 0 RED    03 fe b0 01 08 00 00 00 00 00 01 00 10 : 03 fd fe ff
  // 1 RED    03 fe b0 01 08 00 00 00 00 00 01 00 11 : 03 fd fe ff
  // 2 RED    03 fe b0 01 08 00 00 00 00 00 01 00 12 : 03 fd fe ff
  // 3 ORANGE 03 fe b0 01 08 00 00 00 00 00 01 00 23 : 03 fd fe ff
  // 4 YELLOW 03 fe b0 01 08 00 00 00 00 00 01 00 34 : 03 fd fe ff
  // 0x0A      Layer ID
  // 0x0C-High LED Color ID: Red Orrange Yellow Green Cyan Blue Purple
  // 0x0C-Low  LED Mod ID: 0:None 1:All 2:LT->RB 3:RB->LT 4:Single 5:White
  const ledId = (ledColorId * 16) + ledModeId;
  return [0x03, 0xfe, 0xb0, 0x01, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, layerId, 0x00, ledId];
}

/**
 * Writes LED settings to the HID device for a specified layer.
 */
export async function writeKeypadLed(hid: HidIO, param: WriteKeypadLedParam) {
  await sendRequest(hid, packWriteKeypadLedParam(param));
  await sendRequest(hid, packetEnd);
}

export interface WriteKeypadDelayTimeParam {
  delayTimeMs: number;
}

/**
 * Packs the parameters into a request packet for writeKeypadDelayTime.
 */
export function packWriteKeypadDelayTimeParam({ delayTimeMs }: WriteKeypadDelayTimeParam) {
  //           0  1  2  3  4  5  6  7  8  9  A  B  C
  // 0 RED    03 fe b0 01 08 00 00 00 00 00 01 00 10 : 03 fd fe ff
  // 1 RED    03 fe b0 01 08 00 00 00 00 00 01 00 11 : 03 fd fe ff
  // 2 RED    03 fe b0 01 08 00 00 00 00 00 01 00 12 : 03 fd fe ff
  // 3 ORANGE 03 fe b0 01 08 00 00 00 00 00 01 00 23 : 03 fd fe ff
  // 4 YELLOW 03 fe b0 01 08 00 00 00 00 00 01 00 34 : 03 fd fe ff
  // 0x0A      Layer ID
  // 0x0C-High LED Color ID: Red Orrange Yellow Green Cyan Blue Purple
  // 0x0C-Low  LED Mod ID: 0:None 1:All 2:LT->RB 3:RB->LT 4:Single 5:White
  //           0  1  2  3  4  5  6  7  8  9  A  B  C
  // 0        03 fe b0 01 05 00 00 00 00 00 01 00 24
  // 10       03 fe b0 01 05 0a 00 00 00 00 01 00 24
  const timeBytes = splitUInt16LE(delayTimeMs);
  return [0x03, 0xfe, 0xb0, 0x01, 0x05, ...timeBytes, 0x00, 0x00, 0x00, 0x01, 0x00, 0x24];
}

/**
 * Writes a delay time setting to the HID device.
 */
export async function writeKeypadDelayTime(hid: HidIO, param: WriteKeypadDelayTimeParam) {
  await sendRequest(hid, packWriteKeypadDelayTimeParam(param));
  await sendRequest(hid, packetEnd);
}

// !SECTION
