import type { PlaybackSnapshot } from "../data/futsalScript";

/**
 * Only 3 curated sound effects across the entire video:
 * - whoosh: solely when an element moves or appears on screen
 * - whistle: referee whistle on kickoff / fouls / infractions
 * - select: crisp UI selection tone when an item/zone/tab/formation is selected
 */
export type SfxType = "whoosh" | "whistle" | "select";

export interface SfxMilestone {
  key: string;
  atProgress: number;
  sfx: SfxType;
}

const CUE_MILESTONES: Record<string, SfxMilestone[]> = {
  "s2-c1": [
    { key: "sports-enter", atProgress: 0.14, sfx: "whoosh" },
    { key: "fusion-enter", atProgress: 0.58, sfx: "whoosh" },
  ],
  "s2-c2": [{ key: "timeline-sweep", atProgress: 0.06, sfx: "whoosh" }],
  "s2-c3": [{ key: "cycle-enter", atProgress: 0.08, sfx: "whoosh" }],
  "s3-c1": [{ key: "rules-enter", atProgress: 0.06, sfx: "whoosh" }],
  "s3-c2": [{ key: "pyramid-enter", atProgress: 0.08, sfx: "whoosh" }],
  "s4-c1": [{ key: "court-kickoff", atProgress: 0.04, sfx: "whistle" }],
  "s4-c2": [
    { key: "court-center-move", atProgress: 0.02, sfx: "whoosh" },
    { key: "zone-p6-select", atProgress: 0.23, sfx: "select" },
    { key: "zone-p10-select", atProgress: 0.39, sfx: "select" },
    { key: "zone-goal-select", atProgress: 0.63, sfx: "select" },
    { key: "zone-center-select", atProgress: 0.76, sfx: "select" },
  ],
  "s5-c1": [
    { key: "t1-select", atProgress: 0.02, sfx: "select" },
    { key: "t1-card", atProgress: 0.08, sfx: "whoosh" },
  ],
  "s5-c2": [
    { key: "t2-select", atProgress: 0.02, sfx: "select" },
    { key: "t2-card", atProgress: 0.08, sfx: "whoosh" },
  ],
  "s5-c3": [
    { key: "t3-select", atProgress: 0.02, sfx: "select" },
    { key: "t3-card", atProgress: 0.08, sfx: "whoosh" },
  ],
  "s5-c4": [
    { key: "t4-select", atProgress: 0.02, sfx: "select" },
    { key: "t4-card", atProgress: 0.08, sfx: "whoosh" },
  ],
  "s5-c5": [
    { key: "t5-select", atProgress: 0.02, sfx: "select" },
    { key: "t5-card", atProgress: 0.08, sfx: "whoosh" },
  ],
  "s5-c6": [
    { key: "t6-select", atProgress: 0.02, sfx: "select" },
    { key: "t6-card", atProgress: 0.08, sfx: "whoosh" },
  ],
  "s6-c1": [
    { key: "r1-select", atProgress: 0.02, sfx: "select" },
    { key: "r1-cards", atProgress: 0.08, sfx: "whoosh" },
  ],
  "s6-c2": [{ key: "r2-select", atProgress: 0.02, sfx: "select" }],
  "s6-c3": [
    { key: "r3-select", atProgress: 0.02, sfx: "select" },
    { key: "r3-whistle", atProgress: 0.55, sfx: "whistle" },
  ],
  "s6-c4": [
    { key: "r4-select", atProgress: 0.02, sfx: "select" },
    { key: "r4-shot", atProgress: 0.65, sfx: "whoosh" },
  ],
  "s6-c5": [{ key: "r5-select", atProgress: 0.02, sfx: "select" }],
  "s6-c6": [
    { key: "r6-select", atProgress: 0.02, sfx: "select" },
    { key: "r6-whistle", atProgress: 0.12, sfx: "whistle" },
  ],
  "s6-c7": [
    { key: "r7-select", atProgress: 0.02, sfx: "select" },
    { key: "r7-whistle", atProgress: 0.45, sfx: "whistle" },
  ],
  "s7-c1": [{ key: "col1-select", atProgress: 0.04, sfx: "select" }],
  "s7-c2": [{ key: "col2-select", atProgress: 0.04, sfx: "select" }],
  "s7-c3": [
    { key: "col3-select", atProgress: 0.04, sfx: "select" },
    { key: "col3-whistle", atProgress: 0.5, sfx: "whistle" },
  ],
  "s8-c1": [{ key: "gk-move", atProgress: 0.36, sfx: "whoosh" }],
  "s9-c1": [
    { key: "form-22-select", atProgress: 0.28, sfx: "select" },
    { key: "form-22-move", atProgress: 0.29, sfx: "whoosh" },
    { key: "form-31-select", atProgress: 0.56, sfx: "select" },
    { key: "form-31-move", atProgress: 0.57, sfx: "whoosh" },
    { key: "form-40-select", atProgress: 0.84, sfx: "select" },
  ],
  "s10-c1": [{ key: "closing-enter", atProgress: 0.18, sfx: "whoosh" }],
  "cred-c1": [{ key: "credits-badge", atProgress: 0.4, sfx: "whoosh" }],
};

export function collectDueSfxEvents(
  snapshot: PlaybackSnapshot,
  triggeredKeys: Set<string>,
  _lastCueId: string | null
): { key: string; sfx: SfxType }[] {
  const due: { key: string; sfx: SfxType }[] = [];
  const cueId = snapshot.activeCue.id;

  const list = CUE_MILESTONES[cueId];
  if (!list) return due;

  for (const item of list) {
    const fullKey = `${cueId}:${item.key}`;
    if (snapshot.cueProgress >= item.atProgress && !triggeredKeys.has(fullKey)) {
      triggeredKeys.add(fullKey);
      due.push({ key: fullKey, sfx: item.sfx });
    }
  }

  return due;
}
