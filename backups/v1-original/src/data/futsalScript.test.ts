import test from "node:test";
import assert from "node:assert/strict";
import {
  FUTSAL_SCENES,
  CUE_GAP_SEC,
  computeTimeline,
  getPlaybackSnapshot,
  getNarratableCues,
} from "./futsalScript";

test("excludes Intro, Scene 1, and Scene 5 per user instruction", () => {
  const ids = FUTSAL_SCENES.map((s) => s.id);
  assert.deepEqual(ids, [
    "scene-2",
    "scene-3",
    "scene-4",
    "scene-6",
    "scene-7",
    "scene-8",
    "scene-9",
    "scene-10",
    "credits",
  ]);
});

test("credits contain required sources and Instagram handle", () => {
  const credits = FUTSAL_SCENES.find((s) => s.id === "credits");
  assert.ok(credits);
  const text = credits.cues[0].text;
  assert.match(text, /FIFA/);
  assert.match(text, /The FA/);
  assert.match(text, /futsal\.com/);
  assert.match(text, /Wikipedia/);
  assert.match(text, /AMF/);
  assert.match(text, /futsal\.tech/);
  assert.match(text, /@deptoEF\.ET20/);
});

test("computeTimeline locks cue durations to real AI audio durations when provided", () => {
  const customDurations: Record<string, number> = {
    "s2-c1": 8.2,
    "s2-c2": 6.4,
  };
  const tl = computeTimeline(FUTSAL_SCENES, customDurations, CUE_GAP_SEC);

  assert.equal(tl.cues[0].startTime, 0);
  assert.ok(Math.abs(tl.cues[0].endTime - (8.2 + CUE_GAP_SEC)) < 1e-6);
  assert.equal(tl.cues[0].hasRealAudio, true);

  assert.ok(Math.abs(tl.cues[1].startTime - tl.cues[0].endTime) < 1e-6);
  assert.ok(Math.abs(tl.cues[1].endTime - (8.2 + 6.4 + 2 * CUE_GAP_SEC)) < 1e-6);
  assert.equal(tl.cues[2].hasRealAudio, false);
});

test("getPlaybackSnapshot resolves active scene and cue accurately", () => {
  const tl = computeTimeline(FUTSAL_SCENES, {}, 0.35);
  const snapStart = getPlaybackSnapshot(tl, 0);
  assert.equal(snapStart.activeScene.scene.id, "scene-2");
  assert.equal(snapStart.activeCue.id, "s2-c1");

  const scene4 = tl.scenes.find((s) => s.scene.id === "scene-4")!;
  const snapScene4 = getPlaybackSnapshot(tl, scene4.startTime + 0.5);
  assert.equal(snapScene4.activeScene.scene.id, "scene-4");
  assert.equal(snapScene4.activeCue.sceneId, "scene-4");

  const snapEnd = getPlaybackSnapshot(tl, tl.totalDuration + 10);
  assert.equal(snapEnd.activeScene.scene.id, "credits");
});

test("getNarratableCues excludes silent credits cue", () => {
  const narratable = getNarratableCues(FUTSAL_SCENES);
  assert.equal(narratable.some((c) => c.sceneId === "credits"), false);
  assert.equal(narratable.length, 20);
});
