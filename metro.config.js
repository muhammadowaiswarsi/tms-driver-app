

if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    const arr = Array.from(this);
    arr.reverse();
    return arr;
  };
}

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");


const config = getDefaultConfig(__dirname);




config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@aws-amplify/react-native": path.resolve(
    __dirname,
    "src/shims/aws-amplify-react-native.ts"
  ),
};

module.exports = config;
