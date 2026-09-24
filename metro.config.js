// Expo's Metro config, with Sentry's serializer on top: it stamps every bundle with a debug id
// so that a crash reported from a store build or an EAS Update can be matched to the source
// map uploaded for exactly that bundle (SPEC §44). It changes nothing about how code runs.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
