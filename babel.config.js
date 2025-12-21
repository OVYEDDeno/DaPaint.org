module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add the export namespace plugin for web support
      '@babel/plugin-proposal-export-namespace-from',
      // Worklets plugin must be listed last
      'react-native-worklets/plugin',
    ],
  };
};