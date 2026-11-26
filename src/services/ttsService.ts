import type { TtsVoiceName } from "../data/futsalScript";
import type { SfxType } from "../engine/soundTimeline";
import { parseTtsApiResponse } from "./ttsResponse";

export interface GeneratedAudioEntry {
  cueId: string;
  voiceName: TtsVoiceName;
  buffer: AudioBuffer;
  durationSec: number;
  base64Wav: string;
}

const MUSIC_BPM = 116;
const STEP_SEC = 60 / MUSIC_BPM / 4; // 16th note (~0.129s)

// D minor / F major energetic sports-documentary progression (bass Hz, chord Hz[])
const CHORD_PROGRESSION: { bass: number; chord: number[]; arp: number[] }[] = [
  { bass: 73.42, chord: [293.66, 349.23, 440.0], arp: [293.66, 440.0, 523.25, 440.0] }, // Dm7
  { bass: 58.27, chord: [233.08, 293.66, 349.23], arp: [233.08, 349.23, 440.0, 349.23] }, // Bbmaj7
  { bass: 65.41, chord: [261.63, 329.63, 392.0], arp: [261.63, 392.0, 493.88, 392.0] }, // C
  { bass: 55.0, chord: [220.0, 261.63, 329.63], arp: [220.0, 329.63, 440.0, 329.63] }, // Am
];

class TtsAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private exportDest: MediaStreamAudioDestinationNode | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private cache = new Map<string, GeneratedAudioEntry>();
  private muted = false;

  // Procedural background music scheduler state
  private musicTimerId: number | null = null;
  private musicRunning = false;
  private musicNextStepTime = 0;
  private musicStepIndex = 0;
  private musicPlaybackRate = 1;
  private musicDucked = false;

  public ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.exportDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.exportDest);

      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = 1.0;
      this.voiceGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.72;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicDucked ? 0.055 : 0.16;
      this.musicGain.connect(this.masterGain);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 1.0);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public getExportStream(): MediaStream | null {
    this.ensureContext();
    return this.exportDest?.stream ?? null;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMusicDucked(ducked: boolean): void {
    this.musicDucked = ducked;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(ducked ? 0.055 : 0.16, this.ctx.currentTime, 0.18);
    }
  }

  public startMusic(playbackRate: number = 1): void {
    const ctx = this.ensureContext();
    this.musicPlaybackRate = Math.max(0.75, Math.min(1.5, playbackRate));
    if (this.musicRunning) return;

    this.musicRunning = true;
    this.musicNextStepTime = ctx.currentTime + 0.04;

    this.musicTimerId = window.setInterval(() => {
      if (!this.musicRunning || !this.ctx || !this.musicGain) return;
      const lookahead = 0.18;
      while (this.musicNextStepTime < this.ctx.currentTime + lookahead) {
        this.scheduleMusicStep(this.musicStepIndex, this.musicNextStepTime);
        this.musicNextStepTime += STEP_SEC / this.musicPlaybackRate;
        this.musicStepIndex = (this.musicStepIndex + 1) % 64;
      }
    }, 60);
  }

  public setMusicRate(playbackRate: number): void {
    this.musicPlaybackRate = Math.max(0.75, Math.min(1.5, playbackRate));
  }

  public stopMusic(): void {
    this.musicRunning = false;
    if (this.musicTimerId !== null) {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
  }

  private scheduleMusicStep(step: number, when: number): void {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    const dest = this.musicGain;
    const barIdx = Math.floor(step / 16) % CHORD_PROGRESSION.length;
    const stepInBar = step % 16;
    const harmonic = CHORD_PROGRESSION[barIdx];

    // 1. Warm chord pad at the start of every 16-step bar
    if (stepInBar === 0) {
      for (const freq of harmonic.chord) {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, when);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(760, when);

        const dur = (STEP_SEC * 15.5) / this.musicPlaybackRate;
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.linearRampToValueAtTime(0.09, when + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc.start(when);
        osc.stop(when + dur + 0.02);
      }
    }

    // 2. Driving syncopated bassline (steps 0, 3, 6, 8, 10, 14)
    if (
      stepInBar === 0 ||
      stepInBar === 3 ||
      stepInBar === 6 ||
      stepInBar === 8 ||
      stepInBar === 10 ||
      stepInBar === 14
    ) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      const octaveBoost = stepInBar === 10 || stepInBar === 14 ? 2 : 1;
      osc.frequency.setValueAtTime(harmonic.bass * octaveBoost, when);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(420, when);
      filter.frequency.exponentialRampToValueAtTime(160, when + 0.14);

      gain.gain.setValueAtTime(0.001, when);
      gain.gain.linearRampToValueAtTime(0.24, when + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.18);
    }

    // 3. Crisp broadcast synth arpeggio pulse on even 8th notes
    if (stepInBar % 2 === 0) {
      const arpFreq = harmonic.arp[(stepInBar / 2) % harmonic.arp.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(arpFreq * 2, when);

      gain.gain.setValueAtTime(0.0005, when);
      gain.gain.linearRampToValueAtTime(0.045, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0005, when + 0.13);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.14);
    }

    // 4. Kick drum on beats 1 & 3 (steps 0, 8, and subtle pickup on 11)
    if (stepInBar === 0 || stepInBar === 8 || stepInBar === 11) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const amp = stepInBar === 11 ? 0.18 : 0.34;
      osc.type = "sine";
      osc.frequency.setValueAtTime(125, when);
      osc.frequency.exponentialRampToValueAtTime(42, when + 0.09);

      gain.gain.setValueAtTime(amp, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.12);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.13);
    }

    // 5. Light rim/clap accent on beats 2 & 4 (steps 4, 12) + 8th hi-hats
    if (this.noiseBuffer && (stepInBar === 4 || stepInBar === 12 || stepInBar % 2 === 1)) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      const isBackbeat = stepInBar === 4 || stepInBar === 12;
      filter.type = isBackbeat ? "bandpass" : "highpass";
      filter.frequency.setValueAtTime(isBackbeat ? 2200 : 7200, when);
      filter.Q.value = isBackbeat ? 1.4 : 0.8;

      const peak = isBackbeat ? 0.11 : 0.032;
      const dur = isBackbeat ? 0.08 : 0.035;
      gain.gain.setValueAtTime(peak, when);
      gain.gain.exponentialRampToValueAtTime(0.0005, when + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      src.start(when);
      src.stop(when + dur + 0.01);
    }
  }

  public getCached(cueId: string, expectedVoice?: TtsVoiceName): GeneratedAudioEntry | undefined {
    const entry = this.cache.get(cueId);
    if (!entry) return undefined;
    if (expectedVoice && entry.voiceName !== expectedVoice) return undefined;
    return entry;
  }

  public getAllDurations(voicesByCue?: Record<string, TtsVoiceName>): Record<string, number> {
    const durations: Record<string, number> = {};
    for (const [cueId, entry] of this.cache.entries()) {
      if (!voicesByCue || voicesByCue[cueId] === entry.voiceName) {
        durations[cueId] = entry.durationSec;
      }
    }
    return durations;
  }

  public clearCache(): void {
    this.stopActiveVoice();
    this.cache.clear();
  }

  public stopActiveVoice(): void {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // Ignore already-stopped source
      }
      this.activeSource = null;
    }
    this.setMusicDucked(false);
  }

  public playCueAudio(cueId: string, offsetSec: number = 0, playbackRate: number = 1): boolean {
    const entry = this.cache.get(cueId);
    if (!entry) {
      this.setMusicDucked(false);
      return false;
    }
    const ctx = this.ensureContext();
    this.stopActiveVoice();

    const safeOffset = Math.max(0, Math.min(offsetSec, Math.max(0, entry.durationSec - 0.05)));
    if (offsetSec >= entry.durationSec - 0.04) {
      this.setMusicDucked(false);
      return false;
    }

    const source = ctx.createBufferSource();
    source.buffer = entry.buffer;
    source.playbackRate.value = playbackRate;
    source.connect(this.voiceGain!);
    source.onended = () => {
      if (this.activeSource === source) {
        this.activeSource = null;
        this.setMusicDucked(false);
      }
    };
    source.start(0, safeOffset);
    this.activeSource = source;
    this.setMusicDucked(true);
    return true;
  }

  public playTransitionSfx(): void {
    this.playSfx("whoosh");
  }

  public playSfx(type: SfxType): void {
    if (this.muted) return;
    try {
      const ctx = this.ensureContext();
      const dest = this.sfxGain ?? this.masterGain!;
      const now = ctx.currentTime;

      switch (type) {
        case "whoosh": {
          if (!this.noiseBuffer) return;
          const src = ctx.createBufferSource();
          src.buffer = this.noiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.Q.value = 1.5;
          filter.frequency.setValueAtTime(240, now);
          filter.frequency.exponentialRampToValueAtTime(2100, now + 0.13);
          filter.frequency.exponentialRampToValueAtTime(420, now + 0.28);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.29);

          src.connect(filter);
          filter.connect(gain);
          gain.connect(dest);
          src.start(now);
          src.stop(now + 0.31);
          break;
        }

        case "whistle": {
          // Authentic dual-tone modulated referee pea-whistle
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          const gain = ctx.createGain();

          osc1.type = "sine";
          osc2.type = "sine";
          osc1.frequency.setValueAtTime(2880, now);
          osc2.frequency.setValueAtTime(3090, now);

          lfo.frequency.setValueAtTime(38, now);
          lfoGain.gain.setValueAtTime(110, now);
          lfo.connect(lfoGain);
          lfoGain.connect(osc1.frequency);
          lfoGain.connect(osc2.frequency);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.11, now + 0.025);
          gain.gain.setValueAtTime(0.1, now + 0.22);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.32);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(dest);

          lfo.start(now);
          osc1.start(now);
          osc2.start(now);
          lfo.stop(now + 0.34);
          osc1.stop(now + 0.34);
          osc2.stop(now + 0.34);
          break;
        }

        case "select": {
          // Crisp, refined selection chime when an element is focused/selected
          const freqs = [659.25, 987.77]; // E5 -> B5 clean fifth
          freqs.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + idx * 0.032;
            osc.type = "sine";
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.09, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.16);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(t);
            osc.stop(t + 0.18);
          });
          break;
        }
      }
    } catch {
      // Ignore audio context restriction before user gesture
    }
  }

  public async generateCueVoice(
    cueId: string,
    text: string,
    voiceName: TtsVoiceName,
    style: string
  ): Promise<GeneratedAudioEntry> {
    const existing = this.getCached(cueId, voiceName);
    if (existing) return existing;

    let lastError = "Error al generar voz IA.";

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ cueId, text, voiceName, style }),
        });

        const rawBody = await response.text();
        const parsed = parseTtsApiResponse(
          response.status,
          response.headers.get("content-type"),
          rawBody
        );

        if (parsed.ok) {
          const binary = atob(parsed.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }

          const ctx = this.ensureContext();
          const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));

          const entry: GeneratedAudioEntry = {
            cueId,
            voiceName,
            buffer: audioBuffer,
            durationSec: audioBuffer.duration,
            base64Wav: parsed.audioBase64,
          };
          this.cache.set(cueId, entry);
          return entry;
        }

        lastError = parsed.error;
        if (!parsed.retryable || attempt === 1) {
          throw new Error(parsed.error);
        }
      } catch (err) {
        if (err instanceof Error && !err.message.includes("Failed to fetch")) {
          if (attempt === 1) throw err;
          lastError = err.message;
        } else {
          lastError = err instanceof Error ? err.message : lastError;
          if (attempt === 1) throw new Error(lastError);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 650));
    }

    throw new Error(lastError);
  }
}

export const ttsAudioEngine = new TtsAudioEngine();
