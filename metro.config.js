const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const gradientShim = path.resolve(__dirname, 'src/components/SafeLinearGradient.js');
const deviceInfoShim = path.resolve(__dirname, 'src/utils/deviceInfoShim.js');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native-device-info') {
        return { type: 'sourceFile', filePath: deviceInfoShim };
      }
      const fromApp = (context.originModulePath || '').includes(`${path.sep}src${path.sep}`);
      if (moduleName === 'react-native-linear-gradient' && fromApp) {
        return { type: 'sourceFile', filePath: gradientShim };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
