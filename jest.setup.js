// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// Mock Expo modules that might cause issues in tests
jest.mock('expo-constants', () => ({
  manifest: {},
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  init: jest.fn(),
  setExtra: jest.fn(),
  setContext: jest.fn(),
  setTag: jest.fn(),
  setUser: jest.fn(),
  withScope: jest.fn(cb => cb?.({ setTag: jest.fn(), setContext: jest.fn() })),
}));

// Mock the react-native-gesture-handler
try {
  require('react-native-gesture-handler/jestSetup');
} catch {
  // Ignore when not installed in this environment.
}

// Mock the native modules that are not available in Jest environment
try {
  require.resolve('react-native/Libraries/Animated/NativeAnimatedHelper');
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {
  // Ignore when the module path doesn't exist in this React Native version.
}
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo Router
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({})),
  useRoute: jest.fn(() => ({ params: {} })),
}));

// Silence warnings for testing
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
