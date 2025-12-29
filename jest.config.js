module.exports = {
  preset: './jest.preset.js',
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/?(*.)+(spec|test).{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-navigation|@react-navigation/.*|@sentry/.*|@expo-google-fonts/.*|@expo/vector-icons|@react-native-async-storage/async-storage|@react-native-community/datetimepicker|@react-native-community/slider|@react-native-picker/picker|react-native-safe-area-context|react-native-screens|react-native-gesture-handler|@react-native-masked-view/masked-view|@react-navigation/native-stack|@react-navigation/bottom-tabs|@react-navigation/native|@react-navigation/stack|@react-navigation/drawer|@react-navigation/material-bottom-tabs|@react-navigation/material-top-tabs|@react-navigation/elements|@react-navigation/devtools)',
  ],
  moduleNameMapper: {
    '^expo-modules-core/build/Refs$':
      '<rootDir>/jest.mocks/expo-modules-core/Refs.js',
    '^expo-modules-core/build/web/index\\.web$':
      '<rootDir>/jest.mocks/expo-modules-core/index.web.js',
    '^expo/build/winter$': '<rootDir>/jest.mocks/expo/winter.js',
  },
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    './jest.setup.js',
  ],
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/babel.config.js',
    '!**/metro.config.js',
    '!**/jest.config.js',
    '!**/jest.setup.js',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};
