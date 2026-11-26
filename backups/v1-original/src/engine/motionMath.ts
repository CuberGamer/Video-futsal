export function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutExpo(t: number): number {
  const x = clamp01(t);
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function stagger(
  progress: number,
  index: number,
  total: number,
  windowRatio: number = 0.55
): number {
  if (total <= 1) return easeOutExpo(progress);
  const maxStart = Math.max(0.01, 1 - windowRatio);
  const start = (index / (total - 1)) * maxStart;
  const local = clamp01((progress - start) / windowRatio);
  return easeOutExpo(local);
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Maps official FIFA futsal court coordinates (length: 0..40m, width: 0..20m)
 * into a target canvas rectangle.
 */
export function courtToCanvas(
  metersX: number,
  metersY: number,
  rect: Rect
): { x: number; y: number } {
  return {
    x: rect.x + (metersX / 40) * rect.w,
    y: rect.y + (metersY / 20) * rect.h,
  };
}
