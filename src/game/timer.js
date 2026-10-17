// timer.js — per-turn countdown controller. Ticks on a configurable interval and invokes
// onExpire exactly once when the countdown reaches zero. The runtime wires onExpire to
// turnReducer.applyTimeout. Only meant to run while turnPhase === 'PLAYER_TURN'; the caller
// (main.js) is responsible for starting/stopping it on phase transitions.

(function (global) {
  'use strict';

  function createTimer(options) {
    options = options || {};
    var tickIntervalMs = options.tickIntervalMs || 1000;
    var onTick = options.onTick || function () {};
    var onExpire = options.onExpire || function () {};

    var remainingSec = 0;
    var intervalHandle = null;
    var expired = false;

    function clearHandle() {
      if (intervalHandle !== null) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
    }

    // Starts (or restarts) the countdown from `durationSec`. No-op if durationSec <= 0.
    function start(durationSec) {
      clearHandle();
      expired = false;
      remainingSec = durationSec;
      if (durationSec <= 0) return;
      intervalHandle = setInterval(function () {
        remainingSec -= 1;
        onTick(remainingSec);
        if (remainingSec <= 0) {
          clearHandle();
          if (!expired) {
            expired = true;
            onExpire();
          }
        }
      }, tickIntervalMs);
    }

    function stop() {
      clearHandle();
    }

    function getRemainingSec() {
      return remainingSec;
    }

    function isRunning() {
      return intervalHandle !== null;
    }

    return {
      start: start,
      stop: stop,
      getRemainingSec: getRemainingSec,
      isRunning: isRunning
    };
  }

  var Timer = {
    createTimer: createTimer
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timer;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.Timer = Timer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
