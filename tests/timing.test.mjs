import assert from 'node:assert/strict';
import test from 'node:test';

import {
  layerStartOffsetSeconds,
  layerTimingState,
  staggerOrder,
} from '../lib/timing.ts';

const linear = { h1x: 0, h1y: 0, h2x: 1, h2y: 1 };

function timing(overrides = {}) {
  return {
    frame: 0,
    fps: 30,
    duration: 1.6,
    cycles: 1,
    delay: 0,
    stagger: 2 / 30,
    group: 'Carousel',
    index: 0,
    count: 6,
    direction: 'up',
    easing: linear,
    ...overrides,
  };
}

test('Carousel layers start two frames apart at 30 FPS', () => {
  const offsets = [0, 1, 2].map((index) =>
    layerStartOffsetSeconds(timing({ index })) * 30
  );

  assert.deepEqual(offsets, [0, 2, 4]);
  assert.equal(layerTimingState(timing({ frame: 2, index: 1 })).progress, 0);
  assert.ok(layerTimingState(timing({ frame: 3, index: 1 })).progress > 0);
});

test('delay shifts motion without changing its active duration or speed', () => {
  const delay = 10 / 30;
  const elapsedInsideMotion = 0.8;
  const delayed = layerTimingState(timing({
    delay,
    stagger: 0,
    frame: (delay + elapsedInsideMotion) * 30,
  }));
  const immediate = layerTimingState(timing({
    stagger: 0,
    frame: elapsedInsideMotion * 30,
  }));

  assert.equal(layerTimingState(timing({ delay, stagger: 0, frame: 9 })).progress, 0);
  assert.ok(Math.abs(delayed.progress - immediate.progress) < 1e-10);
  assert.ok(Math.abs(delayed.progress - 0.5) < 1e-10);
});

test('reverse directions invert stagger order', () => {
  assert.equal(staggerOrder(0, 6, 'up'), 0);
  assert.equal(staggerOrder(5, 6, 'up'), 5);
  assert.equal(staggerOrder(0, 6, 'down'), 5);
  assert.equal(staggerOrder(5, 6, 'down'), 0);
  assert.equal(staggerOrder(0, 6, 'right'), 5);
  assert.equal(staggerOrder(5, 6, 'reverse'), 0);
});

test('stored seconds render consistently and display correctly across FPS values', () => {
  const fpsValues = [15, 25, 30, 60];
  const storedStagger = 2 / 30;
  const displayedFrames = fpsValues.map((fps) => Math.round(storedStagger * fps));
  const progressValues = fpsValues.map((fps) =>
    layerTimingState(timing({
      fps,
      stagger: storedStagger,
      index: 1,
      frame: (storedStagger + 0.8) * fps,
    })).progress
  );

  assert.deepEqual(displayedFrames, [1, 2, 2, 4]);
  for (const progress of progressValues) {
    assert.ok(Math.abs(progress - 0.5) < 1e-10);
  }
});

test('Marquee stagger remains a percentage handled by its transform', () => {
  const first = layerStartOffsetSeconds(timing({
    group: 'Marquee',
    delay: 0.25,
    stagger: 80,
    index: 0,
  }));
  const last = layerStartOffsetSeconds(timing({
    group: 'Marquee',
    delay: 0.25,
    stagger: 80,
    index: 5,
  }));

  assert.equal(first, 0.25);
  assert.equal(last, 0.25);
});
