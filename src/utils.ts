import Debug from 'debug';

export const dbg = Debug('keypad-mapper');

/**
 * Converts a number to an 8-bit signed integer (Int8).
 *
 * This function clamps the input value to fit within the range of an 8-bit signed integer (-128 to 127).
 * Positive numbers are capped at 127, and negative numbers are adjusted to fit within the valid range.
 */
export function toInt8(n: number) {
  if (n >= 0) {
    return n <= 0x7F ? n : 0x7F;
  }
  const d = 0x100 + n;
  if (d >= 0x80 && d <= 0xFF) {
    return d;
  }
  return 0x80;
}

/**
 * Decodes a number as an 8-bit signed integer (Int8).
 */
export function fromInt8(n: number) {
  const buf = Buffer.alloc(1);
  // eslint-disable-next-line no-bitwise
  buf.writeUInt8(n & 0xFF);
  return buf.readInt8();
}

/**
 * Splits a 16-bit unsigned integer into two 8-bit values (little-endian format).
 *
 * @function splitUInt16LE
 * @param {number} v - The 16-bit unsigned integer to be split.
 * @returns {[number, number]} An array of two 8-bit values: [leastSignificantByte, mostSignificantByte].
 */
export function splitUInt16LE(v: number) {
  // eslint-disable-next-line no-bitwise
  const b = (v >> 8) & 0xFF;
  // eslint-disable-next-line no-bitwise
  const l = v & 0xFF;
  return [l, b];
}
