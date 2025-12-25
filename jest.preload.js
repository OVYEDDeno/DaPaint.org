const mockNativeModules = require('react-native/Libraries/BatchedBridge/NativeModules');

if (!mockNativeModules.NativeUnimoduleProxy) {
  mockNativeModules.NativeUnimoduleProxy = { viewManagersMetadata: {} };
} else if (!mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata) {
  mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata = {};
}

if (!mockNativeModules.UIManager) {
  mockNativeModules.UIManager = {};
}
