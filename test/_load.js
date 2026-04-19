'use strict';

// Load the library modules into Node for testing.
//
// `src/unkind.js` and `src/indifferent.js` are browser-first IIFEs that
// attach to `window` when it exists, falling back to `this` otherwise.
// Setting `global.window = global` lets both files attach to the same
// shared object (mirroring the browser), so they link up the way they
// would on a page with both <script> tags.
//
// No DOM is created at module load time — it only appears inside
// Unkind.stage() and layer constructors, which tests don't call.

global.window = global;

require('../src/unkind.js');
require('../src/indifferent.js');

module.exports = {
  Unkind: global.Unkind,
  UnkindWeather: global.UnkindWeather,
};
