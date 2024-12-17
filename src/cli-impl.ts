import { writeFile } from 'node:fs/promises';

import { Command, CommanderError, Option } from 'commander';
import stringify from 'json-stringify-pretty-compact';
import { flatMap, isString, snakeCase } from 'lodash-es';
import { readPackageSync } from 'read-pkg';

import { createKeyMapConsumer, createKeyMapKeys, createKeyMapMouse, defaultKeypadQuery, findKeypadDevices } from './api';
import { findKeyAction, fromCharacter, key } from './key-action';
import { formatKeyMapWithId } from './key-map';
import { withKeypad } from './keypad';
import { KnobActions, LedColor, LedMode, ModKey, applyModKey, createModKey, findConsumerAction, findKnobAction, findLedColor, findLedMode, findMouseAction, getKeyCount, getKeyIdForKnob, mouse } from './types';
import { dbg } from './utils';

import type { KeyMap, KeyMapWithId } from './api';
import type { KeypadTask } from './keypad';
import type { ConsumerAction, KeyAction, KeypadInfo, MouseAction } from './types';

// SECTION Errors

/**
 * Represents an error that occurs during configuration or settings validation.
 */
export class ConfigurationError extends Error {
  constructor(message: string, readonly lines: string[] = []) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// !SECTION

// SECTION KeyMap from KeyDef

/**
 * Converts a string of text into an array of KeyAction objects.
 */
export function createKeyActionsFromText(text: string): KeyAction[] {
  return text.split('').map((c, i) => {
    const keyAction = fromCharacter(c);
    if (keyAction == null) {
      throw new ConfigurationError(`cannot convert character '${c}' at index ${i} into a valid KeyAction. Full text: ${text}`);
    }
    return keyAction;
  });
}

export type ActionDef = string | KeyAction | KeyAction[] | ConsumerAction | MouseAction | KeyMap;
export type NullableActionDef = ActionDef | null | undefined;

/**
 * Type guard to check if an ActionDef is a KeyAction.
 */
export function isActionDefOfKeyAction(keyDef: ActionDef): keyDef is KeyAction {
  return (keyDef as any as KeyAction).keyCode != null;
}

/**
 * Type guard to check if an ActionDef is a ConsumerAction.
 */
export function isActionDefOfConsumerAction(keyDef: ActionDef): keyDef is ConsumerAction {
  return (keyDef as any as ConsumerAction).id != null;
}

/**
 * Type guard to check if an ActionDef is a KeyMap.
 */
export function isActionDefOfKeyMap(keyDef: ActionDef): keyDef is KeyMap {
  return (keyDef as any as KeyMap).type != null;
}

/**
 * Creates a KeyMap from an ActionDef.
 */
export function createKeyMapFromActionDef(def: ActionDef): KeyMap {
  if (isString(def)) {
    return createKeyMapKeys(createKeyActionsFromText(def));
  }
  if (Array.isArray(def)) {
    return createKeyMapKeys(def);
  }
  if (isActionDefOfKeyAction(def)) {
    return createKeyMapKeys([def]);
  }
  if (isActionDefOfConsumerAction(def)) {
    return createKeyMapConsumer(def);
  }
  if (isActionDefOfKeyMap(def)) {
    return def;
  }

  // an ActionDef is a MouseAction.
  return createKeyMapMouse(def);
}

/**
 * Creates a list of KeyMapWithId objects from a table of nullable ActionDefs.
 */
export function createKeyMaps(actionDefTable: NullableActionDef[][]): KeyMapWithId[] {
  return flatMap(actionDefTable.map((actionDefs, l) => {
    return actionDefs.map((actionDef, k) => {
      if (actionDef == null) {
        return undefined;
      }
      const keyMap = createKeyMapFromActionDef(actionDef);
      return { layerId: l + 1, keyId: k + 1, keyMap };
    }).filter((i) => i != null);
  }));
}

/**
 * Parses a string representing a key or mouse action and returns the corresponding action.
 * The string can include modifier keys (like Shift, Ctrl) and a key or mouse action.
 */
export function parseActionFromText(text: string): MouseAction | KeyAction | ConsumerAction {
  if (text.length === 0) {
    throw new ConfigurationError('cannot process the action string. The string cannot be empty');
  }
  const names = text.split('+');

  const name = names.pop()!;
  const modKey = createModKey(names);
  if (modKey == null) {
    throw new ConfigurationError(`cannot parse modifier keys from: '${text}'`);
  }

  const keyCode = findKeyAction(name);
  if (keyCode != null) {
    return applyModKey(keyCode, modKey);
  }

  const mouseKey = findMouseAction(name);
  if (mouseKey != null) {
    return applyModKey(mouseKey, modKey);
  }

  const consumerAction = findConsumerAction(name);
  if (consumerAction && modKey === 0) {
    return consumerAction;
  }

  throw new ConfigurationError(`cannot resolve the action: '${name}' is unknown`);
}

/**
 * Parses a string representing a series of key or mouse actions, and returns a KeyMap with these actions.
 * The string can contain multiple actions separated by spaces.
 */
export function parseKeyMapFromKeyText(text: string): KeyMap {
  const keyActions: KeyAction[] = [];
  const consumerActions: ConsumerAction[] = [];
  const mouseActions: MouseAction[] = [];

  const actionTexts = text.split(/\s+/);
  actionTexts.forEach((actionText) => {
    const action = parseActionFromText(actionText);
    if (isActionDefOfKeyAction(action)) {
      keyActions.push(action);
    } else if (isActionDefOfConsumerAction(action)) {
      consumerActions.push(action);
    } else {
      mouseActions.push(action);
    }
  });

  if (keyActions.length) {
    if (mouseActions.length || consumerActions.length) {
      throw new ConfigurationError('cannot set conflicting actions');
    }
    return createKeyMapKeys(keyActions);
  }

  if (consumerActions.length) {
    if (mouseActions.length) {
      throw new ConfigurationError('cannot set conflicting actions');
    }
    if (consumerActions.length > 1) {
      throw new ConfigurationError('cannot process the key map. Only one consumer action is allowed');
    }
    return createKeyMapConsumer(consumerActions[0]);
  }

  if (mouseActions.length > 1) {
    throw new ConfigurationError('cannot process the key map. Only one mouse action is allowed');
  }

  return createKeyMapMouse(mouseActions[0]);
}

/**
 * Creates a KeyMap from a text string representing keys or mouse actions.
 * If the text starts with '@', it assumes the text represents a list of key actions.
 * Otherwise, it parses the text into key or mouse actions.
 */
export function createKeyMapFromText(text: string): KeyMap {
  if (text.startsWith('@')) {
    return createKeyMapKeys(createKeyActionsFromText(text.substring(1)));
  }
  return parseKeyMapFromKeyText(text);
}

// !SECTION

// SECTION commander utils

/**
 * Creates a function to parse and validate an integer argument for a given name.
 */
export function createParseArgInt(flags: string) {
  return function parseArgInt(value: string) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      throw new ConfigurationError(`option '${flags}' argument '${value}' is invalid. It must be a valid integer`);
    }
    return parsed;
  };
}

