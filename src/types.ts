import { isEqual } from 'lodash-es';

import { fromInt8, toInt8 } from './utils';

export const ModKey = {
  Ctrl: 0x01,
  Shift: 0x02,
  Alt: 0x04, // option
  Gui: 0x08, // command
  RCtrl: 0x10,
  RShift: 0x20,
  RAlt: 0x40,
  RGui: 0x80,
} as const;

export interface WithModKey {
  modKey: number;
}

export interface KeyAction extends WithModKey {
  keyCode: number;
}

export interface MouseAction extends WithModKey {
  button: number;
  x: number;
  y: number;
  wheel: number;
}

export type KeyRecord = Record<string, KeyAction>;

export function applyModKey<T extends WithModKey>(action: T, modKey: number): T {
  return {
    ...action,
    // eslint-disable-next-line no-bitwise
    modKey: action.modKey | modKey,
  };
}

export function getModKeyNames(modKey: number) {
  const names: string[] = [];
  Object.entries(ModKey).forEach(([name, code]) => {
    // eslint-disable-next-line no-bitwise
    if (code & modKey) {
      names.push(name);
    }
  });
  return names;
}

export function createModKey(names: string[]) {
  let modKey = 0;
  for (let i = 0; i < names.length; i += 1) {
    const code = (ModKey as Record<string, number | undefined>)[names[i]];
    if (code == null) {
      return undefined;
    }
    // eslint-disable-next-line no-bitwise
    modKey |= code;
  }
  return modKey;
}

/**
 * Combines modifier key names and a action name into a formatted string.
 */
export function combineModKeyAndActionName(modKey: number, actionName: string): string {
  const names = getModKeyNames(modKey);
  names.push(actionName);
  return names.join('+');
}

export function createKeyAction(keyCode: number, modKey: number = 0): KeyAction { return { keyCode, modKey }; }
export function Shift<T extends WithModKey>(key: T) { return applyModKey(key, ModKey.Shift); }
export function Ctrl<T extends WithModKey>(key: T) { return applyModKey(key, ModKey.Ctrl); }
export function Alt<T extends WithModKey>(key: T) { return applyModKey(key, ModKey.Alt); }
export function Gui<T extends WithModKey>(key: T) { return applyModKey(key, ModKey.Gui); }
export function RShift<T extends WithModKey>(key: T) { return applyModKey(key, ModKey.RShift); }
export function RCtrl<T extends WithModKey>(key: T) { return applyModKey(key, ModKey.RCtrl); }
export function RAlt<T extends WithModKey>(key: T) { return applyModKey(key, ModKey.RAlt); }
export function RGui<T extends WithModKey>(key: T) { return applyModKey(key, ModKey.RGui); }

export const NoAction: KeyAction = { keyCode: 0, modKey: 0 } as const;

export function isShift(key: KeyAction) {
  // eslint-disable-next-line no-bitwise
  return !!((key.modKey & ModKey.Shift));
}

export const MouseButtonLeft = 0x01;
export const MouseButtonRight = 0x2;
export const MouseButtonMiddle = 0x04;

const emptyMouseAction: MouseAction = {
  modKey: 0, button: 0, x: 0, y: 0, wheel: 0,
};

export function Mouse(mouseAction: Partial<MouseAction>): MouseAction {
  return { ...emptyMouseAction, ...mouseAction };
}

export function Wheel(wheel: number, modKey: number = 0): MouseAction {
  return Mouse({ modKey, wheel: toInt8(wheel) });
}

export function Move(x: number, y: number) {
  return Mouse({ x: toInt8(x), y: toInt8(y) });
}

export const mouse = {
  LButton: Mouse({ button: MouseButtonLeft }),
  RButton: Mouse({ button: MouseButtonRight }),
  MButton: Mouse({ button: MouseButtonMiddle }),
  MoveDown: Move(0, 1),
  MoveUp: Move(0, -1),
  MoveRight: Move(1, 0),
  MoveLeft: Move(-1, 0),
  WheelUp: Wheel(1),
  WheelDown: Wheel(-1),
} as const satisfies Record<string, MouseAction>;

/**
 * Finds the MouseAction corresponding to the given name.
 */
export function findMouseAction(name: string) {
  return (mouse as Record<string, MouseAction | undefined>)[name];
}

/**
 * Formats a MouseAction as a movement action string.
 */
export function formatMouseActionAsMove(mouseAction: MouseAction) {
  const { x, y, ...rest } = mouseAction;
  if (Object.values(rest).find((v) => v !== 0)) {
    return undefined;
  }
  return `Move(${fromInt8(x)},${fromInt8(y)})`;
}

/**
 * Formats a MouseAction as a wheel action string.
 */
export function formatMouseActionAsWheel(mouseAction: MouseAction) {
  const { wheel, ...rest } = mouseAction;
  if (Object.values(rest).find((v) => v !== 0)) {
    return undefined;
  }
  if (wheel === 0) {
    return undefined;
  }
  return `Wheel(${fromInt8(wheel)})`;
}

/**
 * Finds the mouse action name corresponding to the given MouseAction.
 */
export function findMouseActionName(mouseAction: MouseAction) {
  return Object.entries(mouse).find(([, action]) => isEqual(mouseAction, action))?.[0];
}

