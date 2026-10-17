const test = require('node:test');
const assert = require('node:assert');
const State = require('../state.js');
const Persistence = require('../persistence.js');

// Minimal in-memory localStorage mock for Node test environment (the real browser build
// relies on the actual window.localStorage, already verified against HTML Viewer Q).
function createMockLocalStorage() {
  var store = {};
  return {
    getItem: function (key) { return store.hasOwnProperty(key) ? store[key] : null; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; },
    _dump: function () { return store; }
  };
}

function withMockStorage(fn) {
  const original = global.localStorage;
  global.localStorage = createMockLocalStorage();
  try {
    fn(global.localStorage);
  } finally {
    global.localStorage = original;
  }
}

test('isStorageSupported returns true when localStorage read/write works', () => {
  withMockStorage(() => {
    assert.strictEqual(Persistence.isStorageSupported(), true);
  });
});

test('isStorageSupported returns false when localStorage is unavailable', () => {
  const original = global.localStorage;
  delete global.localStorage;
  try {
    assert.strictEqual(Persistence.isStorageSupported(), false);
  } finally {
    global.localStorage = original;
  }
});

test('save then load round-trips a game state exactly', () => {
  withMockStorage(() => {
    const state = State.createInitialState({ seed: 10, playerNames: ['Chris', 'Sam'] });
    const saved = Persistence.save(state);
    assert.strictEqual(saved, true);
    const loaded = Persistence.load();
    assert.deepStrictEqual(loaded, state);
  });
});

test('load returns null when nothing has been saved', () => {
  withMockStorage(() => {
    assert.strictEqual(Persistence.load(), null);
  });
});

test('load returns null (does not throw) for corrupt stored data', () => {
  withMockStorage((ls) => {
    ls.setItem(Persistence.STORAGE_KEY, '{not valid json!!');
    assert.strictEqual(Persistence.load(), null);
  });
});

test('clear removes the saved state', () => {
  withMockStorage(() => {
    const state = State.createInitialState({ seed: 11 });
    Persistence.save(state);
    Persistence.clear();
    assert.strictEqual(Persistence.load(), null);
  });
});

test('exportState produces a JSON string importState can parse back identically', () => {
  const state = State.createInitialState({ seed: 12, playerNames: ['A', 'B'] });
  const json = Persistence.exportState(state);
  const result = Persistence.importState(json);
  assert.ok(result.state);
  assert.deepStrictEqual(result.state, state);
});

test('importState rejects empty input', () => {
  const result = Persistence.importState('');
  assert.strictEqual(result.error, 'EMPTY_INPUT');
});

test('importState rejects malformed/invalid JSON with a clear error', () => {
  const result = Persistence.importState('not json at all');
  assert.strictEqual(result.error, 'INVALID_DATA');
});

test('save returns false gracefully when localStorage is unavailable', () => {
  const original = global.localStorage;
  delete global.localStorage;
  try {
    const state = State.createInitialState({ seed: 13 });
    assert.strictEqual(Persistence.save(state), false);
  } finally {
    global.localStorage = original;
  }
});
