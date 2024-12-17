import { isKeyMapConsumer, isKeyMapKeys, isKeyMapMouse } from './api';
import { formatKeyActions } from './key-action';
import { formatConsumerAction, formatMouseAction, getKnobByKeyId } from './types';

import type { KeyMap, KeyMapWithId } from './api';
import type { KeypadInfo } from './types';

/**
 * Formats a key mapping into a string representation based on its type.
 */
export function formatKeyMap(keyMap: KeyMap) {
  if (isKeyMapKeys(keyMap)) {
    return `key:${formatKeyActions(keyMap.keys)}`;
  }
  if (isKeyMapConsumer(keyMap)) {
    return `media:${formatConsumerAction(keyMap.consumer)}`;
  }
  if (isKeyMapMouse(keyMap)) {
    return `mouse:${formatMouseAction(keyMap.mouse)}`;
  }
  return JSON.stringify(keyMap);
}

/**
 * Formats a key mapping with additional context information such as layer and key or knob identifiers.
 */
export function formatKeyMapWithId(info: KeypadInfo, { layerId, keyId, keyMap }: KeyMapWithId) {
  const knob = getKnobByKeyId(info, keyId);
  const keyMapText = formatKeyMap(keyMap);
  if (knob == null) {
    return `layer-id: ${layerId}, key-id: ${keyId} = ${keyMapText}`;
  }
  return `layer-id: ${layerId}, knob-id: ${knob.knobId}, knob-action: ${knob.knobAction} = ${keyMapText}`;
}
