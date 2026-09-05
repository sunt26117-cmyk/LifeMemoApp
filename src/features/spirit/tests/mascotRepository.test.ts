// src/features/spirit/tests/mascotRepository.test.ts
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MascotRepository } from '../data/repositories/mascotRepository.ts';

// In-memory Storage polyfill for node test environment
const memoryStore = new Map<string, string>();
const fakeStorage: Storage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => { memoryStore.set(k, String(v)); },
  removeItem: (k: string) => { memoryStore.delete(k); },
  clear: () => { memoryStore.clear(); },
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
  get length() { return memoryStore.size; },
};

(globalThis as unknown as { localStorage: Storage }).localStorage = fakeStorage;

describe('MascotRepository Frequency Control', () => {
  let repo: MascotRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new MascotRepository();
  });

  it('First time opening triggers full greeting (firstTime)', () => {
    const daytime = new Date(2026, 8, 5, 10, 0, 0); // morning
    const result = repo.checkGreetingPolicy(daytime);
    assert.equal(result.shouldFullGreeting, true);
    assert.equal(result.reason, 'firstTime');
    assert.equal(result.currentBucket, 'morning');
  });

  it('Late night (23:00~05:00) activates quiet sleeping mode directly without big popup', () => {
    const late = new Date(2026, 8, 5, 23, 30, 0);
    const result = repo.checkGreetingPolicy(late);
    assert.equal(result.shouldFullGreeting, false);
    assert.equal(result.isLateNightQuiet, true);
    assert.equal(result.reason, 'lateNight');
  });

  it('Same day, same time bucket within 10 minutes skips full greeting', () => {
    const now = new Date(2026, 8, 5, 10, 0, 0);
    repo.recordGreetingShown('morning', now);

    // 10 minutes later
    const tenMinLater = new Date(2026, 8, 5, 10, 10, 0);
    const result = repo.checkGreetingPolicy(tenMinLater);
    assert.equal(result.shouldFullGreeting, false);
    assert.equal(result.reason, 'skipToIdle');
  });

  it('Same day, same time bucket but inactive for >= 30 minutes triggers greeting', () => {
    const now = new Date(2026, 8, 5, 10, 0, 0);
    repo.recordGreetingShown('morning', now);

    // 35 minutes later (still morning < 11:30)
    const thirtyFiveMinLater = new Date(2026, 8, 5, 10, 35, 0);
    const result = repo.checkGreetingPolicy(thirtyFiveMinLater);
    assert.equal(result.shouldFullGreeting, true);
    assert.equal(result.reason, 'inactiveOver30Min');
  });

  it('Same day but crossing to a new time bucket triggers greeting', () => {
    const morningTime = new Date(2026, 8, 5, 10, 0, 0);
    repo.recordGreetingShown('morning', morningTime);

    // Crossing into noon (12:00)
    const noonTime = new Date(2026, 8, 5, 12, 0, 0);
    const result = repo.checkGreetingPolicy(noonTime);
    assert.equal(result.shouldFullGreeting, true);
    assert.equal(result.reason, 'crossBucket');
    assert.equal(result.currentBucket, 'noon');
  });

  it('Crossing day triggers full greeting', () => {
    const day1 = new Date(2026, 8, 5, 10, 0, 0);
    repo.recordGreetingShown('morning', day1);

    // Next day at same morning bucket
    const day2 = new Date(2026, 8, 6, 10, 0, 0);
    const result = repo.checkGreetingPolicy(day2);
    assert.equal(result.shouldFullGreeting, true);
    assert.equal(result.reason, 'crossDay');
  });
});
