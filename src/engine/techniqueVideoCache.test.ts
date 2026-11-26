import test from "node:test";
import assert from "node:assert/strict";
import { computeVideoCycleState } from "./techniqueVideoCache";

test("computeVideoCycleState plays a single natural pass from 0% to 100% across cue duration", () => {
  const clipDur = 5.04;
  const cueDur = 9.0; // e.g., Remate narration

  const start = computeVideoCycleState(0.0, clipDur, cueDur);
  assert.equal(start.passIndex, 1);
  assert.equal(start.targetVideoTime, 0);
  assert.ok(Math.abs(start.playbackRate - clipDur / cueDur) < 1e-6);

  const mid = computeVideoCycleState(4.5, clipDur, cueDur);
  assert.equal(mid.passIndex, 1);
  assert.ok(Math.abs(mid.targetVideoTime - 2.5) < 1e-6);

  const end = computeVideoCycleState(9.0, clipDur, cueDur);
  assert.equal(end.passIndex, 1);
  assert.ok(Math.abs(end.targetVideoTime - (clipDur - 0.04)) < 1e-6);
});
