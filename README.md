# mini-keymapper

The `mini-keymapper` package simplifies the process of defining and applying key mappings for keypads. Use it to define custom key layouts, media controls, and mouse actions.

## Installing

To install the necessary dependencies, run the following command:

```sh
npm install mini-keymapper tsx

## Script

### View the Configuration

To display the currently defined key mappings, execute the following command:

```bash
npx tsx index.ts
```

### Apply the Configuration

To apply the defined key mappings to the keypad, use the ```--apply``` flag:


```bash
npx tsx index.ts --apply
```

### Code Example

Here's an example of how to define key mappings in index.ts:

```ts
// index.ts
import { Alt, Ctrl, Gui, Move, RAlt, RCtrl, RGui, RShift, Shift, defineKeyMap, key, media, mouse } from 'keypad-mapper';

defineKeyMap([
  // layer 1
  [
    // row 1
    Shift(key.A), Ctrl(key.A), Alt(key.A), Gui(key.A), 'HELLO',
    // row 2
    RShift(key.A), RCtrl(key.A), RAlt(key.A), RGui(key.A), 'hello',
    // row 3
    mouse.LButton, mouse.MButton, mouse.RButton, Move(0, 10), Move(10, 0),
    // knob 1 (Left, Click, Rith)
    mouse.MoveLeft, null, mouse.MoveRight,
    // knob 2 (Left, Click, Rith)
    mouse.MoveUp, null, mouse.MoveDown,
    // knob 3 (Left, Click, Rith)
    mouse.WheelUp, null, mouse.WheelDown,
  ],
  // layer 2
  [
    media.MyComputer,
  ],
]);
```

## CLI Commands

You can interact with the keypad-mapper through the following CLI commands:

```
npx keypad-mapper
```

Example Output:

```sh
Usage: keypad-mapper [options] [command]

Options:
  -V, --version                 output the version number
  -h, --help                    display help for command

Commands:
  init [options]
  map [options] <key>           sets a key mapping
  led [options] <mode> <color>  sets LED configuration
  delay [options] <time>        sets a delay time
  help [command]                display help for command
```

