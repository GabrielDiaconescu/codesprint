// Default Expo Metro config. Kept explicit so later phases (SVG transformer, content
// watching) have an obvious place to extend.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
