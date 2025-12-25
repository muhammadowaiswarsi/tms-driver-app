// This file is preloaded by Node via NODE_OPTIONS to polyfill newer JS APIs
// required by Metro/Expo tooling on older Node versions (e.g. Node 18).

if (!Array.prototype.toReversed) {
  // eslint-disable-next-line no-extend-native
  Array.prototype.toReversed = function toReversed() {
    const arr = Array.from(this);
    arr.reverse();
    return arr;
  };
}


