const path = require('path');
const jestExpoPreset = require('jest-expo/jest-preset');

const preset = { ...jestExpoPreset };
const setupFiles = Array.isArray(jestExpoPreset.setupFiles)
  ? [...jestExpoPreset.setupFiles]
  : [];

const expoSetupPath = require.resolve('jest-expo/src/preset/setup.js');
const preloadPath = path.join(__dirname, 'jest.preload.js');

const withoutExpoSetup = setupFiles.filter((file) => file !== expoSetupPath);
preset.setupFiles = [...withoutExpoSetup, preloadPath, expoSetupPath];

module.exports = preset;
