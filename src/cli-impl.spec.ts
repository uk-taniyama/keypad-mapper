import { findHidDevices } from 'with-hid';

import { createKeyMapConsumer, createKeyMapKeys, createKeyMapMouse } from './api';
import { ConfigurationError, createKeyActionsFromText, createKeyMapFromActionDef, createKeyMapFromText, createKeyMaps, createParseArgInt, detectKeypad, newCommand, newOption, newOptionInt, normalizeKeypadInfo, parseActionFromText, parseKeyMapFromKeyText, resolveKeyId, runCommand, setupCommonOptions, setupSetKeyMapOptions } from './cli-impl';
import { key } from './key-action';
import { setupSyncMock } from './tests/utils';
import { Ctrl, KnobActions, Shift, media, mouse } from './types';

import type { KeyMap } from './api';
import type { ActionDef } from './cli-impl';
import type { Command } from 'commander';
import type { HidDevice } from 'with-hid';

describe('keyMap from keyDef', () => {
  describe('createKeyActionsFromText', () => {
    it('Error', () => {
      expect.hasAssertions();
      try {
        createKeyActionsFromText('日本語はないので落ちる');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigurationError);
        expect(`${e}`).toMatchSnapshot();
      }
    });
  });

  describe('createKeyMapFromActionDef', () => {
    it.each<[ActionDef, KeyMap]>([
      ['Hello!', createKeyMapKeys([Shift(key.H), key.E, key.L, key.L, key.O, key.Excl])],
      [key.A, createKeyMapKeys([key.A])],
      [Ctrl(key.A), createKeyMapKeys([Ctrl(key.A)])],
      [[key.A, key.B], createKeyMapKeys([key.A, key.B])],
      [media.MyComputer, createKeyMapConsumer(media.MyComputer)],
      [mouse.LButton, createKeyMapMouse(mouse.LButton)],
      [createKeyMapMouse(mouse.LButton), createKeyMapMouse(mouse.LButton)],
    ])('%s', (def, expected) => {
      const keyMap = createKeyMapFromActionDef(def);
      expect(keyMap).toEqual(expected);
    });
  });

  it('createKeyMaps', () => {
    const keyMaps = createKeyMaps([
      [key.A, null, undefined, key.B],
    ]);
    expect(keyMaps).toEqual([
      { layerId: 1, keyId: 1, keyMap: createKeyMapKeys([key.A]) },
      { layerId: 1, keyId: 4, keyMap: createKeyMapKeys([key.B]) },
    ]);
  });

  describe('parseActionFromText', () => {
    it.each([
      ['A', key.A],
      ['Ctrl+A', Ctrl(key.A)],
      ['LButton', mouse.LButton],
    ])('Success:%s', (text, expected) => {
      const actual = parseActionFromText(text);
      expect(actual).toEqual(expected);
    });

    it.each([
      [''],
      ['Xxx'],
      ['+Ctrl+X'],
      ['Ctrl'],
    ])('Error:%s', (text) => {
      expect.hasAssertions();
      try {
        parseActionFromText(text);
      } catch (e) {
        expect(e).instanceOf(ConfigurationError);
        expect(`${e}`).toMatchSnapshot();
      }
    });
  });

  describe('parseKeyMapFromKeyText', () => {
    it.each([
      ['A', createKeyMapKeys([key.A])],
      ['A B', createKeyMapKeys([key.A, key.B])],
      ['LButton', createKeyMapMouse(mouse.LButton)],
      ['Ctrl+LButton', createKeyMapMouse(Ctrl(mouse.LButton))],
      ['MyComputer', createKeyMapConsumer(media.MyComputer)],
    ])('Success:%s', (text, expected) => {
      const actual = parseKeyMapFromKeyText(text);
      expect(actual).toEqual(expected);
    });

    it.each([
      [''],
      ['A '],
      ['LButton A'],
      ['LButton LButton'],
      ['MyComputer LButton'],
      ['MyComputer MyComputer'],
    ])('Error:%s', (text) => {
      expect.hasAssertions();
      try {
        parseKeyMapFromKeyText(text);
      } catch (e) {
        expect(e).instanceOf(ConfigurationError);
        expect(`${e}`).toMatchSnapshot();
      }
    });
  });

  describe('createKeyMapFromText', () => {
    it.each([
      ['A', createKeyMapKeys([key.A])],
      ['@A', createKeyMapKeys([Shift(key.A)])],
    ])('Success:%s', (text, expected) => {
      const actual = createKeyMapFromText(text);
      expect(actual).toEqual(expected);
    });
  });
});