export function newCommand() {
  const pkg = readPackageSync();
  const command = new Command();
  command
    .name(pkg.name)
    .version(pkg.version)
    .description(pkg.description || '')
    .showHelpAfterError()
    .exitOverride();
  return command;
}

export function newOption(flags: string, description: string, required?: boolean) {
  const option = new Option(flags, description);
  if (required) {
    option.makeOptionMandatory();
  }
  const env = snakeCase(`KEYPAD_${option.name()}`).toUpperCase();
  option.env(env);
  return option;
}

export function newOptionInt(flags: string, description: string, required?: boolean) {
  const option = newOption(flags, description, required);
  option.argParser(createParseArgInt(flags));
  return option;
}

export function newOptionRecord<T>(flags: string, description: string, record: Record<string, T>, required?: boolean) {
  const option = newOption(flags, description, required);
  option.choices(Object.keys(record));
  const { parseArg } = option;
  option.argParser((value, previous) => {
    if (parseArg != null) {
      parseArg(value, previous);
    }
    return record[value];
  });
  return option;
}

// !SECTION

// SECTION CommonOptions

export interface CommonOptions {
  path?: string;
  layers?: number;
  keys?: number;
  knobs?: number;
}

/**
 * Sets up options for a command.
 */
export function setupCommonOptions(command: Command) {
  return command
    .addOption(newOption('-P, --path <value>', 'Path to the keypad device.'))
    .addOption(newOptionInt('-L, --layers <value>', 'Number of layers.'))
    .addOption(newOptionInt('-K, --keys <value>', 'Number of keys.'))
    .addOption(newOptionInt('-N, --knobs <value>', 'Number of knobs.'));
}

