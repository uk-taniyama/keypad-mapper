import { KeyMapTypes, REQUEST_SIZE, isKeyMapConsumer, isKeyMapKeys, isKeyMapMouse, packKeyMap, readKeypadInfo, readKeypadKeyMapTable, readKeypadKeyMaps, recvResponse, sendRequest, unpackKeyMapWithId, writeKeypadDelayTime, writeKeypadKeyMapRaw, writeKeypadLed } from './api';
import { padArray, toBuffer, toPaddedArray } from './tests/utils';
import { Consumer, LedColor, createKeyAction, mouse } from './types';

import type { KeyMapConsumer, KeyMapKeys, KeyMapMouse } from './api';

describe('api', () => {
  it.each([
    ['keys', { key: 0, layer: 0, type: KeyMapTypes.keys }, true, false, false],
    ['consumer', { key: 0, layer: 0, type: KeyMapTypes.consumer }, false, true, false],
    ['mouse', { key: 0, layer: 0, type: KeyMapTypes.mouse }, false, false, true],
  ])('isXxx:%s', (_, keyMap, isKeys, isConsumer, isMouse) => {
    expect(isKeyMapKeys(keyMap)).toBe(isKeys);
    expect(isKeyMapConsumer(keyMap)).toBe(isConsumer);
    expect(isKeyMapMouse(keyMap)).toBe(isMouse);
  });

  it('sendRequest', async () => {
    const { hid } = mockHid();
    const request = [0x01, 0x02, 0x03];
    await sendRequest(hid, request);
    expect(hid.write).toHaveBeenCalledTimes(1);
    expect(hid.write).toHaveBeenCalledWith(expect.arrayContaining([
      0x01, 0x02, 0x03, ...Array(REQUEST_SIZE - 3).fill(0),
    ]));
  });

  it('recvResponse not empty', async () => {
    const { mockSetup, hid } = mockHid();
    mockSetup.read(Buffer.from('ABC'));
    await expect(recvResponse(hid)).resolves.toEqual(Buffer.from('ABC'));
  });

  it('recvResponse empty', async () => {
    const { mockSetup, hid } = mockHid();
    mockSetup.read(Buffer.alloc(0));
    await expect(recvResponse(hid)).rejects.toThrowError();
    expect(hid.read).toHaveBeenCalledTimes(1);
    expect(hid.read).toHaveBeenCalledWith(250);
  });

  it.each([
    ['1-key', '03 fa 0f 01-01 00 00 00 00 00 01 00 12', {
      keyId: 0x0F, layerId: 0x01, keyMap: { type: KeyMapTypes.keys, keys: [createKeyAction(0x12)] },
    }],
    ['2-key', '03 fa 0f 01-01 00 00 00 00 00 02 00 12 01 23', {
      keyId: 0x0F, layerId: 0x01, keyMap: { type: KeyMapTypes.keys, keys: [createKeyAction(0x12), createKeyAction(0x23, 0x01)] },
    }],
    ['LClick', '03 fa 01 02 03 00 00 00 00 00:04:00 01:00 00 00', {
      keyId: 0x01, layerId: 0x02, keyMap: { type: KeyMapTypes.mouse, mouse: mouse.LButton },
    }],
    ['MClick', '03 fa 02 02 03 00 00 00 00 00:04:00 04:00 00 00', {
      keyId: 0x02, layerId: 0x02, keyMap: { type: KeyMapTypes.mouse, mouse: mouse.MButton },
    }],
    ['RClick', '03 fa 03 02 03 00 00 00 00 00:04:00 02:00 00 00', {
      keyId: 0x03, layerId: 0x02, keyMap: { type: KeyMapTypes.mouse, mouse: mouse.RButton },
    }],
    ['WheelUp', '03 fa 04 02 03 00 00 00 00 00:04:00.00:00 00 01', {
      keyId: 0x04, layerId: 0x02, keyMap: { type: KeyMapTypes.mouse, mouse: mouse.WheelUp },
    }],
    ['WheelDown', '03 fa 05 02 03 00 00 00 00 00:04:00.00:00 00 ff', {
      keyId: 0x05, layerId: 0x02, keyMap: { type: KeyMapTypes.mouse, mouse: mouse.WheelDown },
    }],
    ['AL-CALC', '03 fa 02 02-02-00 00 00 00 00:01:92 01', {
      keyId: 0x02, layerId: 0x02, keyMap: { type: KeyMapTypes.consumer, consumer: Consumer(0x0192) },
    }],
  ])('unpackKeybordKeyMap and packKeyMap:%s', (_, input, expected) => {
    const buffer = toBuffer(input);
    const keyMapping = unpackKeyMapWithId(buffer);
    expect(keyMapping).toEqual(expected);
    expect(packKeyMap(keyMapping.keyMap)).toEqual(Array.from(buffer).slice(4));
  });

  it('readKeypadInfo', async () => {
    const { mockSetup, hid } = mockHid();
    mockSetup.read(toBuffer('03 fb 12 34'));
    const expected = '03 fb fb fb';
    const info = await readKeypadInfo(hid);
    expect(hid.write).toHaveBeenCalledTimes(1);
    expect(hid.write).toHaveBeenNthCalledWith(1, toPaddedArray(expected));
    expect(info).toEqual({ keys: 0x12, knobs: 0x34 });
  });

  it('readKeypadKeyMaps', async () => {
    const { mockSetup, hid } = mockHid();
    mockSetup.read(
      toBuffer('03 fa 01 01-01 00 00 00 00 00 01 01 12'),
      toBuffer('03 fa 02 01-01 00 00 00 00 00 02 01 12 02 34'),
      toBuffer('03 fa 03 01-03 00 00 00 00 00 04 01 02 03 04 05 00'),
      toBuffer('03 fa 04 01 02 00 00 00 00 00 01 12 34'),
    );
    const req1 = '03 fa 04 00 01';
    const keyMaps = await readKeypadKeyMaps(hid, { keys: 4, knobs: 0, layerId: 1 });
    expect(hid.write).toHaveBeenCalledTimes(1);
    expect(hid.write).toHaveBeenNthCalledWith(1, toPaddedArray(req1));
    expect(keyMaps).toEqual([
      { type: KeyMapTypes.keys, keys: [{ modKey: 0x01, keyCode: 0x12 }] } as KeyMapKeys,
      { type: KeyMapTypes.keys, keys: [{ modKey: 0x01, keyCode: 0x12 }, { modKey: 0x02, keyCode: 0x34 }] } as KeyMapKeys,
      {
        type: KeyMapTypes.mouse,
        mouse: {
          modKey: 0x01, button: 0x02, x: 0x03, y: 0x04, wheel: 0x05,
        },
      } as KeyMapMouse,
      { type: KeyMapTypes.consumer, consumer: { id: 0x3412 } } as KeyMapConsumer,
    ]);
  });

  it('readKeypadKeyMapTable', async () => {
    const { mockSetup, hid } = mockHid();
    mockSetup.read(
      toBuffer('03 fa 01 01-01 00 00 00 00 00 01 11 21'),
      toBuffer('03 fa 02 01-01 00 00 00 00 00 01 12 22'),
      toBuffer('03 fa 03 01-01 00 00 00 00 00 01 13 23'),
      toBuffer('03 fa 03 02-01 00 00 00 00 00 01 14 24'),
      toBuffer('03 fa 02 02-01 00 00 00 00 00 01 15 25'),
      toBuffer('03 fa 01 02-01 00 00 00 00 00 01 16 26'),
    );
    const req1 = '03 fa 03 00 01';
    const req2 = '03 fa 03 00 02';
    const table = await readKeypadKeyMapTable(hid, { keys: 3, knobs: 0 }, 2);
    expect(hid.write).toHaveBeenCalledTimes(2);
    expect(hid.write).toHaveBeenNthCalledWith(1, toPaddedArray(req1));
    expect(hid.write).toHaveBeenNthCalledWith(2, toPaddedArray(req2));
    expect(table).toEqual([
      [
        { type: 1, keys: [{ modKey: 0x11, keyCode: 0x21 }] },
        { type: 1, keys: [{ modKey: 0x12, keyCode: 0x22 }] },
        { type: 1, keys: [{ modKey: 0x13, keyCode: 0x23 }] },
      ], [
        { type: 1, keys: [{ modKey: 0x16, keyCode: 0x26 }] },
        { type: 1, keys: [{ modKey: 0x15, keyCode: 0x25 }] },
        { type: 1, keys: [{ modKey: 0x14, keyCode: 0x24 }] },
      ],
    ]);
  });

  it('writeKeypadKeyMapRaw', async () => {
    const { hid } = mockHid();
    const expected = '03 fd 01 02 03';
    await writeKeypadKeyMapRaw(hid, { keyId: 0x01, layerId: 0x02, data: [0x03] });
    expect(hid.write).toHaveBeenCalledTimes(1);
    expect(hid.write).toHaveBeenNthCalledWith(1, toPaddedArray(expected));
  });

  it.each([
    [1, 0, LedColor.Red, '03 fe b0 01 08 00 00 00 00 00 01 00 10'],
    [1, 1, LedColor.Red, '03 fe b0 01 08 00 00 00 00 00 01 00 11'],
    [1, 2, LedColor.Red, '03 fe b0 01 08 00 00 00 00 00 01 00 12'],
    [1, 3, LedColor.Orrange, '03 fe b0 01 08 00 00 00 00 00 01 00 23'],
    [2, 0, LedColor.Red, '03 fe b0 01 08 00 00 00 00 00 02 00 10'],
  ])('writeKeypadLed:%dms', async (layerId, ledModeId, ledColorId, expected) => {
    const { hid } = mockHid();
    await writeKeypadLed(hid, { layerId, ledModeId, ledColorId });
    expect(hid.write).toHaveBeenCalledTimes(2);
    expect(hid.write).toHaveBeenNthCalledWith(1, toPaddedArray(expected));
    expect(hid.write).toHaveBeenNthCalledWith(2, padArray([0x03, 0xfd, 0xfe, 0xff]));
  });

  it.each([
    [0, '03 fe b0 01 05 00 00 00 00 00 01 00 24'],
    [10, '03 fe b0 01 05 0a 00 00 00 00 01 00 24'],
  ])('writeKeypadDelayTime:%dms', async (ms, expected) => {
    const { hid } = mockHid();
    await writeKeypadDelayTime(hid, { delayTimeMs: ms });
    expect(hid.write).toHaveBeenCalledTimes(2);
    expect(hid.write).toHaveBeenNthCalledWith(1, toPaddedArray(expected));
    expect(hid.write).toHaveBeenNthCalledWith(2, padArray([0x03, 0xfd, 0xfe, 0xff]));
  });
});