describe('commander utils', () => {
  it('createParseArgInt', () => {
    const parseArgInt = createParseArgInt('name');
    expect(parseArgInt('10')).toBe(10);
    expect(() => parseArgInt('A')).toThrow(ConfigurationError);
  });

  function parse(command: Command, argv: string[]) {
    const err: string[] = [];
    const out: string[] = [];
    const output = { err, out };
    try {
      command.configureOutput({
        writeErr(str) { err.push(str); },
        writeOut(str) { out.push(str); },
      });
      command.parse(argv, { from: 'user' });
      return { data: command.opts(), output };
    } catch (e) {
      if (e instanceof Error) {
        return { error: e, output };
      }
      return { unknown: e, output };
    }
  }

  describe('newOption', () => {
    it.each([
      ['-x,--xxxx <value>', true, true],
      ['-x,--xxxx [value]', false, false],
    ])('newOption', (flags, mandatory, optionsRequired) => {
      const option = newOption(flags, 'desc', mandatory);
      expect(option.mandatory).toBe(mandatory);
      expect(option.required).toBe(optionsRequired);
      expect(option.envVar).toBe('KEYPAD_XXXX');
    });
  });

  describe('setupCommonOptions', () => {
    it('Success', () => {
      const command = newCommand();
      setupCommonOptions(command);

      const { data } = parse(command, [
        '-P', 'XXXX',
        '-L', '10',
        '-K', '20',
      ]);
      expect(data).toEqual({ path: 'XXXX', layers: 10, keys: 20 });
    });
    it('Error', () => {
      const command = newCommand();
      setupCommonOptions(command);

      const { error } = parse(command, [
        '-L', 'XX',
      ]);
      expect(error?.message).toEqual("option '-L, --layers <value>' argument 'XX' is invalid. It must be a valid integer");
    });
  });

  describe('setupSetKeyMapOptions', () => {
    it('Success', () => {
      const command = newCommand();
      setupSetKeyMapOptions(command);

      const { data } = parse(command, [
        '-P', 'XXXX',
        '-L', '10',
        '-K', '20',
        '-N', '30',
        '-l', '1',
        '-n', '3',
        '-a', 'Left',
      ]);
      expect(data).toEqual({
        path: 'XXXX',
        layers: 10,
        keys: 20,
        knobs: 30,
        layerId: 1,
        knobId: 3,
        knobAction: KnobActions.Left,
      });
    });
    // describe('Error', () => {
    //   it('required', () => {
    //     const command = newCommand();
    //     setupSetKeyMapOptions(command);

    //     const { error } = parse(command, [
    //       '-k', '10',
    //       '-n', '20',
    //     ]);

    //     expect(error?.message).toEqual("error: required option '-l, --layer-id <value>' not specified");
    //   });
    //   it('.conflicts('keyId')', () => {
    //     const command = newCommand();
    //     setupSetKeyMapOptions(command);

    //     const { error } = parse(command, [
    //       '-k', '10',
    //       '-n', '20',
    //       '-l', '10',
    //     ]);
    //     expect(error?.message).toEqual("error: option '-n, --knob-id <value>' cannot be used with option '-k, --key-id <value>'");
    //   });
    // });
  });
});

