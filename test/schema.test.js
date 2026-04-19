'use strict';

// Concordance schema handling — normalization + loader tolerance.
//
// These tests pin down two bugs caught during the v0.1.1 demo-bug sweep:
//  1. `Array.prototype.entries` shadowed the wrapped-object `.entries`
//     check in `loadConcordance`, so every plain-array call assigned the
//     iterator function to `_concordanceEntries`. Regression-tested below
//     via explicit "plain array" cases.
//  2. The shipped concordance is in the canonical nested schema
//     (`source.play`, `weatherState`, `timeOfDay`) but library internals
//     read flat fields. Moved normalization into the library; the demo
//     is now a pass-through consumer.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Unkind, UnkindWeather } = require('./_load');

const nestedEntry = {
  id: 'lear-3-2-1',
  text: 'Blow, winds, and crack your cheeks!',
  source: { play: 'King Lear', act: 3, scene: 2, lineStart: 1, lineEnd: 3 },
  speaker: 'Lear',
  weatherState: 'stormy',
  timeOfDay: 'night',
  intensity: 1.0,
  mood: 'rage',
};

const flatEntry = {
  id: 'already-flat',
  text: 'Pre-flattened',
  play: 'Hamlet',
  weather: 'clear',
  time: 'day',
  lineRef: '1.1.5',
  speaker: 'Horatio',
  mood: 'calm',
};

describe('normalizeEntry', () => {
  const normalize = Unkind._normalizeEntry;

  it('flattens nested canonical schema into flat fields', () => {
    const out = normalize(nestedEntry);
    assert.equal(out.play, 'King Lear');
    assert.equal(out.weather, 'stormy');
    assert.equal(out.time, 'night');
    assert.equal(out.lineRef, '3.2.1-3');
  });

  it('preserves the original nested fields', () => {
    const out = normalize(nestedEntry);
    assert.deepEqual(out.source, nestedEntry.source);
    assert.equal(out.weatherState, 'stormy');
    assert.equal(out.timeOfDay, 'night');
    assert.equal(out.speaker, 'Lear');
    assert.equal(out.mood, 'rage');
  });

  it('emits a single-line lineRef when lineEnd === lineStart', () => {
    const out = normalize({
      source: { act: 5, scene: 1, lineStart: 42, lineEnd: 42 },
    });
    assert.equal(out.lineRef, '5.1.42');
  });

  it('omits line numbers gracefully when lineStart is null', () => {
    const out = normalize({
      source: { play: 'X', act: 1, scene: 3, lineStart: null, lineEnd: null },
    });
    assert.equal(out.lineRef, '1.3'); // just act.scene, no trailing dot
  });

  it('returns an empty lineRef when source has no structure', () => {
    const out = normalize({ source: {} });
    assert.equal(out.lineRef, '');
  });

  it('is a pass-through for already-flat entries (no nested cues)', () => {
    const out = normalize(flatEntry);
    assert.equal(out, flatEntry, 'should be strict-equal — no unnecessary copy');
  });

  it('does not overwrite existing flat fields when nesting is also present', () => {
    // If both shapes coexist, the flat value wins. This matters if a
    // caller has already hand-normalized part of an entry.
    const hybrid = { play: 'Explicit', source: { play: 'Nested' }, weatherState: 'clear' };
    const out = normalize(hybrid);
    assert.equal(out.play, 'Explicit');
    assert.equal(out.weather, 'clear');
  });

  it('handles null/undefined/non-object input without throwing', () => {
    assert.equal(normalize(null), null);
    assert.equal(normalize(undefined), undefined);
    assert.equal(normalize('not an object'), 'not an object');
  });
});

describe('Unkind.loadConcordance', () => {
  it('accepts a plain array (regression: Array.prototype.entries shadow)', () => {
    // This is THE bug that made the demo passage go blank. Before the fix,
    // loadConcordance saw `arr.entries` (the iterator method) as truthy and
    // assigned the function to _concordanceEntries, giving length === 0.
    Unkind.loadConcordance([{ id: 'a', text: 't', weather: 'clear', time: 'day' }]);
    assert.equal(Unkind.getConcordance().length, 1);
    assert.equal(Unkind.getConcordance()[0].id, 'a');
  });

  it('accepts the canonical wrapped schema { concordance: [...] }', () => {
    Unkind.loadConcordance({ metadata: { v: 1 }, concordance: [nestedEntry] });
    const entries = Unkind.getConcordance();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].play, 'King Lear', 'should normalize on ingress');
  });

  it('accepts the legacy wrapped schema { entries: [...] }', () => {
    Unkind.loadConcordance({ meta: {}, entries: [flatEntry] });
    assert.equal(Unkind.getConcordance().length, 1);
    assert.equal(Unkind.getConcordance()[0].play, 'Hamlet');
  });

  it('ignores garbage input without throwing', () => {
    Unkind.loadConcordance(null);
    assert.equal(Unkind.getConcordance().length, 0);
    Unkind.loadConcordance(undefined);
    assert.equal(Unkind.getConcordance().length, 0);
    Unkind.loadConcordance('string');
    assert.equal(Unkind.getConcordance().length, 0);
    Unkind.loadConcordance({ unrelated: 'object' });
    assert.equal(Unkind.getConcordance().length, 0);
  });

  it('normalizes entries so internals can assume the flat shape', () => {
    Unkind.loadConcordance([nestedEntry]);
    const [e] = Unkind.getConcordance();
    assert.equal(e.weather, 'stormy');
    assert.equal(e.time, 'night');
    assert.equal(e.play, 'King Lear');
    assert.equal(e.lineRef, '3.2.1-3');
  });
});

describe('UnkindWeather constructor', () => {
  it('accepts a plain array (regression: same array-entries shadow)', () => {
    const bridge = new UnkindWeather([flatEntry]);
    assert.equal(bridge._entries.length, 1);
  });

  it('accepts the canonical wrapped schema', () => {
    const bridge = new UnkindWeather({ concordance: [nestedEntry] });
    assert.equal(bridge._entries.length, 1);
    assert.equal(bridge._entries[0].play, 'King Lear', 'should normalize');
  });

  it('accepts the legacy wrapped schema', () => {
    const bridge = new UnkindWeather({ entries: [flatEntry] });
    assert.equal(bridge._entries.length, 1);
  });

  it('defaults to an empty list for bad input', () => {
    assert.equal(new UnkindWeather(null)._entries.length, 0);
    assert.equal(new UnkindWeather(undefined)._entries.length, 0);
    assert.equal(new UnkindWeather('not a concordance')._entries.length, 0);
  });

  it('uses the shared Unkind._normalizeEntry helper', () => {
    // Invariant: both modules must produce the same shape for the same input.
    Unkind.loadConcordance([nestedEntry]);
    const viaLoad = Unkind.getConcordance()[0];
    const viaBridge = new UnkindWeather([nestedEntry])._entries[0];
    assert.deepEqual(viaLoad, viaBridge);
  });
});
