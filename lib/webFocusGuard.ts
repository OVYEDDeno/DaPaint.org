// lib\webFocusGuard.ts
import { GestureResponderEvent, Keyboard, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const stopEventOnWeb = (e?: GestureResponderEvent) => {
  if (isWeb && e?.stopPropagation) {
    e.stopPropagation();
  }
};

export const getKeyboardDismissHandler = () =>
  isWeb ? undefined : Keyboard.dismiss;

export const isWebPlatform = isWeb;