describe('executeKeypadTask', () => {
  describe('detectKeypad', () => {
    const device: HidDevice = {
      interface: 0, productId: 0, release: 0, vendorId: 0,
    };
    it.each([
      [undefined],
      ['path'],
    ])('Success:%s', (path) => {
      setupSyncMock(findHidDevices, [device]);
      expect(detectKeypad(path)).toEqual(device);
    });

    it.each([
      [0],
      [2],
    ])('Error:%d', (count) => {
      const devices: HidDevice[] = [];
      for (let i = 0; i < count; i += 1) {
        devices.push(device);
      }
      setupSyncMock(findHidDevices, devices);
      expect.hasAssertions();
      try {
        detectKeypad();
      } catch (e) {
        expect(e).instanceOf(ConfigurationError);
        expect(`${e}`).toMatchSnapshot();
      }
    });
  });

  it.each([
    [{}, undefined],
    [{ keys: 1 }, { keys: 1, knobs: 0 }],
    [{ knobs: 2 }, { keys: 0, knobs: 2 }],
    [{ keys: 1, knobs: 2 }, { keys: 1, knobs: 2 }],
  ])('normalizeKeypadInfo:%s', (config, expected) => {
    const actual = normalizeKeypadInfo(config);
    expect(actual).toEqual(expected);
  });

  describe('resolveKeyId', () => {
    it.each([
      [{ keyId: 2 }, 2],
      [{ keyId: 6 }, 6],
      [{ keyId: 2, knobId: 3, knobAction: 'Left' }, 2],
      [{ knobId: 1, knobAction: 'Left' }, 4],
    ])('Success:%s', (config, expected) => {
      const actual = resolveKeyId({ keys: 3, knobs: 1 }, config);
      expect(actual).toBe(expected);
    });
    it.each([
      [{ keyId: 0 }],
      [{ keyId: 7 }],
      [{}],
      [{ knobId: 1 }],
      [{ knobAction: 'Left' }],
      [{ knobId: 1, knobAction: 'Unknown' }],
      [{ knobId: 0, knobAction: 'Left' }],
      [{ knobId: 2, knobAction: 'Left' }],
    ])('Error:%s', (config) => {
      expect.hasAssertions();
      try {
        resolveKeyId({ keys: 3, knobs: 1 }, config);
      } catch (e) {
        expect(e).instanceOf(ConfigurationError);
        expect(`${e}`).toMatchSnapshot();
      }
    });
  });

  describe('runCommand', () => {
    const processExit = process.exit;
    const consoleError = console.error;
    afterEach(() => {
      process.exit = processExit;
      console.error = consoleError;
    });

    function testRunCommand(
      setup: (command: Command) => Command,
      argv: string[],
      run?: (...args: any[]) => Promise<void>,
    ) {
      return new Promise<{
        exit?: true;
        code?: any;
        args?: any[];
        err: string;
        out: string;
      }>((resolve) => {
        const out: string[] = [];
        const err: string[] = [];

        function doResolve(obj: Object) {
          resolve({ ...obj, out: out.join('\n'), err: err.join('\n') });
        }
        const exit = (code: any) => { doResolve({ exit: true, code }); };
        process.exit = exit as any;
        const error = (...args: any) => { err.push(args.join(' ')); };
        console.error = error;
        runCommand([{
          setup(command) {
            command.configureOutput({
              writeOut: (str) => { out.push(str); },
              writeErr: (str) => { err.push(str); },
            });
            return setup(command);
          },
          async run(...args: any[]) {
            args.pop();
            if (run) {
              await run(args);
            }
            doResolve({ args });
          },
        }], argv);
      });
    }

    it('simple', async () => {
      const result = await testRunCommand((command) => {
        return command.command('simple');
      }, ['node', '.js', 'simple']);
      expect(result).toEqual({ args: [{}], err: '', out: '' });
    });

    it('required option. show usage', async () => {
      const result = await testRunCommand((command) => {
        return command.command('simple')
          .addOption(newOptionInt('-i', 'int', true));
      }, ['node', '.js', 'simple']);
      expect(result).toEqual({
        exit: true, code: 1, err: expect.anything(), out: '',
      });
      expect(result.err).toMatch(/error: required option /);
      expect(result.err).toMatch(/Usage/);
      expect(result).toMatchSnapshot();
    });

    it('parse error. show usage', async () => {
      const result = await testRunCommand((command) => {
        return command.command('simple')
          .addOption(newOptionInt('-i <value>', 'int', true));
      }, ['node', '.js', 'simple', '-i', 'xxx']);
      expect(result).toEqual({
        exit: true, code: 1, err: expect.anything(), out: '',
      });
      expect(result.err).toMatch(/error: option /);
      expect(result.err).toMatch(/Usage/);
      expect(result).toMatchSnapshot();
    });

    it('unknown error. message only', async () => {
      const result = await testRunCommand((command) => {
        return command.command('simple');
      }, ['node', '.js', 'simple'], () => { throw new Error('Unkown'); });
      expect(result).toEqual({
        exit: true, code: 1, err: 'Error: Unkown', out: '',
      });
    });
  });
});
