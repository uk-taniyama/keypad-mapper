import { Alt, Ctrl, Gui, Move, RAlt, RCtrl, RGui, RShift, Shift, defineKeyMap, key, media, mouse } from '../index';

defineKeyMap([
  // layer 1
  [
    // row 1
    Shift(key.A), Ctrl(key.A), Alt(key.A), Gui(key.A), 'HELLO',
    // row 2
    RShift(key.A), RCtrl(key.A), RAlt(key.A), RGui(key.A), 'hello',
    // row 3
    mouse.LButton, mouse.MButton, mouse.RButton, Move(0, 10), Move(10, 0),
    // knob 1
    mouse.MoveLeft, null, mouse.MoveRight,
    // knob 2
    mouse.MoveUp, null, mouse.MoveDown,
    // knob 3
    mouse.WheelUp, null, mouse.WheelDown,
  ],
  // layer 2
  [
    media.MyComputer,
  ],
]);
