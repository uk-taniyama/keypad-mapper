import { withHid } from 'with-hid';

import { withKeypad } from './keypad';
import { toBuffer, toPaddedArray } from './tests/utils';

import type { HidDevice } from 'with-hid';

describe('keypad', () => {
  it('simple', async () => {
    mockWithHid(withHid);
    expect.hasAssertions();

    const device: HidDevice = {
      interface: 0,
      productId: 0,
      release: 0,
      vendorId: 0,
    };
    await withKeypad(device, async (keypad) => {
      expect(keypad.layers).toBe(3);
      keypad.setLayers(10);
      expect(keypad.layers).toBe(10);
      const info = { keys: 3, knobs: 1 };
      keypad.setInfo(info);
      expect(keypad.info).toEqual(info);
      expect(keypad.getKeyCount()).toEqual(3 + 3);
    });
  });

  it('withKeypad', async () => {
    const { mock, mockClear, mockSetup } = mockWithHid(withHid);
    const device: HidDevice = {
      interface: 0,
      productId: 0,
      release: 0,
      vendorId: 0,
    };
    const result = await withKeypad(device, async (keypad) => {
      expect(keypad.device).toEqual(device);

      mockSetup.read(toBuffer('03 fb 12 34'));
      const info = await keypad.readInfo();
      expect(info).toEqual({ keys: 0x12, knobs: 0x34 });
      expect(keypad.info).toEqual(info);

      keypad.setLayers(1);
      keypad.setInfo({ keys: 1, knobs: 0 });
      mockClear();
      mockSetup.read(toBuffer('03 fa 01 01-01 00 00 00 00 00 01 01 12'));
      await keypad.readKeyMapTable();
      expect(mock.write).toBeCalledTimes(1);
      expect(mock.write).toHaveBeenNthCalledWith(1, toPaddedArray('03 fa 01 00 01'));
      return 10;
    });
    expect(result).toBe(10);
  });
});
