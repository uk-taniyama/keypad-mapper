import { writeFile } from 'fs/promises';

import stringify from 'json-stringify-pretty-compact';

import { Shift, createKeyAction } from '../types';

import type { KeyRecord } from '../types';

type KeyCodeDef = {
  /**
   * Specifies the numeric key code.
   * Example: The key code for "A" is 65, and for "B" is 66.
   */
  keyCode: number;

  /**
   * An array of names associated with the key.
   * For example, for the key code 65, it could be `["a", "A"]`.
   * This is customizable by the user.
   */
  keyName?: string[];

  /**
   * An array of names for the key when used with the Shift key.
   * For example, for Shift + "1", it could be `["!"]`.
   * This is customizable by the user.
   */
  keyNameS?: string[];

  /**
   * The character produced when the key is pressed.
   * Example: For a letter key, this is usually the lowercase character.
   */
  dictName?: string;

  /**
   * The character produced when the key is pressed with the Shift key.
   * Example: For a letter key, this is usually the uppercase character.
   */
  dictNameS?: string;
};

function createKeyCodeDefs() {
  const keyCodeDefs: KeyCodeDef[] = [];

  keyCodeDefs.push({ keyCode: 0, keyName: ['NULL'] });

  // for alphabet
  const a = 'a'.charCodeAt(0);
  for (let c = a; c <= 'z'.charCodeAt(0); c += 1) {
    const keyCode = c - a + 0x04;
    const name = String.fromCharCode(c);
    const shift = name.toUpperCase();
    keyCodeDefs.push({
      keyCode, dictName: name, dictNameS: shift, keyName: [shift],
    });
  }

  // for standard key
  const stdKeys: [string | 0, string | 0, string?, string?][] = [
    ['1', '!', '1', 'Excl'],
    ['2', '@', '2', 'At'],
    ['3', '#', '3', 'Hash'],
    ['4', '$', '4', 'Dol'],
    ['5', '%', '5', 'Per'],
    ['6', '^', '6', 'Caret'],
    ['7', '&', '7', 'Amp'],
    ['8', '*', '8', 'Aster'],
    ['9', '(', '9', 'LPar'],
    ['0', ')', '0', 'RPar'],
    ['\n', 0, 'Enter'],
    [0, 0, 'Esc'],
    [0, 0, 'BkSpc'],
    ['\t', 0, 'Tab'],
    [' ', 0, 'Space'],
    ['-', '_', 'Minus'],
    ['=', '+', 'Equal'],
    ['[', '{', 'LBra', 'LCBra'],
    [']', '}', 'RBra', 'RCBra'],
    ['\\', '|', 'BkSla', 'Pipe'],
    [0, 0], // Non-Us Hash
    [';', ':', 'Semi', 'Colon'],
    ["'", '"', 'Quote', 'DQ'],
    ['`', '~', 'Grave', 'Tilde'],
    [',', '<', 'Comma', 'LT'],
    ['.', '>', 'Dot', 'RT'],
    ['/', '?', 'Slash', 'Que'],
    [0, 0, 'Caps'],
    [0, 0, 'F1'],
    [0, 0, 'F2'],
    [0, 0, 'F3'],
    [0, 0, 'F4'],
    [0, 0, 'F5'],
    [0, 0, 'F6'],
    [0, 0, 'F7'],
    [0, 0, 'F8'],
    [0, 0, 'F9'],
    [0, 0, 'F10'],
    [0, 0, 'F11'],
    [0, 0, 'F12'],
    [0, 0, 'PrSc'],
    [0, 0, 'ScLk'],
    [0, 0, 'Pause'],
    [0, 0, 'Ins'],
    [0, 0, 'Home'],
    [0, 0, 'PgUp'],
    [0, 0, 'Del'],
    [0, 0, 'End'],
    [0, 0, 'PgDn'],
    [0, 0, 'Right'],
    [0, 0, 'Left'],
    [0, 0, 'Down'],
    [0, 0, 'Up'],
    [0, 0, 'NumLk'],
    [0, 0, 'PadSlash'],
    [0, 0, 'PadAster'],
    [0, 0, 'PadMinus'],
    [0, 0, 'PadPlus'],
    [0, 0, 'PadEnter'],
    [0, 0, 'Pad1', 'PadEnd'],
    [0, 0, 'Pad2', 'PadDown'],
    [0, 0, 'Pad3', 'PadPgDn'],
    [0, 0, 'Pad4', 'PadLeft'],
    [0, 0, 'Pad5'],
    [0, 0, 'Pad6', 'PadRight'],
    [0, 0, 'Pad7', 'PadHome'],
    [0, 0, 'Pad8', 'PadUp'],
    [0, 0, 'Pad9', 'PadPgUp'],
    [0, 0, 'Pad0', 'PadIns'],
    [0, 0, 'PadDot', 'PadDel'],
    [0, 0], // Non-US BashSlash
    [0, 0, 'App'],
    [0, 0, 'Power'],
    [0, 0, 'PadEqual'],
    [0, 0, 'F13'],
    [0, 0, 'F14'],
    [0, 0, 'F15'],
    [0, 0, 'F16'],
    [0, 0, 'F17'],
    [0, 0, 'F18'],
    [0, 0, 'F19'],
    [0, 0, 'F20'],
    [0, 0, 'F21'],
    [0, 0, 'F22'],
    [0, 0, 'F23'],
    [0, 0, 'F24'],
  ];
  for (let i = 0; i < stdKeys.length; i += 1) {
    const keyCode = i + 0x1E;
    const stdKey = stdKeys[i];
    const name = stdKey[0] || undefined;
    const shift = stdKey[1] || undefined;
    const aliasName = stdKey[2] ? [stdKey[2]] : undefined;
    const aliasShift = stdKey[3] ? [stdKey[3]] : undefined;
    keyCodeDefs.push({
      keyCode, dictName: name, dictNameS: shift, keyName: aliasName, keyNameS: aliasShift,
    });
  }

  // for meta keys
  const metaKeys = [
    'LCtrl',
    'LShift',
    'LAlt',
    'LGui',
    'RCtrl',
    'RShift',
    'RAlt',
    'RGui',
  ];
  for (let i = 0; i < metaKeys.length; i += 1) {
    keyCodeDefs.push({ keyCode: i + 0xE0, keyName: [metaKeys[i]] });
  }
  return keyCodeDefs;
}

