import type { PlaybackSnapshot } from "../data/futsalScript";
import {
  clamp01,
  courtToCanvas,
  easeInOutCubic,
  easeOutBack,
  easeOutExpo,
  lerp,
  stagger,
  type Rect,
} from "./motionMath";
import {
  computeVideoCycleState,
  techniqueMediaStore,
} from "./techniqueVideoCache";

export const LOGICAL_WIDTH = 1280;
export const LOGICAL_HEIGHT = 720;

const FONT_DISPLAY = '"Barlow Condensed", sans-serif';
const FONT_SANS = '"Plus Jakarta Sans", sans-serif';
const FONT_MONO = '"JetBrains Mono", monospace';

const PALETTE = {
  bgDeep: "#080D13",
  bgSurface: "#101822",
  bgCard: "rgba(17, 25, 36, 0.92)",
  border: "rgba(148, 163, 184, 0.18)",
  emerald: "#10B981",
  emeraldBright: "#34D399",
  amber: "#F59E0B",
  sky: "#38BDF8",
  coral: "#EF4444",
  textPrimary: "#F8FAFC",
  textMuted: "#94A3B8",
  courtGreen: "#0D4D3B",
  courtBorder: "#34D399",
};

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string = PALETTE.bgCard,
  stroke: string = PALETTE.border,
  lineWidth: number = 1.5
) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number = 3,
  dashed: boolean = false
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 12;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  if (dashed) ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFutsalBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotRad: number = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotRad);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#F8FAFC";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#0F172A";
  ctx.stroke();

  // Pentagon pattern
  ctx.fillStyle = "#0F172A";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const px = Math.cos(a) * radius * 0.44;
    const py = Math.sin(a) * radius * 0.44;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.44, Math.sin(a) * radius * 0.44);
    ctx.lineTo(Math.cos(a) * radius * 0.92, Math.sin(a) * radius * 0.92);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#0F172A";
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerToken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string,
  subLabel?: string,
  pulse: number = 0
) {
  ctx.save();
  if (pulse > 0) {
    ctx.beginPath();
    ctx.arc(x, y, 22 + pulse * 14, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = (1 - pulse) * 0.45;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#080D13";
  ctx.stroke();

  ctx.fillStyle = "#080D13";
  ctx.font = `700 13px ${FONT_MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 0.5);

  if (subLabel) {
    ctx.fillStyle = "#E2E8F0";
    ctx.font = `600 12px ${FONT_SANS}`;
    ctx.fillText(subLabel, x, y + 30);
  }
  ctx.restore();
}

function drawFutsalCourtLines(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  drawProgress: number = 1,
  highlight?: {
    area6m?: boolean;
    penal6m?: boolean;
    penal10m?: boolean;
    goals?: boolean;
    centerCircle?: boolean;
    dimensions?: boolean;
  }
) {
  ctx.save();
  // Court floor
  roundRectPath(ctx, rect.x - 16, rect.y - 16, rect.w + 32, rect.h + 32, 14);
  ctx.fillStyle = "#0B2E26";
  ctx.fill();

  // Subtle hardwood / futsal parquet stripes
  ctx.save();
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 4);
  ctx.clip();
  const stripes = 16;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.03)";
    ctx.fillRect(rect.x + (i * rect.w) / stripes, rect.y, rect.w / stripes + 1, rect.h);
  }
  ctx.restore();

  const alpha = clamp01(drawProgress);
  ctx.strokeStyle = `rgba(248, 250, 252, ${0.88 * alpha})`;
  ctx.lineWidth = 2.5;

  // Perimeter
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

  // Halfway line
  const midX = rect.x + rect.w / 2;
  const midY = rect.y + rect.h / 2;
  ctx.beginPath();
  ctx.moveTo(midX, rect.y);
  ctx.lineTo(midX, rect.y + rect.h);
  ctx.stroke();

  // Center circle (3m radius out of 20m height -> r = (3/20)*rect.h)
  const centerR = (3 / 20) * rect.h;
  ctx.save();
  if (highlight?.centerCircle) {
    ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 3.5;
  }
  ctx.beginPath();
  ctx.arc(midX, midY, centerR, 0, Math.PI * 2);
  if (highlight?.centerCircle) ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(midX, midY, 4, 0, Math.PI * 2);
  ctx.fillStyle = highlight?.centerCircle ? PALETTE.sky : "#F8FAFC";
  ctx.fill();
  ctx.restore();

  // 6m Goalkeeper area (FIFA futsal D-area: two quarter circles + straight 3.16m segment)
  const areaR = (6 / 40) * rect.w;
  const goalHalf = (1.5 / 20) * rect.h;

  const drawGoalArea = (isLeft: boolean) => {
    const gx = isLeft ? rect.x : rect.x + rect.w;
    ctx.save();
    if (highlight?.area6m) {
      ctx.fillStyle = "rgba(16, 185, 129, 0.24)";
      ctx.strokeStyle = PALETTE.emeraldBright;
      ctx.lineWidth = 3.5;
    }
    ctx.beginPath();
    if (isLeft) {
      ctx.arc(gx, midY - goalHalf, areaR, -Math.PI / 2, 0);
      ctx.lineTo(gx + areaR, midY + goalHalf);
      ctx.arc(gx, midY + goalHalf, areaR, 0, Math.PI / 2);
    } else {
      ctx.arc(gx, midY - goalHalf, areaR, -Math.PI / 2, -Math.PI, true);
      ctx.lineTo(gx - areaR, midY + goalHalf);
      ctx.arc(gx, midY + goalHalf, areaR, Math.PI, Math.PI / 2, true);
    }
    if (highlight?.area6m) ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  drawGoalArea(true);
  drawGoalArea(false);

  // Penalty spots (6m)
  const p6Left = courtToCanvas(6, 10, rect);
  const p6Right = courtToCanvas(34, 10, rect);
  for (const pt of [p6Left, p6Right]) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, highlight?.penal6m ? 7 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = highlight?.penal6m ? PALETTE.amber : "#F8FAFC";
    ctx.fill();
    ctx.restore();
  }

  // Second penalty spots (10m)
  const p10Left = courtToCanvas(10, 10, rect);
  const p10Right = courtToCanvas(30, 10, rect);
  for (const pt of [p10Left, p10Right]) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, highlight?.penal10m ? 7 : 4, 0, Math.PI * 2);
    ctx.fillStyle = highlight?.penal10m ? PALETTE.coral : "#F8FAFC";
    ctx.fill();
    ctx.restore();
  }

  // Goals (3m x 2m)
  const goalDepth = 14;
  ctx.save();
  ctx.strokeStyle = highlight?.goals ? PALETTE.amber : "#F8FAFC";
  ctx.lineWidth = highlight?.goals ? 4 : 3;
  ctx.strokeRect(rect.x - goalDepth, midY - goalHalf, goalDepth, goalHalf * 2);
  ctx.strokeRect(rect.x + rect.w, midY - goalHalf, goalDepth, goalHalf * 2);
  ctx.restore();

  ctx.restore();
}

function drawBroadcastBackdrop(ctx: CanvasRenderingContext2D, globalTime: number) {
  const grad = ctx.createLinearGradient(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  grad.addColorStop(0, "#070B10");
  grad.addColorStop(0.55, "#0D1520");
  grad.addColorStop(1, "#091118");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Subtle kinetic grid
  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.055)";
  ctx.lineWidth = 1;
  const gridSize = 48;
  const driftX = (globalTime * 14) % gridSize;
  for (let x = -gridSize + driftX; x < LOGICAL_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, LOGICAL_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < LOGICAL_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(LOGICAL_WIDTH, y);
    ctx.stroke();
  }

  // Dynamic diagonal broadcast light sweep
  const sweepX = ((globalTime * 90) % (LOGICAL_WIDTH + 600)) - 300;
  const sweepGrad = ctx.createLinearGradient(sweepX, 0, sweepX + 280, LOGICAL_HEIGHT);
  sweepGrad.addColorStop(0, "rgba(16, 185, 129, 0)");
  sweepGrad.addColorStop(0.5, "rgba(16, 185, 129, 0.045)");
  sweepGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
  ctx.fillStyle = sweepGrad;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.restore();
}

function drawBroadcastHeader(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot
) {
  const { activeScene, sceneElapsed } = snapshot;
  const enter = easeOutExpo(clamp01(sceneElapsed / 0.55));
  const xOffset = lerp(-36, 0, enter);

  ctx.save();
  ctx.globalAlpha = enter;
  ctx.translate(xOffset, 0);

  // Left emerald anchor bar
  ctx.fillStyle = PALETTE.emerald;
  ctx.fillRect(48, 30, 4, 30);

  // Title only (no scene number, speaker, or time range)
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = `700 28px ${FONT_DISPLAY}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(activeScene.scene.title.toUpperCase(), 64, 31);

  // Top-right progress indicator (scene index)
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = `500 13px ${FONT_MONO}`;
  ctx.fillText(
    `${String(snapshot.sceneIndex + 1).padStart(2, "0")} / 10`,
    LOGICAL_WIDTH - 48,
    34
  );

  ctx.restore();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawKineticSubtitle(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot
) {
  const { activeCue, cueProgress } = snapshot;
  if (activeCue.silent || !activeCue.text) return;

  ctx.save();
  const enter = easeOutExpo(clamp01(cueProgress / 0.12));
  const boxW = 1120;
  const boxX = (LOGICAL_WIDTH - boxW) / 2;

  ctx.font = `600 21px ${FONT_SANS}`;
  const lines = wrapLines(ctx, activeCue.text, boxW - 56);
  const lineH = 30;
  const boxH = Math.max(66, lines.length * lineH + 26);
  const boxY = LOGICAL_HEIGHT - boxH - 22 + lerp(14, 0, enter);

  ctx.globalAlpha = enter;
  roundRectPath(ctx, boxX, boxY, boxW, boxH, 12);
  ctx.fillStyle = "rgba(6, 10, 15, 0.88)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.stroke();

  // Subtle voice-sync progress bar along bottom edge of subtitle box
  const barW = (boxW - 24) * clamp01(cueProgress);
  ctx.fillStyle = PALETTE.emerald;
  ctx.fillRect(boxX + 12, boxY + boxH - 4, barW, 2.5);

  // Word-by-word gentle highlight sweep synced to audio progress
  const totalWords = activeCue.text.split(/\s+/).length;
  const activeWordIdx = Math.floor(clamp01(cueProgress / 0.92) * totalWords);
  let wordCounter = 0;

  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const startY = boxY + 13;

  for (let li = 0; li < lines.length; li++) {
    const lineWords = lines[li].split(" ");
    const fullLineWidth = ctx.measureText(lines[li]).width;
    let cursorX = LOGICAL_WIDTH / 2 - fullLineWidth / 2;
    const lineY = startY + li * lineH;

    for (let wi = 0; wi < lineWords.length; wi++) {
      const w = lineWords[wi];
      const suffix = wi < lineWords.length - 1 ? " " : "";
      const isSpoken = wordCounter <= activeWordIdx;
      ctx.fillStyle = isSpoken ? "#FFFFFF" : "#94A3B8";
      ctx.fillText(w + suffix, cursorX, lineY);
      cursorX += ctx.measureText(w + suffix).width;
      wordCounter++;
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// SCENE 2: ORIGEN E HISTORIA
// ---------------------------------------------------------------------------
function renderScene2(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot,
  globalTime: number
) {
  const { cueIndexInScene, cueProgress } = snapshot;

  if (cueIndexInScene === 0) {
    // 1930 Montevideo + Uruguay Map + 4 Sports Fusion
    const p = cueProgress;
    const mapIn = easeOutExpo(clamp01(p * 3));

    // Left Card: Stylized Map of Uruguay & Montevideo Pin
    drawCard(ctx, 56, 108, 480, 444, 16, "rgba(15, 23, 34, 0.85)", "rgba(52, 211, 153, 0.25)");
    ctx.save();
    const mapCenterX = 296;
    const mapCenterY = 278;
    const scale = lerp(0.84, 0.92, p);
    ctx.translate(mapCenterX, mapCenterY);
    ctx.scale(scale, scale);

    // Stylized Uruguay silhouette polygon
    ctx.beginPath();
    ctx.moveTo(-78, -110);
    ctx.lineTo(25, -125);
    ctx.lineTo(105, -35);
    ctx.lineTo(125, 55);
    ctx.lineTo(65, 118);
    ctx.lineTo(-42, 128);
    ctx.lineTo(-98, 92);
    ctx.lineTo(-108, -18);
    ctx.closePath();
    ctx.fillStyle = `rgba(16, 185, 129, ${0.18 * mapIn})`;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = PALETTE.emeraldBright;
    ctx.stroke();

    // Montevideo pin (southern coast)
    const pinX = -20;
    const pinY = 108;
    const pulse = (globalTime * 1.4) % 1;
    ctx.beginPath();
    ctx.arc(pinX, pinY, 10 + pulse * 24, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245, 158, 11, ${(1 - pulse) * 0.8})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pinX, pinY, 8, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.amber;
    ctx.fill();
    ctx.restore();

    // Clean callout badge below the silhouette so text never overlaps the border
    const pinWorldX = mapCenterX + -20 * scale;
    const pinWorldY = mapCenterY + 108 * scale;
    const badgeX = 96;
    const badgeY = 446;
    const badgeW = 400;
    const badgeH = 78;

    ctx.save();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.55)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pinWorldX, pinWorldY + 10);
    ctx.lineTo(mapCenterX, badgeY);
    ctx.stroke();
    ctx.setLineDash([]);

    drawCard(ctx, badgeX, badgeY, badgeW, badgeH, 12, "rgba(8, 13, 19, 0.92)", "rgba(245, 158, 11, 0.45)", 1.5);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#F8FAFC";
    ctx.font = `700 24px ${FONT_DISPLAY}`;
    ctx.fillText("MONTEVIDEO, URUGUAY", mapCenterX, badgeY + 28);
    ctx.fillStyle = PALETTE.amber;
    ctx.font = `600 14px ${FONT_MONO}`;
    ctx.fillText("1930 · YMCA", mapCenterX, badgeY + 55);
    ctx.restore();

    // Right side: Creator + 4 Sports merging into Futsal
    ctx.save();
    ctx.fillStyle = PALETTE.textPrimary;
    ctx.font = `800 54px ${FONT_DISPLAY}`;
    ctx.fillText("1930 · EL NACIMIENTO", 576, 148);

    ctx.fillStyle = PALETTE.emeraldBright;
    ctx.font = `600 20px ${FONT_SANS}`;
    ctx.fillText("Prof. Juan Carlos Ceriani Gravier · YMCA", 576, 182);

    const sports = [
      { name: "Fútbol 11", desc: "Arcos, pases y esencia", color: PALETTE.emeraldBright },
      { name: "Básquetbol", desc: "5 jugadores · 20×20 min", color: PALETTE.amber },
      { name: "Balonmano", desc: "Área y dimensiones de arco", color: PALETTE.sky },
      { name: "Waterpolo", desc: "Reglas del arquero", color: "#A78BFA" },
    ];

    sports.forEach((sp, idx) => {
      const s = stagger(clamp01(p * 1.5), idx, 4, 0.5);
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = 576 + col * 326;
      const cy = 228 + row * 124 + lerp(28, 0, s);
      ctx.globalAlpha = s;
      drawCard(ctx, cx, cy, 306, 106, 12, "rgba(15, 23, 34, 0.92)", sp.color, 1.5);
      ctx.fillStyle = sp.color;
      ctx.font = `700 24px ${FONT_DISPLAY}`;
      ctx.fillText(sp.name.toUpperCase(), cx + 22, cy + 40);
      ctx.fillStyle = PALETTE.textMuted;
      ctx.font = `500 15px ${FONT_SANS}`;
      ctx.fillText(sp.desc, cx + 22, cy + 72);
    });

    const badgeReveal = easeOutBack(clamp01((p - 0.55) / 0.3));
    if (badgeReveal > 0) {
      ctx.globalAlpha = clamp01(badgeReveal);
      drawCard(ctx, 576, 488, 632, 62, 12, "rgba(16, 185, 129, 0.16)", PALETTE.emeraldBright, 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 24px ${FONT_DISPLAY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("4 DEPORTES → UN SOLO JUEGO: FÚTBOL DE SALÓN", 576 + 316, 488 + 31);
    }
    ctx.restore();
  } else if (cueIndexInScene === 1) {
    // 1971 FIFUSA -> 1982 Mundial Sao Paulo -> 1985 Nombre "FUTSAL"
    const p = cueProgress;
    const milestones = [
      { year: "1971", title: "Fundación de la FIFUSA", detail: "Federación Internacional en São Paulo", accent: PALETTE.sky },
      { year: "1982", title: "1.er Mundial FIFUSA", detail: "São Paulo · Campeón: Brasil ★", accent: PALETTE.amber },
      { year: "1985", title: 'Nombre oficial: "FUTSAL"', detail: "Fútbol + Salón adoptado globalmente", accent: PALETTE.emeraldBright },
    ];

    const lineProg = easeInOutCubic(clamp01(p * 1.25));
    const trackY = 310;
    const startX = 160;
    const endX = 1120;

    // Base line
    ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(startX, trackY);
    ctx.lineTo(endX, trackY);
    ctx.stroke();

    // Active glowing progress line
    ctx.strokeStyle = PALETTE.emeraldBright;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(startX, trackY);
    ctx.lineTo(lerp(startX, endX, lineProg), trackY);
    ctx.stroke();

    milestones.forEach((m, idx) => {
      const mProg = stagger(clamp01(p * 1.35), idx, 3, 0.45);
      const cx = lerp(240, 1040, idx / 2);
      const cy = trackY;

      ctx.save();
      ctx.globalAlpha = mProg;
      // Node ring
      ctx.beginPath();
      ctx.arc(cx, cy, 18 * easeOutBack(mProg), 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.bgDeep;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = m.accent;
      ctx.stroke();

      // Year big display above
      ctx.textAlign = "center";
      ctx.fillStyle = m.accent;
      ctx.font = `800 68px ${FONT_DISPLAY}`;
      ctx.fillText(m.year, cx, cy - 60 + lerp(20, 0, mProg));

      // Info card below
      drawCard(ctx, cx - 155, cy + 44 + lerp(24, 0, mProg), 310, 134, 14, PALETTE.bgCard, m.accent, 1.5);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 22px ${FONT_DISPLAY}`;
      ctx.fillText(m.title.toUpperCase(), cx, cy + 92 + lerp(24, 0, mProg));
      ctx.fillStyle = PALETTE.textMuted;
      ctx.font = `500 15px ${FONT_SANS}`;
      ctx.fillText(m.detail, cx, cy + 128 + lerp(24, 0, mProg));
      ctx.restore();
    });
  } else {
    // 1989 FIFA World Cup in Netherlands -> Brazil Winner -> Every 4 years
    const p = cueProgress;
    const enter = easeOutExpo(clamp01(p * 2.2));

    drawCard(ctx, 84, 130, 560, 410, 16, PALETTE.bgCard, "rgba(245, 158, 11, 0.35)");
    ctx.save();
    ctx.globalAlpha = enter;
    ctx.fillStyle = PALETTE.amber;
    ctx.font = `700 16px ${FONT_MONO}`;
    ctx.fillText("PRIMER MUNDIAL OFICIAL FIFA", 120, 180);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 84px ${FONT_DISPLAY}`;
    ctx.fillText("1989", 120, 265);

    ctx.fillStyle = PALETTE.emeraldBright;
    ctx.font = `700 32px ${FONT_DISPLAY}`;
    ctx.fillText("PAÍSES BAJOS · 5 AL 15 DE ENERO", 120, 315);

    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `500 18px ${FONT_SANS}`;
    ctx.fillText("Organizado por la FIFA bajo reglamento unificado.", 120, 365);

    drawCard(ctx, 120, 410, 488, 92, 12, "rgba(245, 158, 11, 0.14)", PALETTE.amber, 1.5);
    ctx.fillStyle = PALETTE.amber;
    ctx.font = `700 28px ${FONT_DISPLAY}`;
    ctx.fillText("CAMPEÓN: BRASIL ★", 148, 452);
    ctx.fillStyle = "#F8FAFC";
    ctx.font = `500 15px ${FONT_SANS}`;
    ctx.fillText("Inició la era moderna de los mundiales FIFA.", 148, 480);
    ctx.restore();

    // Right: Animated 4-year cycle orbital ring
    ctx.save();
    const cx = 940;
    const cy = 335;
    const radius = 148;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
    ctx.lineWidth = 4;
    ctx.stroke();

    const arcEnd = -Math.PI / 2 + Math.PI * 2 * clamp01(p * 1.4);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, arcEnd);
    ctx.strokeStyle = PALETTE.emeraldBright;
    ctx.lineWidth = 6;
    ctx.stroke();

    const years = ["1989", "1992", "1996", "2000+"];
    years.forEach((yr, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / 4;
      const nx = cx + Math.cos(angle) * radius;
      const ny = cy + Math.sin(angle) * radius;
      const nodeProg = stagger(clamp01(p * 1.5), i, 4, 0.4);
      ctx.globalAlpha = nodeProg;
      ctx.beginPath();
      ctx.arc(nx, ny, 24, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.bgSurface;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = PALETTE.emeraldBright;
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 14px ${FONT_MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(yr, nx, ny);
    });

    ctx.globalAlpha = enter;
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 44px ${FONT_DISPLAY}`;
    ctx.fillText("CADA 4 AÑOS", cx, cy - 6);
    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `500 15px ${FONT_SANS}`;
    ctx.fillText("Ciclo Mundialista FIFA", cx, cy + 28);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// SCENE 3: EVOLUCIÓN Y TORNEOS
// ---------------------------------------------------------------------------
function renderScene3(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot,
  globalTime: number
) {
  const { cueIndexInScene, cueProgress } = snapshot;

  if (cueIndexInScene === 0) {
    const items = [
      { num: "01", title: "CAMBIOS ILIMITADOS", desc: "Rotación constante sin detener el reloj", color: PALETTE.emeraldBright },
      { num: "02", title: "RETROCESO AL ARQUERO", desc: "Prohibido tomar con mano pase del pie", color: PALETTE.sky },
      { num: "03", title: "LÍMITE DE 4 SEGUNDOS", desc: "Máxima velocidad en cada reanudación", color: PALETTE.amber },
      { num: "04", title: "PELOTA N° 4", desc: "Menor rebote para control técnico al ras", color: "#A78BFA" },
      { num: "05", title: "SIN FUERA DE JUEGO", desc: "Ataques verticales en todo el campo", color: PALETTE.coral },
    ];

    items.forEach((item, i) => {
      const s = stagger(clamp01(cueProgress * 1.3), i, 5, 0.45);
      const isTop = i < 3;
      const col = isTop ? i : i - 3;
      const cardW = isTop ? 368 : 562;
      const startX = isTop ? 64 + col * 392 : 64 + col * 586;
      const cy = (isTop ? 132 : 344) + lerp(32, 0, s);

      ctx.save();
      ctx.globalAlpha = s;
      drawCard(ctx, startX, cy, cardW, 184, 14, PALETTE.bgCard, item.color, 1.5);

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = item.color;
      ctx.font = `700 15px ${FONT_MONO}`;
      ctx.fillText(`AJUSTE ${item.num}`, startX + 24, cy + 44);

      // Animated mini vector icon in top-right corner away from title & description
      const ix = startX + cardW - 46;
      const iy = cy + 44;
      if (i === 2) {
        // 4s clock ring
        const sweep = ((globalTime * 0.8) % 1) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(ix, iy, 23, -Math.PI / 2, -Math.PI / 2 + sweep);
        ctx.strokeStyle = PALETTE.amber;
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `700 15px ${FONT_MONO}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("4s", ix, iy + 0.5);
      } else if (i === 3) {
        // Low bounce ball
        const bounce = Math.abs(Math.sin(globalTime * 4)) * 10;
        drawFutsalBall(ctx, ix, iy + 6 - bounce, 16, globalTime * 2);
      } else {
        ctx.beginPath();
        ctx.arc(ix, iy, 22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fill();
        ctx.fillStyle = item.color;
        ctx.font = `700 16px ${FONT_MONO}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.num, ix, iy + 0.5);
      }

      // Title & wrapped description in full lower area (below circle)
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 26px ${FONT_DISPLAY}`;
      ctx.fillText(item.title, startX + 24, cy + 102);

      ctx.fillStyle = PALETTE.textMuted;
      ctx.font = `500 15px ${FONT_SANS}`;
      const descLines = wrapLines(ctx, item.desc, cardW - 48);
      descLines.forEach((line, li) => {
        ctx.fillText(line, startX + 24, cy + 134 + li * 21);
      });
      ctx.restore();
    });
  } else {
    // Tournament Pyramid
    const tiers = [
      { label: "MUNDIALES DE LA FIFA", sub: "Élite internacional cada 4 años", w: 420, color: PALETTE.amber },
      { label: "CAMPEONATOS CONTINENTALES", sub: "Copa América · Eurocopa · AFC", w: 600, color: PALETTE.emeraldBright },
      { label: "LIGAS NACIONALES", sub: "Clubes profesionales y ligas locales", w: 780, color: PALETTE.sky },
      { label: "COMPETENCIAS ESCOLARES Y UNIVERSITARIAS", sub: "Base formativa y deporte estudiantil", w: 960, color: "#A78BFA" },
    ];

    tiers.forEach((t, idx) => {
      const revIdx = tiers.length - 1 - idx;
      const s = stagger(clamp01(cueProgress * 1.4), revIdx, 4, 0.5);
      const y = 128 + idx * 108 + lerp(26, 0, s);
      const x = (LOGICAL_WIDTH - t.w) / 2;

      ctx.save();
      ctx.globalAlpha = s;
      drawCard(ctx, x, y, t.w, 88, 12, PALETTE.bgCard, t.color, 2);
      ctx.textAlign = "center";
      ctx.fillStyle = t.color;
      ctx.font = `700 26px ${FONT_DISPLAY}`;
      ctx.fillText(t.label, LOGICAL_WIDTH / 2, y + 38);
      ctx.fillStyle = PALETTE.textMuted;
      ctx.font = `500 15px ${FONT_SANS}`;
      ctx.fillText(t.sub, LOGICAL_WIDTH / 2, y + 66);
      ctx.restore();
    });
  }
}

// ---------------------------------------------------------------------------
// SCENE 4: EL CAMPO DE JUEGO
// ---------------------------------------------------------------------------
function renderScene4(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot,
  globalTime: number
) {
  const { cueIndexInScene, cueProgress } = snapshot;
  const centeredX = (LOGICAL_WIDTH - 850) / 2;
  const centerSlide =
    cueIndexInScene === 0 ? 0 : easeInOutCubic(clamp01(cueProgress / 0.14));
  const courtRect: Rect = {
    x: lerp(140, centeredX, centerSlide),
    y: 158,
    w: 850,
    h: 366,
  };

  if (cueIndexInScene === 0) {
    const drawP = easeOutExpo(clamp01(cueProgress * 1.5));
    drawFutsalCourtLines(ctx, courtRect, drawP, { dimensions: true });

    // Top length measurement 38 - 42 m
    const dimP = easeOutExpo(clamp01((cueProgress - 0.15) * 2.2));
    ctx.save();
    ctx.globalAlpha = dimP;
    const ly = courtRect.y - 34;
    ctx.strokeStyle = PALETTE.emeraldBright;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(courtRect.x, ly);
    ctx.lineTo(courtRect.x + courtRect.w, ly);
    ctx.moveTo(courtRect.x, ly - 8);
    ctx.lineTo(courtRect.x, ly + 8);
    ctx.moveTo(courtRect.x + courtRect.w, ly - 8);
    ctx.lineTo(courtRect.x + courtRect.w, ly + 8);
    ctx.stroke();

    const courtCenterX = courtRect.x + courtRect.w / 2;
    drawCard(ctx, courtCenterX - 140, ly - 19, 280, 38, 8, PALETTE.bgDeep, PALETTE.emeraldBright, 1.5);
    ctx.fillStyle = PALETTE.emeraldBright;
    ctx.font = `700 20px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("LARGO: 38 – 42 METROS", courtCenterX, ly);

    // Right width measurement 20 - 25 m placed cleanly outside goal net
    const rx = courtRect.x + courtRect.w + 38;
    ctx.strokeStyle = PALETTE.amber;
    ctx.beginPath();
    ctx.moveTo(rx, courtRect.y);
    ctx.lineTo(rx, courtRect.y + courtRect.h);
    ctx.moveTo(rx - 8, courtRect.y);
    ctx.lineTo(rx + 8, courtRect.y);
    ctx.moveTo(rx - 8, courtRect.y + courtRect.h);
    ctx.lineTo(rx + 8, courtRect.y + courtRect.h);
    ctx.stroke();

    drawCard(ctx, rx + 14, courtRect.y + courtRect.h / 2 - 22, 168, 44, 8, PALETTE.bgDeep, PALETTE.amber, 1.5);
    ctx.fillStyle = PALETTE.amber;
    ctx.font = `700 17px ${FONT_MONO}`;
    ctx.fillText("ANCHO: 20–25 m", rx + 14 + 84, courtRect.y + courtRect.h / 2);
    ctx.restore();
  } else {
    // Sequential highlight of zones as Moya describes them
    const p = cueProgress;
    const areaActive = p < 0.35;
    const penal6Active = p >= 0.22 && p < 0.55;
    const penal10Active = p >= 0.38 && p < 0.72;
    const goalActive = p >= 0.62 && p < 0.85;
    const centerActive = p >= 0.75;

    drawFutsalCourtLines(ctx, courtRect, 1, {
      area6m: areaActive,
      penal6m: penal6Active,
      penal10m: penal10Active,
      goals: goalActive,
      centerCircle: centerActive,
    });

    // Callout badges symmetrically centered above the centered court
    const callouts = [
      {
        active: areaActive,
        x: 240,
        y: 112,
        title: "ÁREA DEL ARQUERO",
        val: "Radio 6 m",
        color: PALETTE.emeraldBright,
      },
      {
        active: penal6Active,
        x: 440,
        y: 112,
        title: "PUNTO PENAL",
        val: "6 m",
        color: PALETTE.amber,
      },
      {
        active: penal10Active,
        x: 640,
        y: 112,
        title: "2.° PENAL (FALTAS)",
        val: "10 m",
        color: PALETTE.coral,
      },
      {
        active: goalActive,
        x: 840,
        y: 112,
        title: "ARCO OFICIAL",
        val: "3 × 2 m",
        color: PALETTE.amber,
      },
      {
        active: centerActive,
        x: 1040,
        y: 112,
        title: "CÍRCULO CENTRAL",
        val: "Radio 3 m",
        color: PALETTE.sky,
      },
    ];

    callouts.forEach((c) => {
      ctx.save();
      ctx.globalAlpha = c.active ? 1 : 0.45;
      drawCard(
        ctx,
        c.x - 86,
        c.y - 16,
        172,
        56,
        10,
        c.active ? "rgba(15, 23, 34, 0.98)" : "rgba(15, 23, 34, 0.65)",
        c.active ? c.color : PALETTE.border,
        c.active ? 2 : 1
      );
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = c.color;
      ctx.font = `700 12px ${FONT_MONO}`;
      ctx.fillText(c.title, c.x, c.y + 6);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 20px ${FONT_DISPLAY}`;
      ctx.fillText(c.val, c.x, c.y + 29);
      ctx.restore();
    });

    // Animated pulsing target ring on active spot
    const pulse = (globalTime * 1.8) % 1;
    if (penal6Active) {
      const pt = courtToCanvas(6, 10, courtRect);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10 + pulse * 18, 0, Math.PI * 2);
      ctx.strokeStyle = PALETTE.amber;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    if (penal10Active) {
      const pt = courtToCanvas(10, 10, courtRect);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10 + pulse * 18, 0, Math.PI * 2);
      ctx.strokeStyle = PALETTE.coral;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// SCENE 5: TÉCNICAS (Primer plano en recuadro con videos ralentizados)
// ---------------------------------------------------------------------------
interface TechniqueMeta {
  tabLabel: string;
  title: string;
  tagline: string;
  accent: string;
  points: { label: string; detail: string }[];
}

const TECHNIQUE_CARDS: TechniqueMeta[] = [
  {
    tabLabel: "01 PASE",
    title: "PASE",
    tagline: "ESPACIO REDUCIDO Y PRECISIÓN",
    accent: PALETTE.emeraldBright,
    points: [
      { label: "Interior del pie", detail: "Control seguro y toques cortos precisos" },
      { label: "Empeine", detail: "Envíos largos y cambios de frente firmes" },
      { label: "Ritmo rápido", detail: "Ejecución limpia bajo presión reducida" },
    ],
  },
  {
    tabLabel: "02 REMATE",
    title: "REMATE",
    tagline: "POTENCIA, PUNTERÍA Y APOYO",
    accent: PALETTE.amber,
    points: [
      { label: "Superficies clave", detail: "Empeine (potencia), interior (precisión), puntera (apuro)" },
      { label: "Mirar el arco", detail: "Ubicar al arquero y los palos antes de patear" },
      { label: "Pie de sostén", detail: "Apoyo firme al costado para dar equilibrio" },
    ],
  },
  {
    tabLabel: "03 CONTROL",
    title: "CONTROL",
    tagline: "ORIENTACIÓN AL ESPACIO LIBRE",
    accent: PALETTE.sky,
    points: [
      { label: "Con el pie", detail: "Interior, exterior o planta para pisar el balón" },
      { label: "Pelotas altas", detail: "Amortiguación suave y dirigida con el pecho" },
      { label: "Perfil previo", detail: "Orientar el cuerpo hacia el espacio libre" },
    ],
  },
  {
    tabLabel: "04 REGATE",
    title: "REGATE O PIQUE",
    tagline: "DESEQUILIBRIO EN UNO CONTRA UNO",
    accent: PALETTE.amber,
    points: [
      { label: "Cambio de ritmo", detail: "Frenadas, arranques y cambios de dirección" },
      { label: "Fintas y amagues", detail: "Engañar con el cuerpo antes del desborde" },
      { label: "Recursos clásicos", detail: "La bicicleta, el caño y la pisada con suela" },
    ],
  },
  {
    tabLabel: "05 CONDUCCIÓN",
    title: "CONDUCCIÓN",
    tagline: "PROTECCIÓN Y VISIÓN DE JUEGO",
    accent: PALETTE.emeraldBright,
    points: [
      { label: "Toques cortos", detail: "Mantener el balón cerca para girar al instante" },
      { label: "Cabeza levantada", detail: "Leer pases, líneas de presión y espacios" },
      { label: "Cuerpo protector", detail: "Interponerse entre el rival y la pelota" },
    ],
  },
  {
    tabLabel: "06 DEFENSA",
    title: "DEFENSA",
    tagline: "PRESIÓN, COBERTURA Y ORDEN",
    accent: PALETTE.coral,
    points: [
      { label: "Marcaje y presión", detail: "Seguimiento individual sobre quien tiene el balón" },
      { label: "Cobertura y quite", detail: "Respaldar al compañero y recuperar sin falta" },
      { label: "Marca en el área", detail: "Cierre ordenado de líneas de tiro y pase" },
    ],
  },
];

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  extraScale: number = 1
) {
  const sw =
    source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sh =
    source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!sw || !sh) return;

  const scale = Math.max(dw / sw, dh / sh) * extraScale;
  const drawW = sw * scale;
  const drawH = sh * scale;
  const drawX = dx + (dw - drawW) / 2;
  const drawY = dy + (dh - drawH) / 2;
  ctx.drawImage(source, drawX, drawY, drawW, drawH);
}

function renderScene5(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot,
  globalTime: number
) {
  const { activeCue, cueIndexInScene, cueProgress, cueElapsed } = snapshot;
  const tech = TECHNIQUE_CARDS[cueIndexInScene] ?? TECHNIQUE_CARDS[0];
  const speakerLabel = (activeCue.cueSpeaker ?? "Jairo").toUpperCase();
  const enter = easeOutExpo(clamp01(cueElapsed / 0.45));

  // Top technique selector strip (6 tabs across x=64..1216)
  for (let i = 0; i < TECHNIQUE_CARDS.length; i++) {
    const item = TECHNIQUE_CARDS[i];
    const x = 64 + i * 194;
    const w = 182;
    const isActive = i === cueIndexInScene;
    drawCard(
      ctx,
      x,
      98,
      w,
      40,
      8,
      isActive ? "rgba(15, 23, 34, 0.96)" : "rgba(15, 23, 34, 0.55)",
      isActive ? tech.accent : PALETTE.border,
      isActive ? 2 : 1
    );
    ctx.save();
    ctx.fillStyle = isActive ? tech.accent : PALETTE.textMuted;
    ctx.font = `700 13px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.tabLabel, x + w / 2, 118);
    ctx.restore();
  }

  // Left framed video container ("recuadro", 16:9 close-up demonstration)
  const frameX = 64;
  const frameY = 156;
  const frameW = 708;
  const frameH = 398;

  ctx.save();
  ctx.globalAlpha = enter;
  ctx.translate(lerp(-22, 0, enter), 0);

  // Outer studio frame & accent glow
  drawCard(
    ctx,
    frameX - 6,
    frameY - 6,
    frameW + 12,
    frameH + 12,
    18,
    "rgba(10, 16, 24, 0.96)",
    tech.accent,
    2
  );

  const drawable = techniqueMediaStore.getDrawable(activeCue.visualTag);
  const clipDur = drawable.spec?.clipDurationSec ?? 5.04;
  const cycle = computeVideoCycleState(
    cueElapsed,
    clipDur,
    activeCue.audioDurationSec
  );

  ctx.save();
  roundRectPath(ctx, frameX, frameY, frameW, frameH, 13);
  ctx.clip();

  // Dark canvas behind video so cross-dissolve looks cinematic
  ctx.fillStyle = "#070C12";
  ctx.fillRect(frameX, frameY, frameW, frameH);

  if (drawable.source) {
    ctx.save();
    ctx.globalAlpha = cycle.fadeAlpha;
    const subtleZoom = drawable.isVideo
      ? 1.005
      : 1.01 + (cycle.targetVideoTime / Math.max(1, clipDur)) * 0.04;
    drawImageCover(ctx, drawable.source, frameX, frameY, frameW, frameH, subtleZoom);
    ctx.restore();
  }

  // Top & bottom subtle broadcast vignettes for readability
  const topGrad = ctx.createLinearGradient(0, frameY, 0, frameY + 90);
  topGrad.addColorStop(0, "rgba(6, 10, 16, 0.68)");
  topGrad.addColorStop(1, "rgba(6, 10, 16, 0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(frameX, frameY, frameW, 90);

  const botGrad = ctx.createLinearGradient(0, frameY + frameH - 110, 0, frameY + frameH);
  botGrad.addColorStop(0, "rgba(6, 10, 16, 0)");
  botGrad.addColorStop(1, "rgba(6, 10, 16, 0.82)");
  ctx.fillStyle = botGrad;
  ctx.fillRect(frameX, frameY + frameH - 110, frameW, 110);

  // Viewfinder corner brackets inside frame
  const bLen = 18;
  const bPad = 14;
  ctx.strokeStyle = "rgba(248, 250, 252, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(frameX + bPad, frameY + bPad + bLen);
  ctx.lineTo(frameX + bPad, frameY + bPad);
  ctx.lineTo(frameX + bPad + bLen, frameY + bPad);
  ctx.moveTo(frameX + frameW - bPad - bLen, frameY + bPad);
  ctx.lineTo(frameX + frameW - bPad, frameY + bPad);
  ctx.lineTo(frameX + frameW - bPad, frameY + bPad + bLen);
  ctx.moveTo(frameX + bPad, frameY + frameH - bPad - bLen);
  ctx.lineTo(frameX + bPad, frameY + frameH - bPad);
  ctx.lineTo(frameX + bPad + bLen, frameY + frameH - bPad);
  ctx.moveTo(frameX + frameW - bPad - bLen, frameY + frameH - bPad);
  ctx.lineTo(frameX + frameW - bPad, frameY + frameH - bPad);
  ctx.lineTo(frameX + frameW - bPad, frameY + frameH - bPad - bLen);
  ctx.stroke();

  // Bottom-left on-screen technique overlay inside recuadro
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = tech.accent;
  ctx.font = `700 13px ${FONT_MONO}`;
  ctx.fillText("TÉCNICA EN PANTALLA", frameX + 26, frameY + frameH - 46);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 32px ${FONT_DISPLAY}`;
  ctx.fillText(tech.title, frameX + 26, frameY + frameH - 18);

  // Clip slow-mo progress bar at bottom edge of video recuadro
  const passProgress = clamp01(cycle.targetVideoTime / Math.max(0.5, clipDur));
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fillRect(frameX + 24, frameY + frameH - 9, frameW - 48, 3);
  ctx.fillStyle = tech.accent;
  ctx.fillRect(frameX + 24, frameY + frameH - 9, (frameW - 48) * passProgress, 3);

  ctx.restore();
  ctx.restore();

  // Right breakdown card (x=796, y=156, w=420, h=398)
  const cardX = 796;
  const cardY = 156;
  const cardW = 420;
  const cardH = 398;

  ctx.save();
  ctx.globalAlpha = enter;
  ctx.translate(lerp(24, 0, enter), 0);

  drawCard(ctx, cardX, cardY, cardW, cardH, 16, PALETTE.bgCard, tech.accent, 1.5);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = tech.accent;
  ctx.font = `700 13px ${FONT_MONO}`;
  ctx.fillText(
    `TÉCNICA ${String(cueIndexInScene + 1).padStart(2, "0")} · ${speakerLabel}`,
    cardX + 24,
    cardY + 34
  );

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 38px ${FONT_DISPLAY}`;
  ctx.fillText(tech.title, cardX + 24, cardY + 74);

  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = `600 13px ${FONT_MONO}`;
  ctx.fillText(tech.tagline, cardX + 24, cardY + 98);

  // Divider
  ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 24, cardY + 114);
  ctx.lineTo(cardX + cardW - 24, cardY + 114);
  ctx.stroke();

  // 3 Key Points (all stagger in within opening 0.7s, active phase highlighted)
  const activePointIdx = Math.min(tech.points.length - 1, Math.floor(cueProgress * tech.points.length));
  tech.points.forEach((pt, idx) => {
    const pEnter = easeOutExpo(clamp01((cueElapsed - idx * 0.14) / 0.34));
    const isHighlighted = idx === activePointIdx;
    const rowY = cardY + 132 + idx * 84;
    ctx.save();
    ctx.globalAlpha = enter * pEnter * (isHighlighted ? 1 : 0.78);

    drawCard(
      ctx,
      cardX + 22,
      rowY,
      cardW - 44,
      72,
      10,
      isHighlighted ? "rgba(15, 23, 34, 0.92)" : "rgba(15, 23, 34, 0.65)",
      isHighlighted ? tech.accent : "rgba(148, 163, 184, 0.2)",
      isHighlighted ? 1.5 : 1
    );

    drawCard(
      ctx,
      cardX + 34,
      rowY + 18,
      34,
      34,
      8,
      isHighlighted ? "rgba(16, 185, 129, 0.2)" : "rgba(15, 23, 34, 0.8)",
      tech.accent,
      1.2
    );
    ctx.fillStyle = tech.accent;
    ctx.font = `700 14px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`0${idx + 1}`, cardX + 51, rowY + 35);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 16px ${FONT_SANS}`;
    ctx.fillText(pt.label, cardX + 80, rowY + 26);

    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `500 13px ${FONT_SANS}`;
    const wrapped = wrapLines(ctx, pt.detail, cardW - 114);
    wrapped.slice(0, 2).forEach((line, li) => {
      ctx.fillText(line, cardX + 80, rowY + 46 + li * 16);
    });

    ctx.restore();
  });

  ctx.restore();
}

// ---------------------------------------------------------------------------
// SCENE 6: REGLAS PRINCIPALES (7 Numbered Rules)
// ---------------------------------------------------------------------------
function renderScene6(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot,
  globalTime: number
) {
  const { cueIndexInScene, cueProgress } = snapshot;
  const ruleIdx = cueIndexInScene;
  const enter = easeOutExpo(clamp01(cueProgress * 2.5));

  // Top numbered rule strip (01 .. 07)
  for (let i = 0; i < 7; i++) {
    const x = 64 + i * 166;
    const isActive = i === ruleIdx;
    drawCard(
      ctx,
      x,
      106,
      152,
      44,
      8,
      isActive ? "rgba(16, 185, 129, 0.2)" : "rgba(15, 23, 34, 0.7)",
      isActive ? PALETTE.emeraldBright : PALETTE.border,
      isActive ? 2 : 1
    );
    ctx.fillStyle = isActive ? PALETTE.emeraldBright : PALETTE.textMuted;
    ctx.font = `700 15px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`REGLA 0${i + 1}`, x + 76, 106 + 22);
  }

  ctx.save();
  ctx.globalAlpha = enter;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  if (ruleIdx === 0) {
    // 5 jugadores, 2x20 efectivo, 1 min timeout, sin offside
    const cards = [
      { big: "5 vs 5", label: "Cambios ilimitados", sub: "Incluido el arquero", c: PALETTE.emeraldBright },
      { big: "2 × 20'", label: "Tiempo efectivo", sub: "Reloj detenido en pausas", c: PALETTE.sky },
      { big: "1 MIN", label: "Tiempo muerto", sub: "Uno por equipo cada tiempo", c: PALETTE.amber },
      { big: "SIN", label: "Fuera de juego", sub: "Juego continuo en ataque", c: PALETTE.coral },
    ];
    cards.forEach((card, idx) => {
      const s = stagger(clamp01(cueProgress * 1.4), idx, 4, 0.5);
      const x = 64 + idx * 292;
      const y = 192 + lerp(28, 0, s);
      ctx.globalAlpha = s;
      drawCard(ctx, x, y, 272, 310, 16, PALETTE.bgCard, card.c, 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = card.c;
      ctx.font = `800 64px ${FONT_DISPLAY}`;
      ctx.fillText(card.big, x + 136, y + 120);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 24px ${FONT_DISPLAY}`;
      ctx.fillText(card.label.toUpperCase(), x + 136, y + 190);
      ctx.fillStyle = PALETTE.textMuted;
      ctx.font = `500 15px ${FONT_SANS}`;
      ctx.fillText(card.sub, x + 136, y + 224);
    });
  } else if (ruleIdx === 1) {
    // 4 seconds countdown ring
    const cx = 340;
    const cy = 355;
    const secCycle = (cueProgress * 2) % 1;
    const countVal = Math.max(1, 4 - Math.floor(secCycle * 4));

    ctx.beginPath();
    ctx.arc(cx, cy, 138, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 138, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - secCycle));
    ctx.strokeStyle = PALETTE.amber;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 100px ${FONT_DISPLAY}`;
    ctx.fillText(`${countVal}s`, cx, cy - 22);
    ctx.fillStyle = PALETTE.amber;
    ctx.font = `700 17px ${FONT_MONO}`;
    ctx.fillText("LÍMITE MÁXIMO", cx, cy + 54);

    const situations = [
      "Arquero con la pelota en sus manos",
      "Saque de banda",
      "Saque de esquina",
      "Saque de meta",
      "Tiros libres",
    ];
    situations.forEach((txt, i) => {
      const s = stagger(clamp01(cueProgress * 1.5), i, 5, 0.5);
      const y = 192 + i * 66;
      ctx.globalAlpha = s;
      drawCard(ctx, 560, y, 640, 52, 10, PALETTE.bgCard, PALETTE.amber, 1.2);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = PALETTE.amber;
      ctx.font = `700 14px ${FONT_MONO}`;
      ctx.fillText(`0${i + 1}`, 584, y + 26);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `600 19px ${FONT_SANS}`;
      ctx.fillText(txt, 632, y + 26);
    });
  } else if (ruleIdx === 2) {
    // Deliberate backpass to goalkeeper -> Indirect free kick
    const court: Rect = { x: 110, y: 185, w: 620, h: 330 };
    drawFutsalCourtLines(ctx, court, 1, { area6m: true });
    const passT = clamp01(cueProgress * 1.5);
    const pStart = courtToCanvas(16, 15, court);
    const pEnd = courtToCanvas(3.5, 10, court);
    drawPlayerToken(ctx, pStart.x, pStart.y, "2", PALETTE.sky, "Compañero");
    drawPlayerToken(ctx, pEnd.x, pEnd.y, "1", PALETTE.amber, "Arquero");
    drawArrow(ctx, pStart.x - 16, pStart.y - 8, lerp(pStart.x, pEnd.x, passT), lerp(pStart.y, pEnd.y, passT), PALETTE.coral, 3.5, true);
    drawFutsalBall(ctx, lerp(pStart.x, pEnd.x, passT), lerp(pStart.y, pEnd.y, passT), 11, globalTime * 6);

    drawCard(ctx, 770, 200, 440, 290, 16, PALETTE.bgCard, PALETTE.coral, 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = PALETTE.coral;
    ctx.font = `700 15px ${FONT_MONO}`;
    ctx.fillText("INFRACCIÓN TÉCNICA", 804, 248);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 38px ${FONT_DISPLAY}`;
    ctx.fillText("PASE DELIBERADO", 804, 302);
    ctx.fillText("AL ARQUERO", 804, 344);
    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `500 17px ${FONT_SANS}`;
    const descLines = wrapLines(
      ctx,
      "Si la toma con la mano tras pase con el pie → Tiro Libre Indirecto.",
      372
    );
    descLines.forEach((line, li) => {
      ctx.fillText(line, 804, 392 + li * 26);
    });
  } else if (ruleIdx === 3) {
    // 6th accumulated foul -> 10m direct free kick without wall
    const foulNum = Math.min(6, 1 + Math.floor(clamp01(cueProgress * 1.4) * 6));
    drawCard(ctx, 72, 188, 420, 326, 16, PALETTE.bgCard, PALETTE.coral, 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `700 16px ${FONT_MONO}`;
    ctx.fillText("FALTAS ACUMULADAS POR TIEMPO", 282, 236);
    ctx.fillStyle = foulNum >= 6 ? PALETTE.coral : PALETTE.amber;
    ctx.font = `800 132px ${FONT_DISPLAY}`;
    ctx.fillText(`${foulNum}ª`, 282, 355);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 24px ${FONT_DISPLAY}`;
    ctx.fillText("TIRO DIRECTO SIN BARRERA · 10 M", 282, 464);

    const court: Rect = { x: 540, y: 188, w: 668, h: 326 };
    drawFutsalCourtLines(ctx, court, 1, { penal10m: true });
    const spot10 = courtToCanvas(10, 10, court);
    const goalPt = courtToCanvas(0.5, 10, court);
    const shotT = (globalTime * 0.7) % 1;
    drawArrow(ctx, spot10.x, spot10.y, goalPt.x + 12, goalPt.y, PALETTE.coral, 3.5, true);
    drawFutsalBall(ctx, lerp(spot10.x, goalPt.x + 12, easeOutExpo(shotT)), spot10.y, 12, globalTime * 8);
    drawPlayerToken(ctx, goalPt.x + 14, goalPt.y, "1", PALETTE.amber, "Arquero");
  } else if (ruleIdx === 4) {
    // Direct vs Indirect + 5m wall
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    drawCard(ctx, 72, 185, 540, 320, 16, PALETTE.bgCard, PALETTE.emeraldBright, 2);
    ctx.fillStyle = PALETTE.emeraldBright;
    ctx.font = `700 15px ${FONT_MONO}`;
    ctx.fillText("OPCIÓN A", 104, 228);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 44px ${FONT_DISPLAY}`;
    ctx.fillText("TIRO LIBRE DIRECTO", 104, 282);
    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `500 18px ${FONT_SANS}`;
    const leftLines = wrapLines(ctx, "Se puede marcar gol directamente al arco.", 476);
    leftLines.forEach((line, li) => {
      ctx.fillText(line, 104, 326 + li * 24);
    });
    drawArrow(ctx, 130, 415, 490, 415, PALETTE.emeraldBright, 4);
    drawFutsalBall(ctx, lerp(130, 460, (globalTime * 0.8) % 1), 415, 13, globalTime * 6);

    drawCard(ctx, 668, 185, 540, 320, 16, PALETTE.bgCard, PALETTE.amber, 2);
    ctx.fillStyle = PALETTE.amber;
    ctx.font = `700 15px ${FONT_MONO}`;
    ctx.fillText("OPCIÓN B · BARRERA A 5 METROS", 700, 228);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 44px ${FONT_DISPLAY}`;
    ctx.fillText("TIRO LIBRE INDIRECTO", 700, 282);
    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `500 18px ${FONT_SANS}`;
    const rightLines = wrapLines(ctx, "El gol vale solo si otro jugador toca la pelota.", 476);
    rightLines.forEach((line, li) => {
      ctx.fillText(line, 700, 326 + li * 24);
    });
    drawArrow(ctx, 725, 415, 920, 395, PALETTE.amber, 3.5);
    drawArrow(ctx, 930, 395, 1130, 435, PALETTE.emeraldBright, 3.5);
    drawPlayerToken(ctx, 925, 395, "2", PALETTE.amber, "2.° toque");
  } else if (ruleIdx === 5) {
    // Penalty from 6m, goalkeeper stays on goal line
    const court: Rect = { x: 160, y: 185, w: 960, h: 330 };
    drawFutsalCourtLines(ctx, court, 1, { penal6m: true, area6m: true });
    const p6 = courtToCanvas(6, 10, court);
    const gk = courtToCanvas(0.4, 10, court);
    drawPlayerToken(ctx, gk.x, gk.y + Math.sin(globalTime * 4) * 14, "1", PALETTE.amber, "Sobre la línea");
    drawPlayerToken(ctx, p6.x + 36, p6.y, "9", PALETTE.emeraldBright, "Ejecutante · 6 m");
    drawFutsalBall(ctx, p6.x, p6.y, 12, 0);
  } else {
    // Yellow card, 2 yellows / red card, 2-min suspension
    const items = [
      { title: "AMARILLA", desc: "Amonestación oficial", color: "#FACC15", badge: "1×" },
      { title: "ROJA / 2 AMARILLAS", desc: "Expulsión sin reemplazo", color: "#EF4444", badge: "EXPULSIÓN" },
      { title: "SANCIÓN 2 MIN", desc: "Inferioridad por falta grave", color: "#F59E0B", badge: "02:00" },
    ];
    items.forEach((it, idx) => {
      const s = stagger(clamp01(cueProgress * 1.4), idx, 3, 0.5);
      const x = 84 + idx * 384;
      const y = 195 + lerp(28, 0, s);
      ctx.globalAlpha = s;
      drawCard(ctx, x, y, 344, 300, 16, PALETTE.bgCard, it.color, 2);

      // Referee card graphic
      roundRectPath(ctx, x + 132, y + 40, 80, 114, 8);
      ctx.fillStyle = it.color;
      ctx.fill();

      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 30px ${FONT_DISPLAY}`;
      ctx.fillText(it.title, x + 172, y + 204);
      ctx.fillStyle = PALETTE.textMuted;
      ctx.font = `500 17px ${FONT_SANS}`;
      ctx.fillText(it.desc, x + 172, y + 238);
    });
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// SCENE 7: TIPOS DE INFRACCIONES (3 Animated Columns)
// ---------------------------------------------------------------------------
function renderScene7(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot
) {
  const { cueIndexInScene, cueProgress } = snapshot;

  const cols = [
    {
      num: "01",
      title: "PERSONALES",
      rule: "Contacto indebido",
      examples: "Empujar · Sujetar · Golpear",
      penalty: "TIRO LIBRE DIRECTO",
      color: PALETTE.coral,
    },
    {
      num: "02",
      title: "TÉCNICAS",
      rule: "Sin contacto físico",
      examples: "Arquero retiene > 4 seg",
      penalty: "TIRO LIBRE INDIRECTO",
      color: PALETTE.amber,
    },
    {
      num: "03",
      title: "DISCIPLINARIAS",
      rule: "Conducta antideportiva",
      examples: "Protestar o faltar el respeto",
      penalty: "TARJETA AMARILLA O ROJA",
      color: PALETTE.sky,
    },
  ];

  cols.forEach((col, i) => {
    const isFocused = i === cueIndexInScene;
    const wasRevealed = i <= cueIndexInScene;
    const localReveal = i < cueIndexInScene ? 1 : easeOutExpo(clamp01(cueProgress * 2));
    const alpha = wasRevealed ? lerp(0.3, 1, localReveal) : 0.28;
    const x = 64 + i * 392;
    const y = isFocused ? 124 : 142;

    ctx.save();
    ctx.globalAlpha = alpha;
    drawCard(
      ctx,
      x,
      y,
      368,
      408,
      16,
      isFocused ? "rgba(17, 27, 40, 0.96)" : PALETTE.bgCard,
      isFocused ? col.color : PALETTE.border,
      isFocused ? 2.5 : 1.2
    );

    ctx.fillStyle = col.color;
    ctx.font = `700 15px ${FONT_MONO}`;
    ctx.fillText(`COLUMNA ${col.num}`, x + 28, y + 42);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 44px ${FONT_DISPLAY}`;
    ctx.fillText(col.title, x + 28, y + 94);

    ctx.fillStyle = PALETTE.textPrimary;
    ctx.font = `600 20px ${FONT_SANS}`;
    ctx.fillText(col.rule, x + 28, y + 150);

    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `500 17px ${FONT_SANS}`;
    ctx.fillText(col.examples, x + 28, y + 188);

    // Bottom penalty box
    drawCard(ctx, x + 24, y + 300, 320, 76, 10, "rgba(8, 13, 19, 0.85)", col.color, 1.5);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = col.color;
    ctx.font = `700 22px ${FONT_DISPLAY}`;
    ctx.fillText(col.penalty, x + 184, y + 338);
    ctx.restore();
  });
}

// ---------------------------------------------------------------------------
// SCENE 8: EL ROL DEL ARQUERO
// ---------------------------------------------------------------------------
function renderScene8(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot,
  globalTime: number
) {
  const p = snapshot.cueProgress;
  const court: Rect = { x: 84, y: 140, w: 720, h: 400 };
  drawFutsalCourtLines(ctx, court, 1, { area6m: true });

  // Phase 1 (0..0.42): Save! Phase 2 (0.42..1): Sweeper-keeper stepping out + counterattack
  const phase2 = clamp01((p - 0.35) / 0.45);
  const gkX = lerp(2.2, 13.5, easeInOutCubic(phase2));
  const gkY = lerp(10, 12.2, easeInOutCubic(phase2));
  const gkPt = courtToCanvas(gkX, gkY, court);

  // Incoming shot in phase 1
  if (p < 0.45) {
    const shotT = clamp01(p / 0.35);
    const sStart = courtToCanvas(15, 6, court);
    const sEnd = courtToCanvas(2.6, 9.8, court);
    drawArrow(ctx, sStart.x, sStart.y, sEnd.x, sEnd.y, PALETTE.coral, 3, true);
    drawFutsalBall(
      ctx,
      lerp(sStart.x, sEnd.x, easeOutExpo(shotT)),
      lerp(sStart.y, sEnd.y, easeOutExpo(shotT)),
      11,
      globalTime * 9
    );
  }

  // Phase 2: Passing lanes & counterattack
  const w1 = courtToCanvas(22, 4, court);
  const w2 = courtToCanvas(24, 16.5, court);
  const pivot = courtToCanvas(32, 10, court);

  if (phase2 > 0.1) {
    ctx.save();
    ctx.globalAlpha = phase2;
    drawArrow(ctx, gkPt.x + 18, gkPt.y - 6, w1.x - 18, w1.y + 8, PALETTE.emeraldBright, 3.5);
    drawArrow(ctx, w1.x + 18, w1.y + 6, pivot.x - 18, pivot.y - 8, PALETTE.sky, 3, true);
    drawFutsalBall(ctx, lerp(gkPt.x, w1.x, clamp01((p - 0.55) / 0.35)), lerp(gkPt.y, w1.y, clamp01((p - 0.55) / 0.35)), 11, globalTime * 6);
    ctx.restore();
  }

  drawPlayerToken(ctx, gkPt.x, gkPt.y, "1", PALETTE.amber, "Arquero", (globalTime * 1.5) % 1);
  drawPlayerToken(ctx, w1.x, w1.y, "7", PALETTE.emeraldBright, "Ala");
  drawPlayerToken(ctx, w2.x, w2.y, "11", PALETTE.emeraldBright, "Ala");
  drawPlayerToken(ctx, pivot.x, pivot.y, "9", PALETTE.sky, "Pívot");

  // Right tactical checklist
  const roles = [
    { title: "ATAJADA DECISIVA", desc: "Reflejos en área de 6 m", active: p < 0.4 },
    { title: "JUEGA CON LOS PIES", desc: "Salida como línea extra", active: p >= 0.35 && p < 0.7 },
    { title: "CONTRAATAQUE", desc: "Organiza defensa y lanza ataque", active: p >= 0.65 },
  ];
  roles.forEach((r, idx) => {
    const y = 148 + idx * 134;
    drawCard(ctx, 848, y, 368, 114, 14, PALETTE.bgCard, r.active ? PALETTE.amber : PALETTE.border, r.active ? 2 : 1.2);
    ctx.fillStyle = r.active ? PALETTE.amber : PALETTE.textMuted;
    ctx.font = `700 14px ${FONT_MONO}`;
    ctx.fillText(`ROL 0${idx + 1}`, 876, y + 34);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 26px ${FONT_DISPLAY}`;
    ctx.fillText(r.title, 876, y + 66);
    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `500 15px ${FONT_SANS}`;
    ctx.fillText(r.desc, 876, y + 94);
  });
}

// ---------------------------------------------------------------------------
// SCENE 9: FORMACIONES Y SISTEMAS (Morphing 1-2-1 -> 2-2 -> 3-1 -> 4-0)
// ---------------------------------------------------------------------------
function renderScene9(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot,
  globalTime: number
) {
  const p = snapshot.cueProgress;
  const court: Rect = { x: 84, y: 140, w: 720, h: 400 };
  drawFutsalCourtLines(ctx, court, 1);

  type Pos = { x: number; y: number; label: string; role: string };
  const formations: { name: string; desc: string; players: Pos[] }[] = [
    {
      name: "1-2-1 (ROMBO)",
      desc: "Fijo · Dos alas · Pívot de referencia",
      players: [
        { x: 11, y: 10, label: "4", role: "Fijo" },
        { x: 20, y: 3.8, label: "7", role: "Ala" },
        { x: 30, y: 10, label: "9", role: "Pívot" },
        { x: 20, y: 16.2, label: "11", role: "Ala" },
      ],
    },
    {
      name: "2-2 (CUADRADO)",
      desc: "Equilibrio en dos líneas de dos",
      players: [
        { x: 13, y: 5.5, label: "4", role: "Cierre" },
        { x: 26, y: 5.5, label: "11", role: "Ofensivo" },
        { x: 26, y: 14.5, label: "9", role: "Ofensivo" },
        { x: 13, y: 14.5, label: "7", role: "Cierre" },
      ],
    },
    {
      name: "3-1 (PRESIÓN ALTA)",
      desc: "Tres jugadores adelantados + cierre",
      players: [
        { x: 12, y: 10, label: "4", role: "Fijo" },
        { x: 25, y: 3.8, label: "7", role: "Ala" },
        { x: 27, y: 10, label: "9", role: "Pívot" },
        { x: 25, y: 16.2, label: "11", role: "Ala" },
      ],
    },
    {
      name: "4-0 (MOVILIDAD TOTAL)",
      desc: "Línea plana con rotaciones continuas",
      players: [
        { x: 22, y: 16.8, label: "4", role: "Rotación" },
        { x: 22, y: 3.2, label: "7", role: "Rotación" },
        { x: 22, y: 7.8, label: "9", role: "Rotación" },
        { x: 22, y: 12.2, label: "11", role: "Rotación" },
      ],
    },
  ];

  // Smooth morph across the 4 formations
  const scaled = p * 3.6;
  const idxA = Math.min(3, Math.floor(scaled));
  const idxB = Math.min(3, idxA + 1);
  const morphT = easeInOutCubic(clamp01((scaled - idxA) * 1.4));

  // Goalkeeper always anchors
  const gk = courtToCanvas(3, 10, court);
  drawPlayerToken(ctx, gk.x, gk.y, "1", PALETTE.amber, "Arquero");

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const a = formations[idxA].players[i];
    const b = formations[idxB].players[i];
    const mx = lerp(a.x, b.x, morphT);
    const my = lerp(a.y, b.y, morphT);
    const pt = courtToCanvas(mx, my, court);
    pts.push(pt);
  }

  // Connecting tactical shape polygon
  ctx.save();
  ctx.beginPath();
  pts.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(16, 185, 129, 0.14)";
  ctx.fill();
  ctx.strokeStyle = PALETTE.emeraldBright;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.restore();

  pts.forEach((pt, i) => {
    const info = formations[morphT > 0.5 ? idxB : idxA].players[i];
    drawPlayerToken(ctx, pt.x, pt.y, info.label, PALETTE.emeraldBright, info.role, (globalTime + i * 0.25) % 1);
  });

  // Right formation selector cards
  formations.forEach((f, idx) => {
    const active = idx === (morphT > 0.5 ? idxB : idxA);
    const y = 140 + idx * 104;
    drawCard(ctx, 848, y, 368, 88, 12, PALETTE.bgCard, active ? PALETTE.emeraldBright : PALETTE.border, active ? 2 : 1.2);
    ctx.fillStyle = active ? PALETTE.emeraldBright : "#FFFFFF";
    ctx.font = `700 24px ${FONT_DISPLAY}`;
    ctx.fillText(f.name, 874, y + 38);
    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `500 14px ${FONT_SANS}`;
    ctx.fillText(f.desc, 874, y + 66);
  });
}

// ---------------------------------------------------------------------------
// SCENE 10: CIERRE
// ---------------------------------------------------------------------------
function renderScene10(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot,
  globalTime: number
) {
  const p = snapshot.cueProgress;
  const pillars = [
    { word: "RAPIDEZ", sub: "Decisiones en milisegundos", color: PALETTE.amber },
    { word: "TÉCNICA", sub: "Control preciso en espacios cortos", color: PALETTE.sky },
    { word: "TRABAJO COLECTIVO", sub: "Cinco jugadores en sintonía", color: PALETTE.emeraldBright },
  ];

  // Top summary tags
  const tags = ["CANCHA", "TÉCNICAS", "REGLAS", "ARQUERO", "FORMACIONES"];
  tags.forEach((tag, i) => {
    const s = stagger(clamp01(p * 1.8), i, 5, 0.5);
    const x = 136 + i * 210;
    ctx.save();
    ctx.globalAlpha = s;
    drawCard(ctx, x, 134, 186, 46, 8, "rgba(16, 185, 129, 0.14)", PALETTE.emeraldBright, 1.5);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 18px ${FONT_DISPLAY}`;
    ctx.fillText(tag, x + 93, 134 + 23);
    ctx.restore();
  });

  // 3 giant kinetic pillars
  pillars.forEach((pil, idx) => {
    const s = stagger(clamp01((p - 0.18) * 1.6), idx, 3, 0.55);
    const x = 84 + idx * 384;
    const y = 236 + lerp(36, 0, s);
    ctx.save();
    ctx.globalAlpha = s;
    drawCard(ctx, x, y, 344, 272, 16, PALETTE.bgCard, pil.color, 2);

    // Animated rotating accent ring behind number
    const pulse = (globalTime * 0.9 + idx * 0.3) % 1;
    ctx.beginPath();
    ctx.arc(x + 172, y + 96, 36 + pulse * 10, 0, Math.PI * 2);
    ctx.strokeStyle = pil.color;
    ctx.globalAlpha = s * 0.35;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = s;
    ctx.textAlign = "center";
    ctx.fillStyle = pil.color;
    ctx.font = `700 22px ${FONT_MONO}`;
    ctx.fillText(`0${idx + 1}`, x + 172, y + 104);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 36px ${FONT_DISPLAY}`;
    ctx.fillText(pil.word, x + 172, y + 176);

    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = `500 16px ${FONT_SANS}`;
    ctx.fillText(pil.sub, x + 172, y + 216);
    ctx.restore();
  });
}

// ---------------------------------------------------------------------------
// CRÉDITOS
// ---------------------------------------------------------------------------
function renderCredits(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot
) {
  const p = snapshot.cueProgress;
  const enter = easeOutExpo(clamp01(p * 2.2));

  ctx.save();
  ctx.globalAlpha = enter;
  ctx.textAlign = "center";

  ctx.fillStyle = PALETTE.emeraldBright;
  ctx.font = `700 16px ${FONT_MONO}`;
  ctx.fillText("CRÉDITOS FINALES · DOCUMENTACIÓN FUTSAL", LOGICAL_WIDTH / 2, 180);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 64px ${FONT_DISPLAY}`;
  ctx.fillText("FUENTES CONSULTADAS", LOGICAL_WIDTH / 2, 248);

  const sources = ["FIFA", "The FA", "futsal.com", "Wikipedia", "AMF", "futsal.tech"];
  sources.forEach((src, i) => {
    const s = stagger(clamp01(p * 1.6), i, sources.length, 0.5);
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx = LOGICAL_WIDTH / 2 - 390 + col * 270;
    const by = 294 + row * 72 + lerp(16, 0, s);
    ctx.globalAlpha = s;
    drawCard(ctx, bx, by, 240, 52, 10, PALETTE.bgCard, PALETTE.border, 1.5);
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#F8FAFC";
    ctx.font = `600 20px ${FONT_SANS}`;
    ctx.fillText(src, bx + 120, by + 26);
  });

  const igReveal = easeOutBack(clamp01((p - 0.35) / 0.35));
  if (igReveal > 0) {
    ctx.globalAlpha = clamp01(igReveal);
    drawCard(
      ctx,
      LOGICAL_WIDTH / 2 - 240,
      478,
      480,
      86,
      14,
      "rgba(16, 185, 129, 0.16)",
      PALETTE.emeraldBright,
      2
    );
    ctx.fillStyle = PALETTE.emeraldBright;
    ctx.font = `700 14px ${FONT_MONO}`;
    ctx.fillText("INSTAGRAM OFICIAL", LOGICAL_WIDTH / 2, 508);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 34px ${FONT_DISPLAY}`;
    ctx.fillText("@deptoEF.ET20", LOGICAL_WIDTH / 2, 544);
  }
  ctx.restore();
}

export function renderMotionFrame(
  ctx: CanvasRenderingContext2D,
  snapshot: PlaybackSnapshot,
  globalTime: number
): void {
  drawBroadcastBackdrop(ctx, globalTime);

  // Subtle kinetic camera zoom punch on cue start
  const punch = easeOutExpo(clamp01(snapshot.cueElapsed / 0.45));
  const camScale = lerp(1.022, 1.0, punch);
  ctx.save();
  ctx.translate(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
  ctx.scale(camScale, camScale);
  ctx.translate(-LOGICAL_WIDTH / 2, -LOGICAL_HEIGHT / 2);

  switch (snapshot.activeScene.scene.id) {
    case "scene-2":
      renderScene2(ctx, snapshot, globalTime);
      break;
    case "scene-3":
      renderScene3(ctx, snapshot, globalTime);
      break;
    case "scene-4":
      renderScene4(ctx, snapshot, globalTime);
      break;
    case "scene-5":
      renderScene5(ctx, snapshot, globalTime);
      break;
    case "scene-6":
      renderScene6(ctx, snapshot, globalTime);
      break;
    case "scene-7":
      renderScene7(ctx, snapshot);
      break;
    case "scene-8":
      renderScene8(ctx, snapshot, globalTime);
      break;
    case "scene-9":
      renderScene9(ctx, snapshot, globalTime);
      break;
    case "scene-10":
      renderScene10(ctx, snapshot, globalTime);
      break;
    case "credits":
      renderCredits(ctx, snapshot);
      break;
  }

  ctx.restore();

  drawBroadcastHeader(ctx, snapshot);
  drawKineticSubtitle(ctx, snapshot);
}
