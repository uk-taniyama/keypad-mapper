import { isEqual } from 'lodash-es';

import { dict, key } from './key-action-record';
import { ModKey, Shift, combineModKeyAndActionName, createKeyAction, isShift } from './types';

import type { KeyAction } from './types';

export { dict, key };

// SECTION KeyAction
/**
 * Finds the KeyAction corresponding to the given key action name.
 */
export function findKeyAction(name: string): KeyAction | undefined {
  return (key as Record<string, KeyAction | undefined>)[name];
}

/**
 * Finds the key action name corresponding to the given KeyAction.
 */
export function findKeyActionName(keyAction: KeyAction): string | undefined {
  return Object.entries(key).find(([, value]) => isEqual(value, keyAction))?.[0];
}

/**
 * Formats a KeyAction into a human-readable string representation.
 */
export function formatKeyAction(keyAction: KeyAction): string | undefined {
  if (isShift(keyAction)) {
    const name = findKeyActionName(Shift(createKeyAction(keyAction.keyCode)));
    if (name) {
      return combineModKeyAndActionName(keyAction.modKey - ModKey.Shift, name);
    }
  }

  const name = findKeyActionName(createKeyAction(keyAction.keyCode));
  if (name) {
    return combineModKeyAndActionName(keyAction.modKey, name);
  }

  return JSON.stringify(keyAction);
}

/**
 * Converts a KeyAction into its corresponding character representation, if available.
 */
export function toCharacter(keyAction: KeyAction): string | undefined {
  // eslint-disable-next-line no-restricted-syntax
  for (const [name, value] of Object.entries(dict)) {
    if (isEqual(keyAction, value)) {
      return name;
    }
  }
  return undefined;
}

/**
 * Finds the KeyAction corresponding to a given character.
 */
export function fromCharacter(c: string): KeyAction | undefined {
  return dict[c];
}

/**
 * Converts an array of KeyAction into a string representation, if available.
 */
export function toString(keyActions: KeyAction[]): string | undefined {
  const array: string[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const keyAction of keyActions) {
    const c = toCharacter(keyAction);
    if (c == null) {
      return undefined;
    }
    array.push(c);
  }
  return array.join('');
}

/**
 * Formats an array of KeyAction into a human-readable string representation.
 */
export function formatKeyActions(keyActions: KeyAction[]): string {
  const str = toString(keyActions);
  if (str != null) {
    return JSON.stringify(str);
  }
  return keyActions.map((k) => formatKeyAction(k)).join(' ');
}

// !SECTION
