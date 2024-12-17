import { fromInt8, splitUInt16LE, toInt8 } from './utils';

describe('utils', () => {
  it.each([
    [0, 0, false],
    [1, 1, false],
    [0x7F, 0x7F, false],
    [0x80, 0x7F, true],
    [-1, 0xFF, false],
    [-128, 0x80, false],
    [-129, 0x80, true],
  ])('toInt8:%d->%d', (num, int8, isOver) => {
    expect(toInt8(num)).toBe(int8);
    if (!isOver) {
      expect(fromInt8(int8)).toBe(num);
    }
  });

  it('splitUInt16LE', () => {
    expect(splitUInt16LE(0x1234)).toEqual([0x34, 0x12]);
  });
});