/**
 * Formats a MouseAction into a human-readable string representation.
 */
export function formatMouseAction(mouseAction: MouseAction) {
  const { modKey, ...rest } = mouseAction;
  const action = { modKey: 0, ...rest };
  const actionName = findMouseActionName(action)
    || formatMouseActionAsWheel(action)
    || formatMouseActionAsMove(action)
    || JSON.stringify(action);
  return combineModKeyAndActionName(modKey, actionName);
}

// https://usb.org/sites/default/files/hut1_5.pdf#page=126

/**
 * Represents a consumer action as defined in the USB HID Usage Tables specification.
 * Each action is identified by a unique ID corresponding to a specific consumer control.
 *
 * @see https://usb.org/sites/default/files/hut1_5.pdf#page=126
 */
export interface ConsumerAction {
  id: number;
}

/**
 * Creates a new `ConsumerAction` object with the specified ID.
 *
 * @see https://usb.org/sites/default/files/hut1_5.pdf#page=126
 */
export function Consumer(id: number): ConsumerAction {
  return { id };
}

/**
 * A collection of predefined consumer actions, representing common media and control operations.
 */
export const media = {
  ScreenBrightnessUp: Consumer(0x006f),
  ScreenBrightnessDown: Consumer(0x0070),
  NextTrack: Consumer(0x00b5),
  PrevTrack: Consumer(0x00b6),
  Stop: Consumer(0x00b7),
  PlayPause: Consumer(0x00cd),
  Mute: Consumer(0x00e2),
  VolumeUp: Consumer(0x00e9),
  VolumeDown: Consumer(0x00ea),
  BassUp: Consumer(0x0152),
  BassDown: Consumer(0x0153),
  TrebleUp: Consumer(0x0154),
  TrebleDown: Consumer(0x0155),
  Multimedia: Consumer(0x0183),
  Email: Consumer(0x018a),
  Calculator: Consumer(0x0192),
  MyComputer: Consumer(0x0194),
  WWWHome: Consumer(0x0223),
  WWWPageBack: Consumer(0x0224),
  WWWPageForward: Consumer(0x0225),
  WWWPageRefresh: Consumer(0x0227),
} as const satisfies Record<string, ConsumerAction>;

/**
 * Finds the ConsumerAction corresponding to the given name.
 */
export function findConsumerAction(name: string) {
  return (media as Record<string, ConsumerAction | undefined>)[name];
}

/**
 * Finds the consumer action name corresponding to the given ConsumerAction.
 */
export function findConsumerActionName(consumerAction: ConsumerAction) {
  return Object.entries(media).find(([, action]) => isEqual(consumerAction, action))?.[0];
}

/**
 * Formats a MouseAction into a human-readable string representation.
 */
export function formatConsumerAction(consumerAction: ConsumerAction) {
  return findConsumerActionName(consumerAction)
    || JSON.stringify(consumerAction);
}

export interface KeypadInfo {
  keys: number;
  knobs: number;
}

export const KnobActions = {
  Left: 0,
  Click: 1,
  Right: 2,
} as const;

export type KnobActionType = typeof KnobActions[keyof typeof KnobActions];

/**
 * Calculates the total number of keys, including knobs, for a given keypad.
 */
export function getKeyCount(info: KeypadInfo) {
  return info.keys + 3 * info.knobs;
}

/**
 * Finds a KnobActionType by its string name.
 */
export function findKnobAction(action: string) {
  return (KnobActions as Record<string, KnobActionType | undefined>)[action];
}

/**
 * Finds the name of a knob action by its numeric value.
 */
export function findKnobActionName(action: number) {
  return Object.entries(KnobActions).find(([, value]) => value === action)?.[0];
}

/**
 * Calculates the unique key ID for a knob based on its ID and action type.
 */
export function getKeyIdForKnob(info: KeypadInfo, knobId: number, knobAction: KnobActionType) {
  return 1 + info.keys + 3 * (knobId - 1) + knobAction;
}

export interface KnobIdAndAction {
  knobId: number;
  knobAction: string;
}

/**
 * Retrieves the knob ID and its associated action based on a given key ID.
 */
export function getKnobByKeyId(info: KeypadInfo, keyId: number): KnobIdAndAction | undefined {
  if (keyId <= info.keys) {
    return undefined;
  }
  const knob = keyId - 1 - info.keys;
  const actionIndex = knob % 3;
  const knobId = 1 + (knob - actionIndex) / 3;
  const knobAction = findKnobActionName(actionIndex)!;
  return { knobId, knobAction };
}

export const LedMode = {
  None: 0,
  All: 1,
  LtRb: 2,
  RbLt: 3,
  Single: 4,
  White: 5,
} as const;

export function findLedMode(ledMode: string) {
  return (LedMode as Record<string, number | undefined>)[ledMode];
}

export const LedColor = {
  Red: 1,
  Orrange: 2,
  Yellow: 3,
  Green: 4,
  Cyan: 5,
  Blue: 6,
  Purple: 7,
} as const;

export function findLedColor(ledColor: string) {
  return (LedColor as Record<string, number | undefined>)[ledColor];
}
