module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['react-native-worklets-core/plugin'], // Add this first
    'react-native-reanimated/plugin',      // Keep this last
  ],
};