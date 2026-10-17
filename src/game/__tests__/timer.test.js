const test = require('node:test');
const assert = require('node:assert');
const { mock } = require('node:test');
const Timer = require('../timer.js');

test('timer ticks the expected number of times and expires exactly once', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });

  let tickCount = 0;
  let expireCount = 0;
  const timer = Timer.createTimer({
    tickIntervalMs: 1000,
    onTick: () => { tickCount++; },
    onExpire: () => { expireCount++; }
  });

  timer.start(3); // 3 second countdown
  t.mock.timers.tick(1000);
  assert.strictEqual(tickCount, 1);
  assert.strictEqual(timer.getRemainingSec(), 2);
  assert.strictEqual(expireCount, 0);

  t.mock.timers.tick(1000);
  assert.strictEqual(tickCount, 2);
  assert.strictEqual(expireCount, 0);

  t.mock.timers.tick(1000);
  assert.strictEqual(tickCount, 3);
  assert.strictEqual(expireCount, 1, 'onExpire should fire exactly once when countdown hits 0');

  // Advancing further must not fire onExpire again (interval was cleared).
  t.mock.timers.tick(5000);
  assert.strictEqual(expireCount, 1);
});

test('timer does not fire onExpire if stopped before completion', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let expireCount = 0;
  const timer = Timer.createTimer({ tickIntervalMs: 1000, onExpire: () => { expireCount++; } });
  timer.start(5);
  t.mock.timers.tick(2000);
  timer.stop();
  t.mock.timers.tick(10000);
  assert.strictEqual(expireCount, 0);
});

test('timer disabled (duration 0) never fires onExpire or ticks', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let tickCount = 0;
  let expireCount = 0;
  const timer = Timer.createTimer({
    tickIntervalMs: 1000,
    onTick: () => { tickCount++; },
    onExpire: () => { expireCount++; }
  });
  timer.start(0);
  t.mock.timers.tick(10000);
  assert.strictEqual(tickCount, 0);
  assert.strictEqual(expireCount, 0);
  assert.strictEqual(timer.isRunning(), false);
});

test('restarting the timer clears any previous countdown', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let expireCount = 0;
  const timer = Timer.createTimer({ tickIntervalMs: 1000, onExpire: () => { expireCount++; } });
  timer.start(5);
  t.mock.timers.tick(2000); // 3 sec remaining
  timer.start(10); // restart with a fresh longer duration
  assert.strictEqual(timer.getRemainingSec(), 10);
  t.mock.timers.tick(5000);
  assert.strictEqual(expireCount, 0, 'should not have expired yet after restart');
});
