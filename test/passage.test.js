'use strict';


const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { Unkind } = require('./_load');

const CANONICAL = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'concordance', 'shakespeare-weather-merged.json'), 'utf8'),
);

function makeFakeSky(state) {
  return { getState: () => state };
}

describe('Unkind.fool', () => {
  before(() => {
    Unkind.loadConcordance(CANONICAL);
  });

  it('returns null passage when no concordance is loaded', () => {
    Unkind.loadConcordance([]);
    const result = Unkind.fool(makeFakeSky({ time: 'night' }));
    assert.equal(result.passage, null);
    assert.equal(result.alternatives.length, 0);
    Unkind.loadConcordance(CANONICAL);
  });

  it('returns a normalized entry with flat display fields', () => {
    const { passage } = Unkind.fool(makeFakeSky({ time: 'night' }));
    assert.ok(passage, 'should return a passage');
    assert.equal(typeof passage.text, 'string');
    assert.equal(typeof passage.speaker, 'string');
    assert.equal(typeof passage.play, 'string', 'play must be a string after normalization');
    assert.equal(typeof passage.lineRef, 'string', 'lineRef must be a string after normalization');
    assert.ok(passage.source, 'source should be preserved');
  });

  it('matches a supernatural/stormy sky to a supernatural-mood entry', () => {
    const { passage } = Unkind.fool(makeFakeSky({
      time: 'night', mood: 'supernatural',
      rain: 0.31, snow: 0, clouds: 1.0, lightning: 0.54, wind: 0.76, fog: 1.0,
    }));
    assert.equal(passage.mood, 'supernatural',
      'top match should share the requested mood');
  });

  it('returns up to 4 alternatives by default', () => {
    const result = Unkind.fool(makeFakeSky({ time: 'night' }));
    assert.ok(result.alternatives.length > 0);
    assert.ok(result.alternatives.length <= 4);
    for (const alt of result.alternatives) {
      assert.notEqual(alt, result.passage);
    }
  });

  it('respects an explicit mood on the sky state', () => {
    const { mood } = Unkind.fool(makeFakeSky({ time: 'day', mood: 'rage' }));
    assert.equal(mood, 'rage');
  });
});

describe('Unkind.prospero', () => {
  it('is a no-op when sky or entry is missing', () => {
    Unkind.prospero(null, { weather: 'stormy' });
    Unkind.prospero({ set: () => { throw new Error('should not be called'); } }, null);
  });

  it('translates a flat entry into sky.set options', () => {
    const calls = [];
    const fakeSky = { set: (opts) => calls.push(opts) };
    Unkind.prospero(fakeSky, {
      text: 't', weather: 'stormy', time: 'night', mood: 'rage', intensity: 0.8,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].weather, 'stormy');
    assert.equal(calls[0].time, 'night');
    assert.equal(calls[0].mood, 'rage');
    assert.equal(calls[0].intensity, 0.8);
  });

  it('accepts a raw nested entry (defensive normalize)', () => {
    const raw = {
      text: 't',
      source: { play: 'King Lear', act: 3, scene: 2 },
      weatherState: 'stormy', timeOfDay: 'night', mood: 'rage',
    };
    assert.equal(raw.weather, undefined, 'precondition: raw has no flat .weather');

    const calls = [];
    Unkind.prospero({ set: (opts) => calls.push(opts) }, raw);
    assert.equal(calls[0].weather, 'stormy', 'should derive weather from weatherState');
    assert.equal(calls[0].time, 'night');
  });

  it('forwards direct primitive overrides', () => {
    const calls = [];
    Unkind.prospero({ set: (opts) => calls.push(opts) }, {
      weather: 'clear', rain: 0.2, fog: 0.5,
    });
    assert.equal(calls[0].rain, 0.2);
    assert.equal(calls[0].fog, 0.5);
  });
});
