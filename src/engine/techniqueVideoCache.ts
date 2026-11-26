export interface TechniqueMediaSpec {
  tag: string;
  videoSrc: string;
  imageSrc: string;
  clipDurationSec: number;
}

export const TECHNIQUE_MEDIA: Record<string, TechniqueMediaSpec> = {
  "tech-pase": {
    tag: "tech-pase",
    videoSrc: "/videos/tech-pase.webm",
    imageSrc: "/src/assets/images/tech-pase-poster.jpg",
    clipDurationSec: 5.04,
  },
  "tech-remate": {
    tag: "tech-remate",
    videoSrc: "/videos/tech-remate.webm",
    imageSrc: "/src/assets/images/tech-remate-poster.jpg",
    clipDurationSec: 5.04,
  },
  "tech-control": {
    tag: "tech-control",
    videoSrc: "/videos/tech-control.webm",
    imageSrc: "/src/assets/images/tech-control-poster.jpg",
    clipDurationSec: 5.04,
  },
  "tech-regate": {
    tag: "tech-regate",
    videoSrc: "/videos/tech-regate.webm",
    imageSrc: "/src/assets/images/tech-regate-poster.jpg",
    clipDurationSec: 5.04,
  },
  "tech-conduccion": {
    tag: "tech-conduccion",
    videoSrc: "/videos/tech-conduccion.webm",
    imageSrc: "/src/assets/images/tech-conduccion-poster.jpg",
    clipDurationSec: 5.04,
  },
  "tech-defensa": {
    tag: "tech-defensa",
    videoSrc: "/videos/tech-defensa.webm",
    imageSrc: "/src/assets/images/tech-defensa-poster.jpg",
    clipDurationSec: 5.04,
  },
};

export interface VideoCycleState {
  passIndex: 1;
  targetVideoTime: number;
  fadeAlpha: number;
  playbackRate: number;
}

/**
 * Fits a single continuous pass (0% -> 100%) of the user's technique video
 * across the entire narration cue duration so it never repeats twice or cuts
 * off mid-way on a second pass.
 */
export function computeVideoCycleState(
  cueElapsed: number,
  clipDurationSec: number,
  cueDurationSec: number
): VideoCycleState {
  const safeClip = Math.max(0.5, clipDurationSec);
  const safeCue = Math.max(0.5, cueDurationSec);
  const safeElapsed = Math.max(0, cueElapsed);

  const progress = Math.max(0, Math.min(1, safeElapsed / safeCue));
  const maxSeekTime = Math.max(0, safeClip - 0.04);
  const targetVideoTime = progress * maxSeekTime;

  // Natural playback speed matching video duration to narration length
  const naturalRate = Math.max(0.42, Math.min(1.35, safeClip / safeCue));

  // Smooth fade-in and gentle tail settle so transitions feel seamless
  const fadeIn = Math.min(1, safeElapsed / 0.2);
  const remaining = Math.max(0, safeCue - safeElapsed);
  const fadeOut = remaining < 0.2 ? Math.max(0.35, remaining / 0.2) : 1;

  return {
    passIndex: 1,
    targetVideoTime,
    fadeAlpha: Math.min(fadeIn, fadeOut),
    playbackRate: naturalRate,
  };
}

interface MediaAssetSlot {
  spec: TechniqueMediaSpec;
  image: HTMLImageElement;
  imageLoaded: boolean;
  video: HTMLVideoElement;
  videoReady: boolean;
}

class TechniqueMediaStore {
  private slots = new Map<string, MediaAssetSlot>();

  private ensureSlot(tag: string): MediaAssetSlot | null {
    const spec = TECHNIQUE_MEDIA[tag];
    if (!spec || typeof document === "undefined") return null;

    let slot = this.slots.get(tag);
    if (slot) return slot;

    const image = new Image();
    image.src = spec.imageSrc;

    const video = document.createElement("video");
    video.src = spec.videoSrc;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.loop = false;

    slot = {
      spec,
      image,
      imageLoaded: false,
      video,
      videoReady: false,
    };

    image.onload = () => {
      if (slot) slot.imageLoaded = true;
    };
    video.onloadeddata = () => {
      if (slot) slot.videoReady = true;
    };
    video.oncanplay = () => {
      if (slot) slot.videoReady = true;
    };

    this.slots.set(tag, slot);
    return slot;
  }

  public preloadAll(): void {
    for (const tag of Object.keys(TECHNIQUE_MEDIA)) {
      this.ensureSlot(tag);
    }
  }

  public syncPlayback(
    activeTag: string | null,
    cueElapsed: number,
    cueDurationSec: number,
    isPlaying: boolean,
    masterRate: number
  ): void {
    for (const [tag, slot] of this.slots.entries()) {
      const video = slot.video;
      if (tag !== activeTag) {
        if (!video.paused) video.pause();
        continue;
      }

      const actualClipDur =
        Number.isFinite(video.duration) && video.duration > 0.5
          ? video.duration
          : slot.spec.clipDurationSec;

      const cycle = computeVideoCycleState(
        cueElapsed,
        actualClipDur,
        cueDurationSec
      );
      const effectiveRate = Math.max(0.25, Math.min(2.0, cycle.playbackRate * masterRate));
      if (Math.abs(video.playbackRate - effectiveRate) > 0.02) {
        video.playbackRate = effectiveRate;
      }

      if (slot.videoReady) {
        if (Math.abs(video.currentTime - cycle.targetVideoTime) > 0.25) {
          try {
            video.currentTime = cycle.targetVideoTime;
          } catch {
            // Ignore seek before metadata ready
          }
        }
        if (isPlaying && !video.ended && video.paused) {
          void video.play().catch(() => {});
        } else if ((!isPlaying || video.ended) && !video.paused) {
          video.pause();
        }
      }
    }
  }

  public getDrawable(
    tag: string
  ): {
    source: HTMLVideoElement | HTMLImageElement | null;
    isVideo: boolean;
    spec: TechniqueMediaSpec | null;
  } {
    const slot = this.ensureSlot(tag);
    if (!slot) return { source: null, isVideo: false, spec: null };
    if (slot.videoReady && slot.video.readyState >= 2) {
      return { source: slot.video, isVideo: true, spec: slot.spec };
    }
    if (slot.imageLoaded && slot.image.naturalWidth > 0) {
      return { source: slot.image, isVideo: false, spec: slot.spec };
    }
    return { source: null, isVideo: false, spec: slot.spec };
  }
}

export const techniqueMediaStore = new TechniqueMediaStore();
