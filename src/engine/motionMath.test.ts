import test from "node:test";
import assert from "node:assert/strict";
import {
  clamp01,
  easeOutExpo,
  easeOutBack,
  stagger,
  formatTimecode,
  courtToCanvas,
} from "./motionMath";

test("clamp01 bounds values between 0 and 1", () => {
  assert.equal(clamp01(-0.4), 0);
  assert.equal(clamp01(0.5), 0.5);
  assert.equal(clamp01(1.8), 1);
});

test("easing curves start at 0 and finish at 1", () => {
  assert.equal(easeOutExpo(0), 0);
  assert.equal(easeOutExpo(1), 1);
  assert.ok(easeOutExpo(0.5) > 0.9);

  assert.ok(Math.abs(easeOutBack(0)) < 1e-6);
  assert.ok(Math.abs(easeOutBack(1) - 1) < 1e-6);
  assert.ok(easeOutBack(0.6) > 1);
});

test("stagger orders sequential items smoothly", () => {
  const t = 0.35;
  const first = stagger(t, 0, 4);
  const last = stagger(t, 3, 4);
  assert.ok(first > last);
  assert.equal(stagger(1, 3, 4), 1);
});

test("formatTimecode formats MM:SS cleanly", () => {
  assert.equal(formatTimecode(0), "00:00");
  assert.equal(formatTimecode(15), "00:15");
  assert.equal(formatTimecode(75.9), "01:15");
  assert.equal(formatTimecode(-5), "00:00");
});

test("courtToCanvas projects 40x20 futsal meters to canvas pixels", () => {
  const rect = { x: 100, y: 50, w: 800, h: 400 };
  const center = courtToCanvas(20, 10, rect);
  assert.deepEqual(center, { x: 500, y: 250 });
  const corner = courtToCanvas(40, 20, rect);
  assert.deepEqual(corner, { x: 900, y: 450 });
});