export function createKeyRecord(keyCodeDefs: KeyCodeDef[]) {
  const keyRecord: KeyRecord = {};
  const dictRecord: KeyRecord = {};
  keyCodeDefs.forEach(({
    keyCode, dictName, dictNameS, keyName, keyNameS,
  }) => {
    const key = createKeyAction(keyCode);
    const shiftKey = Shift(key);
    if (dictName) {
      dictRecord[dictName] = key;
    }
    if (dictNameS) {
      dictRecord[dictNameS] = shiftKey;
    }
    if (keyName) {
      keyName.forEach((i) => { keyRecord[i] = key; });
    }
    if (keyNameS) {
      keyNameS.forEach((i) => { keyRecord[i] = shiftKey; });
    }
  });
  return { keyRecord, dictRecord };
}

export function generateSource(keyCodeDefs: KeyCodeDef[]) {
  const { keyRecord, dictRecord } = createKeyRecord(keyCodeDefs);
  const texts = [];
  texts.push(`
/* eslint-disable */
// NOTE This file was automatically generated. Do not edit directly.
import type { KeyAction, KeyRecord } from './types';

export const key = {
${Object.entries(keyRecord).map(([k, v]) => `  '${k}':${JSON.stringify(v)} as KeyAction,`).join('\n')}
} as const;
export const dict: KeyRecord = ${stringify(dictRecord, { maxLength: 120 })};
`.trim());
  texts.push('');
  return texts.join('\n');
}

export async function generate() {
  const defs = createKeyCodeDefs();
  const source = generateSource(defs);
  const path = 'src/key-action-record.ts';
  console.log('generate', path);
  return writeFile(path, source);
}
