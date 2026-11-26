import type { TtsVoiceName } from "../data/futsalScript";

export interface GeneratedAudioEntry {
  cueId: string;
  voiceName: TtsVoiceName;
  buffer: AudioBuffer;
  durationSec: number;
  base64Wav: string;
}

class TtsAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private exportDest: MediaStreamAudioDestinationNode | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private cache = new Map<string, GeneratedAudioEntry>();
  private muted = false;

  public ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
      this.exportDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.exportDest);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
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
  }

  public playCueAudio(cueId: string, offsetSec: number = 0, playbackRate: number = 1): boolean {
    const entry = this.cache.get(cueId);
    if (!entry) return false;
    const ctx = this.ensureContext();
    this.stopActiveVoice();

    const safeOffset = Math.max(0, Math.min(offsetSec, Math.max(0, entry.durationSec - 0.05)));
    if (offsetSec >= entry.durationSec - 0.04) {
      return false;
    }

    const source = ctx.createBufferSource();
    source.buffer = entry.buffer;
    source.playbackRate.value = playbackRate;
    source.connect(this.masterGain!);
    source.start(0, safeOffset);
    this.activeSource = source;
    return true;
  }

  public playTransitionSfx(): void {
    if (this.muted) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.09);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.15);
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

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cueId, text, voiceName, style }),
    });

    const payload = (await response.json()) as {
      audioBase64?: string;
      mimeType?: string;
      error?: string;
    };

    if (!response.ok || !payload.audioBase64) {
      throw new Error(payload.error || `Error ${response.status} al generar voz IA.`);
    }

    const binary = atob(payload.audioBase64);
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
      base64Wav: payload.audioBase64,
    };
    this.cache.set(cueId, entry);
    return entry;
  }
}

export const ttsAudioEngine = new TtsAudioEngine();