// !SECTION

// SECTION executeKeypadTask

/**
 * Detects the keypad device by checking the given path or default pattern.
 * If the device cannot be found or if multiple devices are detected, an error is thrown.
 */
export function detectKeypad(path?: string) {
  const pattern = path ? { path } : defaultKeypadQuery;
  const devices = findKeypadDevices(pattern);
  if (devices.length === 0) {
    throw new ConfigurationError('cannot find the keypad device');
  }

  if (devices.length > 1) {
    const names = devices.map((i) => i.path).filter((i) => i != null);
    throw new ConfigurationError('cannot detect the keypad device. Use the \'--path\' option to specify its path', names);
  }
  return devices[0];
}

/**
 * Normalizes the keypad information.
 */
export function normalizeKeypadInfo(config: Partial<KeypadInfo>): KeypadInfo | undefined {
  if (config.keys == null && config.knobs == null) {
    return undefined;
  }
  const info: KeypadInfo = { keys: 0, knobs: 0 };
  if (config.keys != null) {
    info.keys = config.keys;
  }
  if (config.knobs != null) {
    info.knobs = config.knobs;
  }
  return info;
}

/**
 * Executes a task on the keypad device.
 */
export async function executeKeypadTask<T>(options: CommonOptions, task: KeypadTask<T>) {
  const device = detectKeypad(options.path);

  return withKeypad(device, async (keypad) => {
    if (options.layers) {
      keypad.setLayers(options.layers);
    }

    const info = normalizeKeypadInfo(options);
    if (info != null) {
      keypad.setInfo(info);
    } else {
      await keypad.readInfo();
    }

    return task(keypad);
  });
}

export interface RunCommandDef {
  setup(command: Command): Command;
  run(...args: any[]): Promise<void>;
}

/**
 * Initializes and runs commands based on the provided setup definitions.
 */
export function runCommand(def: RunCommandDef[], argv: string[]) {
  // Initialize the program with package metadata
  const program = newCommand();

  // Track the currently parsed command using the preSubcommand hook
  let command = program;
  program.hook('preSubcommand', (_, actionCommand) => {
    command = actionCommand;
  });

  // Handle errors globally
  const handleError = (e: unknown) => {
    if (e instanceof CommanderError) {
      dbg(`handleError:${e.code}`);
    } else if (e instanceof ConfigurationError) {
      // Display help for configuration errors
      console.error(`error: ${e.message}`);
      console.error();
      command.outputHelp({ error: true });
    } else {
      console.error(e);
    }
    process.exit(1);
  };

  // Register all commands
  def.forEach(({ setup, run }) => {
    setup(program)
      .action((...args: unknown[]) => run(...args).catch(handleError));
  });

  // Execute the commands
  try {
    program.parse(argv);
  } catch (e) {
    handleError(e);
  }
}

// !SECTION

// SECTION init

/**
 * Initializes the keypad with the given options.
 */
async function init(options: CommonOptions) {
  executeKeypadTask(options, async (keypad) => {
    const keyMapTable = await keypad.readKeyMapTable();
    const data = {
      device: keypad.device, info: keypad.info, layers: keypad.layers, keyMapTable,
    };
    keyMapTable.forEach((keyMapList, l) => {
      keyMapList.forEach((keyMap, k) => {
        const text = formatKeyMapWithId(keypad.info, { layerId: l + 1, keyId: k + 1, keyMap });
        console.log(text);
      });
    });
    await writeFile('keypad.json', stringify(data, { maxLength: 120 }));
  });
}

// !SECTION

// SECTION SetKeyMapOptions

export interface SetKeyMapOptions extends CommonOptions {
  layerId: number;
  keyId?: number;
  knobId?: number;
  knobAction?: string;
}

/**
 * Generates help text for the `setKeyMap`.
 */
