import test from "node:test";
import assert from "node:assert/strict";
import { FUTSAL_SCENES, computeTimeline, getPlaybackSnapshot } from "../data/futsalScript";
import { collectDueSfxEvents } from "./soundTimeline";

test("collectDueSfxEvents uses only whoosh, whistle, and select without duplicates", () => {
  const tl = computeTimeline(FUTSAL_SCENES, {});
  const triggered = new Set<string>();
  const allowed = new Set(["whoosh", "whistle", "select"]);

  for (const cue of tl.cues) {
    for (const frac of [0.05, 0.3, 0.6, 0.9]) {
      const t = cue.startTime + (cue.endTime - cue.startTime) * frac;
      const snap = getPlaybackSnapshot(tl, t);
      const events = collectDueSfxEvents(snap, triggered, cue.id);
      for (const ev of events) {
        assert.ok(allowed.has(ev.sfx), `Unexpected SFX type: ${ev.sfx}`);
      }
    }
  }

  // Re-evaluating same snapshot produces zero duplicates
  const snap4 = getPlaybackSnapshot(tl, tl.scenes[2].startTime + 0.5);
  assert.equal(collectDueSfxEvents(snap4, triggered, snap4.activeCue.id).length, 0);
});

test("scene-4 court centering and scene-5 techniques trigger expected curated SFX", () => {
  const tl = computeTimeline(FUTSAL_SCENES, {});
  const triggered = new Set<string>();

  const s4c2 = tl.cues.find((c) => c.id === "s4-c2")!;
  const snapCenter = getPlaybackSnapshot(tl, s4c2.startTime + 0.6);
  const centerEvents = collectDueSfxEvents(snapCenter, triggered, "s4-c1");
  assert.ok(centerEvents.some((e) => e.sfx === "whoosh"));

  const s5c1 = tl.cues.find((c) => c.id === "s5-c1")!;
  const snapTech = getPlaybackSnapshot(tl, s5c1.startTime + 1.0);
  const techEvents = collectDueSfxEvents(snapTech, triggered, "s4-c2");
  assert.ok(techEvents.some((e) => e.sfx === "select"));
  assert.ok(techEvents.some((e) => e.sfx === "whoosh"));
});
