module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo resolves tsconfig `paths` aliases and includes the Reanimated /
    // worklets plugin, so neither needs to be configured separately.
    presets: [['babel-preset-expo', { reanimated: true }]],
  };
};
