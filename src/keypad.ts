import { withHid } from 'with-hid';

import { readKeypadInfo, readKeypadKeyMapTable, writeKeypadDelayTime, writeKeypadKeyMap, writeKeypadLed } from './api';
import { getKeyCount, getKnobByKeyId } from './types';

import type { KeyMapWithId, WriteKeypadLedParam } from './api';
import type { KeypadInfo } from './types';
import type { HidDevice, HidIO } from 'with-hid';

const defaultLayers = 3;

class KeypadImpl {
  layers: number;

  info: KeypadInfo;

  constructor(public device: HidDevice, public hid: HidIO) {
    this.layers = defaultLayers;
    this.info = { keys: 0, knobs: 0 };
  }

  setLayers(layers: number) {
    this.layers = layers;
  }

  setInfo(info: KeypadInfo) {
    this.info.keys = info.keys;
    this.info.knobs = info.knobs;
  }

  getKeyCount() {
    return getKeyCount(this.info);
  }

  getKnobByKeyId(keyId: number) {
    return getKnobByKeyId(this.info, keyId);
  }

  async readInfo() {
    const info = await readKeypadInfo(this.hid);
    this.setInfo(info);
    return this.info;
  }

  async readKeyMapTable() {
    return readKeypadKeyMapTable(this.hid, this.info, this.layers);
  }

  async writeKeyMap(keyMapWithId: KeyMapWithId) {
    return writeKeypadKeyMap(this.hid, keyMapWithId);
  }

  async writeLed(param: WriteKeypadLedParam) {
    return writeKeypadLed(this.hid, param);
  }

  async writeDelayTime(delayTimeMs: number) {
    return writeKeypadDelayTime(this.hid, { delayTimeMs });
  }
}

export type Keypad = Omit<KeypadImpl, 'constructor'>;
export type KeypadTask<T> = (keypad: Keypad) => Promise<T>;

export async function withKeypad<T>(device: HidDevice, process: KeypadTask<T>): Promise<T> {
  return withHid(device, (hid) => process(new KeypadImpl(device, hid)));
}