export function helpSetKeyMap() {
  return (`
The <keys> can be specified in the following formats:
- A string starting with '@', e.g., '@HELLO!'.
- A format like 'A', 'Ctrl+A'.

For modifier keys such as:
  ${Object.keys(ModKey).join(', ')}.

For key actions such as:
  ${Object.keys(key).join(', ')}.

For mouse actions such as:
  ${Object.keys(mouse).join(', ')}.
`);
}

/**
 * Sets up command options for the `setKeyMap`.
 *
 * @param command - The command object to which the options will be added.
 * @returns The modified command object with the `setKeyMap` options.
 */
export function setupSetKeyMapOptions(command: Command) {
  return setupCommonOptions(command)
    .addOption(newOptionInt('-l, --layer-id <value>', 'ID of the layer.').default(1))
    .addOption(newOptionInt('-k, --key-id <value>', 'ID of keys.'))
    .addOption(newOptionInt('-n, --knob-id <value>', 'ID of the knob.'))
    .addOption(newOptionRecord('-a, --knob-action <value>', 'Knob action: Left, Right Click.', KnobActions))
    .addHelpText('after', helpSetKeyMap);
}
// !SECTION

// SECTION setKeyMap

/**
 * Determines the key ID based on the provided options.
 */
export function resolveKeyId(info: KeypadInfo, options: Pick<SetKeyMapOptions, 'keyId' | 'knobId' | 'knobAction'>) {
  if (options.keyId != null) {
    const keyCount = getKeyCount(info);
    if (options.keyId <= 0 || options.keyId > getKeyCount(info)) {
      throw new ConfigurationError(`invalid key ID: ${options.keyId}. It must be between 1 and ${keyCount}`);
    }
    return options.keyId;
  }
  if (options.knobId == null || options.knobAction == null) {
    throw new ConfigurationError('cannot resolve the key ID. Specify either \'--key-id\' or both \'--knob-id\' and \'--knob-action\'');
  }
  const action = findKnobAction(options.knobAction);
  if (action == null) {
    throw new ConfigurationError(`cannot process the knob action: '${options.knobAction}' is invalid`);
  }
  if (options.knobId <= 0 || options.knobId > info.knobs) {
    throw new ConfigurationError(`invalid knob ID: ${options.knobId}. It must be between 1 and ${info.knobs}`);
  }
  return getKeyIdForKnob(info, options.knobId, action);
}

export function setupSetKeyMapCommand(command: Command) {
  const subCommand = command.command('map <key>').description('sets a key mapping');
  return setupSetKeyMapOptions(subCommand);
}

/**
 * Sets a key mapping for the specified layer and key or knob.
 */
export async function setKeyMap(keys: string, options: SetKeyMapOptions) {
  // NOTE Verify combinations with large values for testing purposes
  resolveKeyId({ keys: 0x100, knobs: 0x100 }, options);

  await executeKeypadTask(options, async (keypad) => {
    const keyId = resolveKeyId(keypad.info, options);
    const keyCount = keypad.getKeyCount();
    if (keyId >= keyCount) {
      throw new ConfigurationError(`cannot validate the key ID: (${keyId}). The resolved ID exceeds the total number of keys (${keyCount})`);
    }

    const keyMap = createKeyMapFromText(keys);
    await keypad.writeKeyMap({ layerId: options.layerId, keyId, keyMap });
  });
}

// !SECTION

// SECTION SetLedOptions

export interface SetLedOptions extends CommonOptions {
  layerId: number;
}

/**
 * Generates help text for the `setLed` command.
 */
export function helpSetLed() {
  return (`
The <mode> can be specified using the following value:
  ${Object.keys(LedMode).join(', ')}.

The <color> can be specified using the following value:
  ${Object.keys(LedColor).join(', ')}.
`);
}

/**
 * Sets up command options for the `setLed`.
 *
 * @param command - The command object to which the options will be added.
 * @returns The modified command object with the `setLed` options.
 */
export function setupSetLedOptions(command: Command) {
  return setupCommonOptions(command)
    .addOption(newOptionInt('-l, --layer-id <value]', 'ID of the layer.'))
    .addHelpText('after', helpSetLed);
}

// !SECTION

// SECTION setLed

/**
 * Resolves the LED parameters based on the given mode and color.
 */
