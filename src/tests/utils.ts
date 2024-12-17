import { isString } from 'lodash-es';

import { REQUEST_SIZE } from '../api';

import type { Mock } from 'vitest';

export function toBuffer(strOrArray: string | number[]) {
  if (isString(strOrArray)) {
    return Buffer.from(strOrArray.replace(/[^0-9a-zA-Z]/g, ''), 'hex');
  }
  return Buffer.from(strOrArray);
}

export function toArray(strOrArray: string | number[]) {
  if (isString(strOrArray)) {
    return [...toBuffer(strOrArray)];
  }
  return strOrArray;
}

export function padArray(array: number[]): number[] {
  return [...array, ...Array(REQUEST_SIZE - array.length).fill(0)];
}

export function toPaddedArray(strOrArray: string | number[]): number[] {
  return padArray(toArray(strOrArray));
}

export function toPaddedBuffer(strOrArray: string | number[]): Buffer {
  return Buffer.from(padArray(toArray(strOrArray)));
}

export function setupSyncMock<T>(mockFn: unknown, ...values: (T | Error)[]) {
  if (!vi.isMockFunction(mockFn)) {
    throw new Error('Not a Mock Function.');
  }
  values.forEach((value) => {
    if (value instanceof Error) {
      mockFn.mockImplementationOnce(() => { throw value; });
    } else {
      mockFn.mockReturnValueOnce(value);
    }
  });
}

export function setupAsyncMock<T>(mockFn: unknown, ...values: (T | Error)[]) {
  if (!vi.isMockFunction(mockFn)) {
    throw new Error('Not a Mock Function.');
  }
  values.forEach((value) => {
    if (value instanceof Error) {
      mockFn.mockRejectedValueOnce(value);
    } else {
      mockFn.mockResolvedValueOnce(value);
    }
  });
}

export function createSetupSyncMock<T>(mockFn: Mock) {
  return (...values: (T | Error)[]) => setupSyncMock<T>(mockFn, ...values);
}

export function createSetupAsyncMock<T>(mockFn: Mock) {
  return (...values: (T | Error)[]) => setupAsyncMock<T>(mockFn, ...values);
}
