// Polyfill for toReversed() method (Node 18 compatibility)
// This must be defined before metro-config is loaded
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    const arr = Array.from(this);
    arr.reverse();
    return arr;
  };
}

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Alias Amplify's optional React Native package to a JS-only shim so the app can run in Expo Go.
// This avoids native-only implementations (Passkeys/WebBrowser/SRP modPow) while still letting
// Amplify Auth work using USER_PASSWORD_AUTH.
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@aws-amplify/react-native": path.resolve(
    __dirname,
    "src/shims/aws-amplify-react-native.ts"
  ),
};

module.exports = config;
