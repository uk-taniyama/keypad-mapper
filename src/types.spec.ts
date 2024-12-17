import { Alt, Consumer, Ctrl, Gui, Move, RAlt, RCtrl, RGui, RShift, Shift, Wheel, applyModKey, createKeyAction, createModKey, findKnobAction, findMouseAction, formatConsumerAction, formatMouseAction, getKeyCount, getKeyIdForKnob, getKnobByKeyId, getModKeyNames, isShift, media, mouse } from './types';

describe('types', () => {
  it.each([
    [{ keyCode: 0x00, modKey: 0 }, 0x20, { keyCode: 0x00, modKey: 0x20 }],
    [{ keyCode: 0x00, modKey: 0x01 }, 0x20, { keyCode: 0x00, modKey: 0x21 }],
    [{ keyCode: 0x00, modKey: 0x20 }, 0x20, { keyCode: 0x00, modKey: 0x20 }],
  ])('applyModKey:%s, 0x20', (action, modKey, expected) => {
    expect(applyModKey(action, modKey)).toEqual(expected);
  });

  it.each([
    ['00', []],
    ['01', ['Ctrl']],
    ['03', ['Ctrl', 'Shift']],
    ['18', ['Gui', 'RCtrl']],
  ])('getModKeyNames, createModKey:%s', (modKeyText, expected) => {
    const modKey = Number.parseInt(modKeyText, 16);
    expect(getModKeyNames(modKey)).toEqual(expected);
    expect(createModKey(expected)).toEqual(modKey);
  });

  it('createModKey:Error', () => {
    expect(createModKey(['Error'])).toBeUndefined();
    expect(createModKey(['Ctrl', 'Error'])).toBeUndefined();
    expect(createModKey(['Error', 'Ctrl'])).toBeUndefined();
  });

  describe('modKey', () => {
    it.each([
      ['Shift', Shift],
      ['Ctrl', Ctrl],
      ['Alt', Alt],
      ['Gui', Gui],
      ['RShift', RShift],
      ['RCtrl', RCtrl],
      ['RAlt', RAlt],
      ['RGui', RGui],
    ])('%s', (modKeyName, fn) => {
      const keyAction = createKeyAction(0xFE, 0);
      const modKey = createModKey([modKeyName]);
      const actual = fn(keyAction);
      expect(actual).toEqual(createKeyAction(0xFE, modKey));
    });
  });

  it('createKeyAction', () => {
    const actual = createKeyAction(0x12, 0x34);
    expect(actual).toEqual({ keyCode: 0x12, modKey: 0x34 });
  });

  it('isShift', () => {
    const actual = createKeyAction(0x12);
    expect(isShift(Shift(actual))).toBe(true);
    expect(isShift(RShift(actual))).toBe(false);
  });

  it('mouse', () => {
    expect(mouse).toMatchSnapshot();
  });

  it('findMouseAction', () => {
    Object.entries(mouse).forEach(([name, key]) => {
      expect(findMouseAction(name)).toEqual(key);
    });
    expect(findMouseAction('Move')).toBeUndefined();
  });

  describe('formatConsumerAction', () => {
    it.each([
      ['MyComputer', media.MyComputer],
      ['{"id":1}', Consumer(1)],
    ])('name:%s', (expected, action) => {
      const actual = formatConsumerAction(action);
      expect(actual).toEqual(expected);
    });
  });

  describe('formatMouseAction', () => {
    it.each([
      ['MoveLeft', mouse.MoveLeft],
      ['Move(-2,2)', Move(-2, 2)],
      ['Wheel(-2)', Wheel(-2)],
      ['Move(0,0)', Move(0, 0)],
      ['Ctrl+Wheel(-2)', Ctrl(Wheel(-2))],
      ['{"modKey":0,"button":2,"x":10,"y":0,"wheel":0}', { ...mouse.RButton, x: 10 }],
    ])('name:%s', (expected, action) => {
      const actual = formatMouseAction(action);
      expect(actual).toEqual(expected);
    });
  });

  it('getKeyCount', () => {
    expect(getKeyCount({ keys: 2, knobs: 3 })).toBe(2 + 3 * 3);
  });

  describe('findKnobAction', () => {
    it.each([
      ['Left', 0],
      ['Click', 1],
      ['Right', 2],
      ['Xxx', undefined],
    ])('%s', (actionName, value) => {
      const action = findKnobAction(actionName)!;
      expect(action).toBe(value);
    });
  });

  describe('getKnobByKeyId', () => {
    it.each([[1], [2], [3]])('Key:%d', (keyId) => {
      const info = { keys: 3, knobs: 2 };
      expect(getKnobByKeyId(info, keyId)).toBe(undefined);
    });

    it.each([
      [1, 'Left', 4],
      [1, 'Click', 5],
      [1, 'Right', 6],
      [2, 'Left', 7],
      [2, 'Click', 8],
      [2, 'Right', 9],
    ])('Knob:%d,%s', (knobId, actionName, keyId) => {
      const info = { keys: 3, knobs: 2 };
      const action = findKnobAction(actionName)!;
      expect(getKeyIdForKnob(info, knobId, action)).toBe(keyId);
      expect(getKnobByKeyId(info, keyId)).toEqual({ knobId, knobAction: actionName });
    });
  });
});
