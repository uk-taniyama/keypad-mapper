import { createKeyMapConsumer, createKeyMapKeys, createKeyMapMouse } from './api';
import { key } from './key-action-record';
import { formatKeyMap, formatKeyMapWithId } from './key-map';
import { media, mouse } from './types';

describe('formatKeyMap', () => {
  it.each([
    ['key:Pad0', createKeyMapKeys([key.Pad0])],
    ['media:MyComputer', createKeyMapConsumer(media.MyComputer)],
    ['mouse:LButton', createKeyMapMouse(mouse.LButton)],
    ['{"type":4,"buffer":{"type":"Buffer","data":[97,97]}}', { type: 0x04, buffer: Buffer.from('aa') }],
  ])('%s', (expected, keyMap) => {
    const actual = formatKeyMap(keyMap);
    expect(actual).toEqual(expected);
  });
});

describe('formatKeyMapWithId', () => {
  it.each([
    ['layer-id: 1, key-id: 1', 1, 1],
    ['layer-id: 2, knob-id: 1, knob-action: Left', 2, 2],
    ['layer-id: 3, knob-id: 1, knob-action: Click', 3, 3],
    ['layer-id: 4, knob-id: 1, knob-action: Right', 4, 4],
    ['layer-id: 5, knob-id: 2, knob-action: Left', 5, 5],
  ])('%s', (prefix, layerId, keyId) => {
    const info = { keys: 1, knobs: 1 };
    const keyMap = createKeyMapKeys([key.A]);
    const actual = formatKeyMapWithId(info, { layerId, keyId, keyMap });
    expect(actual).toEqual(`${prefix} = key:"a"`);
  });
});
