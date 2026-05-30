const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle the on-device TFLite pose model as an asset.
config.resolver.assetExts.push('tflite');

module.exports = config;
