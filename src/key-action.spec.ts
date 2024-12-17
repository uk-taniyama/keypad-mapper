import { findKeyAction, formatKeyAction, fromCharacter, key, toCharacter } from './key-action';
import { Ctrl, Shift, createKeyAction, isShift } from './types';

describe('key-actions', () => {
  it('findKeyAction', () => {
    expect(findKeyAction('F11')).toEqual(key.F11);
    expect(findKeyAction('XXX')).toBeUndefined();
  });

  it.each([
    ['A', key.A, 'a', false],
    ['F11', key.F11, undefined, false],
    ['Ctrl+F11', Ctrl(key.F11), undefined, false],
    ['Ctrl+Shift+F11', Shift(Ctrl(key.F11)), undefined, true],
    ['Tilde', key.Tilde, '~', true],
    ['{"keyCode":255,"modKey":0}', createKeyAction(0xFF, 0), undefined, false],
  ])('toCharacter,formatKeyAction:%s', (text, keyAction, name, shiftted) => {
    expect(formatKeyAction(keyAction)).toEqual(text);

    expect(toCharacter(keyAction)).toEqual(name);
    if (name != null) {
      expect(fromCharacter(name)).toEqual(keyAction);
    }
    expect(isShift(keyAction)).toBe(shiftted);
  });
});
