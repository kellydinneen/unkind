'use strict';

// classifyMood — weather primitives → mood label.
//
// Spot-check the specific boundaries the demo relies on (e.g. the fog > 0.6
// rule that produces 'supernatural', which triggered the Casca match in
// the bug screenshot). Not exhaustive — the function is a cascade of
// thresholds, and we only pin the decisions real callers depend on.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Unkind } = require('./_load');

describe('Unkind.classifyMood', () => {
  const classify = Unkind.classifyMood;

  it('maps heavy fog to supernatural', () => {
    assert.equal(classify({ fog: 0.7 }), 'supernatural');
    assert.equal(classify({ fog: 1.0, clouds: 1.0, rain: 0.3 }), 'supernatural');
  });

  it('maps a full-on thunderstorm to madness', () => {
    assert.equal(classify({ lightning: 0.6, rain: 0.7, wind: 0.6 }), 'madness');
  });

  it('maps lightning + heavy rain (but low wind) to rage', () => {
    assert.equal(classify({ lightning: 0.4, rain: 0.5, wind: 0.1 }), 'rage');
  });

  it('maps heavy rain without lightning to despair', () => {
    assert.equal(classify({ rain: 0.7 }), 'despair');
  });

  it('maps cloudy windy gloom to foreboding', () => {
    assert.equal(classify({ clouds: 0.8, wind: 0.3, rain: 0.1 }), 'foreboding');
  });

  it('maps still overcast to dread', () => {
    assert.equal(classify({ clouds: 0.8, wind: 0.1, rain: 0.1 }), 'dread');
  });

  it('maps light snow to tenderness', () => {
    assert.equal(classify({ snow: 0.4 }), 'tenderness');
  });

  it('maps heavy snow to calm', () => {
    assert.equal(classify({ snow: 0.7 }), 'calm');
  });

  it('maps a cloudless sky to tenderness', () => {
    assert.equal(classify({}), 'tenderness');
  });
});
