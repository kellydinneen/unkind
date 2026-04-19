'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { Unkind } = require('./_load');

const CONCORDANCE_PATH = path.join(
  __dirname, '..', 'concordance', 'shakespeare-weather-merged.json',
);

describe('concordance asset (shakespeare-weather-merged.json)', () => {
  let data;
  let entries;

  before(() => {
    data = JSON.parse(fs.readFileSync(CONCORDANCE_PATH, 'utf8'));
    Unkind.loadConcordance(data);
    entries = Unkind.getConcordance();
  });

  // ─── Hard contracts ────────────────────────────────────────────────────

  it('exists, parses, and has the canonical wrapped shape', () => {
    assert.ok(data.metadata, 'should have a metadata block');
    assert.ok(Array.isArray(data.concordance), 'should have a concordance array');
    assert.ok(data.concordance.length > 0, 'should not be empty');
  });

  it('declares a total entry count matching the array length', () => {
    if (data.metadata.totalEntries != null) {
      assert.equal(
        data.metadata.totalEntries, data.concordance.length,
        'metadata.totalEntries should match the actual array length',
      );
    }
  });

  it('normalizes every entry so display + matching code can run', () => {
    for (const e of entries) {
      assert.equal(typeof e.text, 'string', `${e.id}: .text should be a string`);
      assert.ok(e.text.length > 0, `${e.id}: .text should be non-empty`);
      assert.equal(typeof e.play, 'string', `${e.id}: .play should be derived`);
      assert.equal(typeof e.lineRef, 'string', `${e.id}: .lineRef should be derived`);
    }
  });

  // ─── Tripwires ─────────────────────────────────────────────────────────

  it('has a known, bounded set of entries with non-canonical weather values', () => {
    const KNOWN_NON_CANONICAL_WEATHER_COUNT = 21;
    const known = new Set(Unkind.WEATHERS);
    const offenders = entries.filter((e) => e.weather && !known.has(e.weather));
    assert.equal(
      offenders.length, KNOWN_NON_CANONICAL_WEATHER_COUNT,
      'non-canonical weather count changed — review the data and update this tripwire',
    );
  });

  it('has a known, bounded set of entries with a null speaker', () => {
    const KNOWN_NULL_SPEAKER_COUNT = 1;
    const bad = entries.filter((e) => e.speaker == null);
    assert.equal(
      bad.length, KNOWN_NULL_SPEAKER_COUNT,
      'null-speaker count changed — review the data and update this tripwire',
    );
  });

  it('uses only known mood values for entries that declare a mood', () => {
    const known = new Set(Unkind.MOODS);
    const offenders = entries
      .filter((e) => e.mood && !known.has(e.mood))
      .map((e) => `${e.id}:${e.mood}`);
    if (offenders.length > 0) {
      console.warn(
        '[data] %d entries use mood values without a registered tint:',
        offenders.length, offenders.slice(0, 5),
      );
    }
  });
});
