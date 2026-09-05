// src/features/spirit/tests/mascotTimeBucket.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMascotTimeBucket, isMascotLateNight } from '../domain/mascotTimeBucket.ts';

describe('MascotTimeBucket 24-Hour Boundary Tests', () => {
  function makeDate(hours: number, minutes: number, seconds: number = 0): Date {
    return new Date(2026, 8, 5, hours, minutes, seconds);
  }

  it('Boundary 1: 04:59:59 (lateNight) vs 05:00:00 (earlyMorning)', () => {
    assert.equal(getMascotTimeBucket(makeDate(4, 59, 59)), 'lateNight');
    assert.equal(isMascotLateNight(makeDate(4, 59, 59)), true);

    assert.equal(getMascotTimeBucket(makeDate(5, 0, 0)), 'earlyMorning');
    assert.equal(isMascotLateNight(makeDate(5, 0, 0)), false);
  });

  it('Boundary 2: 08:59:59 (earlyMorning) vs 09:00:00 (morning)', () => {
    assert.equal(getMascotTimeBucket(makeDate(8, 59, 59)), 'earlyMorning');
    assert.equal(getMascotTimeBucket(makeDate(9, 0, 0)), 'morning');
  });

  it('Boundary 3: 11:29:59 (morning) vs 11:30:00 (noon)', () => {
    assert.equal(getMascotTimeBucket(makeDate(11, 29, 59)), 'morning');
    assert.equal(getMascotTimeBucket(makeDate(11, 30, 0)), 'noon');
  });

  it('Boundary 4: 13:29:59 (noon) vs 13:30:00 (afternoon)', () => {
    assert.equal(getMascotTimeBucket(makeDate(13, 29, 59)), 'noon');
    assert.equal(getMascotTimeBucket(makeDate(13, 30, 0)), 'afternoon');
  });

  it('Boundary 5: 17:59:59 (afternoon) vs 18:00:00 (evening)', () => {
    assert.equal(getMascotTimeBucket(makeDate(17, 59, 59)), 'afternoon');
    assert.equal(getMascotTimeBucket(makeDate(18, 0, 0)), 'evening');
  });

  it('Boundary 6: 19:59:59 (evening) vs 20:00:00 (night)', () => {
    assert.equal(getMascotTimeBucket(makeDate(19, 59, 59)), 'evening');
    assert.equal(getMascotTimeBucket(makeDate(20, 0, 0)), 'night');
  });

  it('Boundary 7: 22:59:59 (night) vs 23:00:00 (lateNight)', () => {
    assert.equal(getMascotTimeBucket(makeDate(22, 59, 59)), 'night');
    assert.equal(isMascotLateNight(makeDate(22, 59, 59)), false);

    assert.equal(getMascotTimeBucket(makeDate(23, 0, 0)), 'lateNight');
    assert.equal(isMascotLateNight(makeDate(23, 0, 0)), true);
  });

  it('Midnight and late night checks: 00:00:00 and 23:59:59', () => {
    assert.equal(getMascotTimeBucket(makeDate(0, 0, 0)), 'lateNight');
    assert.equal(getMascotTimeBucket(makeDate(23, 59, 59)), 'lateNight');
    assert.equal(getMascotTimeBucket(makeDate(2, 30, 0)), 'lateNight');
  });
});