export function resolveWriteLedParams(layerId: number, ledMode: string, ledColor: string) {
  const ledModeId = findLedMode(ledMode);
  if (ledModeId == null) {
    throw new ConfigurationError(`invalid LED mode: '${ledMode}'`);
  }
  const ledColorId = findLedColor(ledColor);
  if (ledColorId == null) {
    throw new ConfigurationError(`invalid LED color: '${ledColor}'`);
  }
  return { layerId, ledModeId, ledColorId };
}

export function setupSetLedCommand(command: Command) {
  const subCommand = command.command('led <mode> <color>').description('sets LED configuration');
  return setupSetLedOptions(subCommand);
}

/**
 * Sets LED configuration for the specified layer.
 */
export async function setLed(ledMode: string, ledColor: string, options: SetLedOptions) {
  const param = resolveWriteLedParams(options.layerId, ledMode, ledColor);
  await executeKeypadTask(options, async (keypad) => {
    await keypad.writeLed(param);
  });
}

// !SECTION

// SECTION setDelayTime

export function setupSetDelayTimeCommand(command: Command) {
  const subCommand = command.command('delay <time>').description('sets a delay time');
  return setupCommonOptions(subCommand);
}

/**
 * Sets a delay time for the specified layer.
 */
export async function setDelayTime(time: string, options: CommonOptions) {
  const delayTimeMs = createParseArgInt('time')(time);
  await executeKeypadTask(options, async (keypad) => {
    await keypad.writeDelayTime((delayTimeMs));
  });
}

// !SECTION

// SECTION cliMain
/**
 * Main entry point for the command line interface.
 */
export function cliMain(argv: string[]) {
  runCommand([{
    setup: (command) => setupCommonOptions(command.command('init')),
    run: init,
  }, {
    setup: setupSetKeyMapCommand,
    run: setKeyMap,
  }, {
    setup: setupSetLedCommand,
    run: setLed,
  }, {
    setup: setupSetDelayTimeCommand,
    run: setDelayTime,
  }], argv);
}

// !SECTION

// SECTION DefineKeyMapOptions

export interface DefineKeyMapOptions extends CommonOptions {
  apply?: boolean;
}

/**
 * Sets up the command options for "defineKeyMap".
 */
export function setupDefineKeyMapOptions(command: Command) {
  return setupCommonOptions(command)
    .addOption(newOption('-A, --apply', 'applies the specified key definition'));
}

// !SECTION

// SECTION defineKeyMap

/**
 * Validates the key definition table for a given number of layers and keys per layer.
 * Ensures that the key definitions are within the acceptable range and properly structured.
 */
export function validateKeyDefTable(keyDefTable: NullableActionDef[][], layers: number, keyCount: number) {
  if (keyDefTable.length <= 0 || keyDefTable.length > layers) {
    throw new ConfigurationError(`cannot process the key definition table. It must contain between 1 and ${layers} layers. Found: ${keyDefTable.length}`);
  }

  // eslint-disable-next-line no-restricted-syntax
  keyDefTable.forEach((keyDefs, i) => {
    if (keyDefs.length > keyCount) {
      throw new ConfigurationError(`cannot validate layer ${i}. The number of keys exceeds the maximum allowed (${keyCount}). Found: ${keyDefs.length}`);
    }
  });
}

/**
 * Defines key maps based on the provided definitions and options.
 */
export async function defineKeyMapWithOptions(keyDefTable: NullableActionDef[][], options: DefineKeyMapOptions) {
  return executeKeypadTask(options, async (keypad) => {
    validateKeyDefTable(keyDefTable, keypad.layers, keypad.getKeyCount());
    const keyMaps = createKeyMaps(keyDefTable);
    // eslint-disable-next-line no-restricted-syntax
    for (const KeyMapWithId of keyMaps) {
      console.log(formatKeyMapWithId(keypad.info, KeyMapWithId));
      if (options.apply) {
        keypad.writeKeyMap(KeyMapWithId);
      }
    }
    if (!options.apply) {
      console.log("Use '--apply' to proceed with applying the changes");
    }
  });
}

/**
 * Main entry point for defining key maps.
 */
export async function defineKeyMap(keyDef: NullableActionDef[][]) {
  const program = new Command();
  setupDefineKeyMapOptions(program)
    .action((options) => defineKeyMapWithOptions(keyDef, options).catch((e) => console.error(e)));
  program.parse();
}

// !SECTION
