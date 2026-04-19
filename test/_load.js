'use strict';

global.window = global;

require('../src/unkind.js');
require('../src/indifferent.js');

module.exports = {
  Unkind: global.Unkind,
  UnkindWeather: global.UnkindWeather,
};
