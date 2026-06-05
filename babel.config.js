module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Required for react-native-vision-camera frame processors +
    // react-native-fast-tflite worklets (runs inference off the JS thread).
    plugins: ['react-native-worklets-core/plugin'],
  };
};
