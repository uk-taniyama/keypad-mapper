import { ModKey } from '../types';

import { createKeyRecord } from './generate-key-actions';

it('createKeyRecord', () => {
  const source = createKeyRecord([
    { keyCode: 0x01, dictName: 'a', dictNameS: 'A' },
    { keyCode: 0x02, keyName: ['X'] },
    { keyCode: 0x03, keyNameS: ['Y'] },
  ]);
  expect(source).toEqual({
    dictRecord: {
      a: { keyCode: 0x01, modKey: 0 },
      A: { keyCode: 0x01, modKey: ModKey.Shift },
    },
    keyRecord: {
      X: { keyCode: 0x02, modKey: 0 },
      Y: { keyCode: 0x03, modKey: ModKey.Shift },
    },
  });
});
