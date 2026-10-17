// persistence.js — localStorage save/load (primary, verified reliable in HTML Viewer Q),
// plus manual export/import as a convenience/insurance feature. See design.md "Persistence
// Design" for the rationale. Debouncing of saves is handled by the caller (main.js); this
// module exposes synchronous save/load/export/import primitives.

(function (global) {
  'use strict';

  var State = typeof module !== 'undefined' && module.exports ? require('./state.js') : global.Scrabble.State;

  var STORAGE_KEY = 'scrabble_save_v1';
  var SUPPORT_CHECK_KEY = '__scrabble_support_check__';

  function getLocalStorage() {
    // In Node (tests/build), localStorage doesn't exist -- callers relying on it should
    // check isStorageSupported() first. In the browser build this is always window.localStorage.
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof global !== 'undefined' && global.localStorage) return global.localStorage;
    return null;
  }

  // Performs a write-then-read-back check. Returns true if localStorage is usable.
  function isStorageSupported() {
    var ls = getLocalStorage();
    if (!ls) return false;
    try {
      ls.setItem(SUPPORT_CHECK_KEY, '1');
      var ok = ls.getItem(SUPPORT_CHECK_KEY) === '1';
      ls.removeItem(SUPPORT_CHECK_KEY);
      return ok;
    } catch (e) {
      return false;
    }
  }

  // Saves state to localStorage. Returns true on success, false if storage is unavailable/fails.
  function save(state) {
    var ls = getLocalStorage();
    if (!ls) return false;
    try {
      ls.setItem(STORAGE_KEY, State.serialize(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Loads state from localStorage. Returns the parsed state, or null if missing/corrupt/unavailable.
  function load() {
    var ls = getLocalStorage();
    if (!ls) return null;
    var raw;
    try {
      raw = ls.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
    if (!raw) return null;
    return State.deserialize(raw);
  }

  function clear() {
    var ls = getLocalStorage();
    if (!ls) return;
    try {
      ls.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }

  // Manual export: returns a JSON string suitable for copy/paste backup.
  function exportState(state) {
    return State.serialize(state);
  }

  // Manual import: parses a pasted JSON string back into a state object.
  // Returns { state } on success or { error: 'reason' } on failure.
  function importState(json) {
    if (typeof json !== 'string' || json.trim().length === 0) {
      return { error: 'EMPTY_INPUT' };
    }
    var parsed = State.deserialize(json);
    if (!parsed) {
      return { error: 'INVALID_DATA' };
    }
    return { state: parsed };
  }

  var Persistence = {
    STORAGE_KEY: STORAGE_KEY,
    isStorageSupported: isStorageSupported,
    save: save,
    load: load,
    clear: clear,
    exportState: exportState,
    importState: importState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Persistence;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.Persistence = Persistence;
  }
})(typeof window !== 'undefined' ? window : globalThis);
