import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InspectorDeck } from "./components/InspectorDeck";
import { MotionStage } from "./components/MotionStage";
import { TopBar, type StudioTab } from "./components/TopBar";
import {
  DEFAULT_SPEAKER_VOICES,
  FUTSAL_SCENES,
  computeTimeline,
  getNarratableCues,
  getPlaybackSnapshot,
  type SceneId,
  type SpeakerKey,
  type TtsVoiceName,
} from "./data/futsalScript";
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  renderMotionFrame,
} from "./engine/sceneRenderer";
import { ttsAudioEngine } from "./services/ttsService";

export default function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>("scenes");
  const [speakerVoices, setSpeakerVoices] = useState<Record<SpeakerKey, TtsVoiceName>>(
    DEFAULT_SPEAKER_VOICES
  );
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const [generatedCueIds, setGeneratedCueIds] = useState<Set<string>>(new Set());
  const [isGeneratingVoices, setIsGeneratingVoices] = useState(false);
  const [generatingCueId, setGeneratingCueId] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const playbackRateRef = useRef(1);
  const lastCueIdRef = useRef<string | null>(null);
  const lastSceneIdRef = useRef<string | null>(null);
  const globalClockRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const narratableCues = useMemo(() => getNarratableCues(FUTSAL_SCENES), []);

  const timeline = useMemo(
    () => computeTimeline(FUTSAL_SCENES, audioDurations),
    [audioDurations]
  );
  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;

  const snapshot = useMemo(
    () => getPlaybackSnapshot(timeline, currentTime),
    [timeline, currentTime]
  );

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    document.body.dataset.state = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // Support ?autostart=1 for automated playback verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autostart") === "1") {
      setIsPlaying(true);
    }
  }, []);

  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const targetW = Math.round(LOGICAL_WIDTH * dpr);
    const targetH = Math.round(LOGICAL_HEIGHT * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    let snap = getPlaybackSnapshot(timelineRef.current, currentTimeRef.current);
    if (!isPlayingRef.current && snap.cueElapsed < 0.05) {
      const previewTime = Math.min(
        snap.activeCue.endTime - 0.15,
        currentTimeRef.current + Math.min(2.2, snap.activeCue.audioDurationSec * 0.45)
      );
      snap = getPlaybackSnapshot(timelineRef.current, previewTime);
    }
    renderMotionFrame(ctx, snap, globalClockRef.current);
    ctx.restore();
  }, []);

  // Re-render current frame whenever paused time/timeline changes or fonts finish loading
  useEffect(() => {
    drawCurrentFrame();
    let active = true;
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (active) drawCurrentFrame();
      });
    }
    return () => {
      active = false;
    };
  }, [currentTime, timeline, drawCurrentFrame]);

  // 60fps requestAnimationFrame loop active only while playing
  useEffect(() => {
    if (!isPlaying) return;

    let rafId = 0;
    let lastTs = performance.now();
    let uiSyncAccum = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      globalClockRef.current += dt * playbackRateRef.current;

      const tl = timelineRef.current;
      const nextTime = currentTimeRef.current + dt * playbackRateRef.current;

      if (nextTime >= tl.totalDuration) {
        currentTimeRef.current = tl.totalDuration;
        setCurrentTime(tl.totalDuration);
        setIsPlaying(false);
        ttsAudioEngine.stopActiveVoice();

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
        drawCurrentFrame();
        return;
      }

      currentTimeRef.current = nextTime;
      uiSyncAccum += dt;
      if (uiSyncAccum >= 0.05) {
        uiSyncAccum = 0;
        setCurrentTime(nextTime);
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        setExportProgress(nextTime / Math.max(0.01, tl.totalDuration));
      }

      const snap = getPlaybackSnapshot(tl, nextTime);
      if (snap.activeScene.scene.id !== lastSceneIdRef.current) {
        lastSceneIdRef.current = snap.activeScene.scene.id;
        ttsAudioEngine.playTransitionSfx();
      }
      if (snap.activeCue.id !== lastCueIdRef.current) {
        lastCueIdRef.current = snap.activeCue.id;
        if (!snap.activeCue.silent) {
          ttsAudioEngine.playCueAudio(
            snap.activeCue.id,
            snap.cueElapsed,
            playbackRateRef.current
          );
        } else {
          ttsAudioEngine.stopActiveVoice();
        }
      }

      drawCurrentFrame();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, drawCurrentFrame]);

  const syncDurationsFromCache = useCallback(
    (voicesMap: Record<SpeakerKey, TtsVoiceName>) => {
      const durations: Record<string, number> = {};
      const readyIds = new Set<string>();
      for (const scene of FUTSAL_SCENES) {
        if (scene.speaker === "Pantalla") continue;
        const voice = voicesMap[scene.speaker];
        for (const cue of scene.cues) {
          const cached = ttsAudioEngine.getCached(cue.id, voice);
          if (cached) {
            durations[cue.id] = cached.durationSec;
            readyIds.add(cue.id);
          }
        }
      }
      setAudioDurations(durations);
      setGeneratedCueIds(readyIds);
    },
    []
  );

  const handleChangeSpeakerVoice = useCallback(
    (speaker: SpeakerKey, voice: TtsVoiceName) => {
      setSpeakerVoices((prev) => {
        const next = { ...prev, [speaker]: voice };
        syncDurationsFromCache(next);
        return next;
      });
    },
    [syncDurationsFromCache]
  );

  const getVoiceForCue = useCallback(
    (cueId: string, voicesMap: Record<SpeakerKey, TtsVoiceName>): TtsVoiceName => {
      for (const scene of FUTSAL_SCENES) {
        if (scene.cues.some((c) => c.id === cueId)) {
          if (scene.speaker === "Pantalla") return "Charon";
          return voicesMap[scene.speaker];
        }
      }
      return "Charon";
    },
    []
  );

  const handleGenerateSingleCue = useCallback(
    async (cueId: string) => {
      const cue = narratableCues.find((c) => c.id === cueId);
      if (!cue) return;
      setTtsError(null);
      setGeneratingCueId(cueId);
      try {
        const voice = getVoiceForCue(cueId, speakerVoices);
        await ttsAudioEngine.generateCueVoice(
          cue.id,
          cue.spokenText,
          voice,
          "Locutor documental deportivo en español latinoamericano, claro, dinámico y entusiasta."
        );
        syncDurationsFromCache(speakerVoices);
      } catch (err) {
        setTtsError(
          err instanceof Error ? err.message : "No se pudo generar la voz IA."
        );
      } finally {
        setGeneratingCueId(null);
      }
    },
    [narratableCues, getVoiceForCue, speakerVoices, syncDurationsFromCache]
  );

  const handleGenerateAllVoices = useCallback(async () => {
    if (isGeneratingVoices) return;
    setTtsError(null);
    setIsGeneratingVoices(true);
    ttsAudioEngine.ensureContext();

    try {
      const queue = [...narratableCues];
      const concurrency = 2;

      const worker = async () => {
        while (queue.length > 0) {
          const cue = queue.shift();
          if (!cue) break;
          const voice = getVoiceForCue(cue.id, speakerVoices);
          setGeneratingCueId(cue.id);
          await ttsAudioEngine.generateCueVoice(
            cue.id,
            cue.spokenText,
            voice,
            "Locutor documental deportivo en español latinoamericano, claro, dinámico y entusiasta."
          );
          syncDurationsFromCache(speakerVoices);
        }
      };

      await Promise.all(Array.from({ length: concurrency }, () => worker()));
      setGeneratingCueId(null);
    } catch (err) {
      setTtsError(
        err instanceof Error
          ? err.message
          : "Error al generar la locución IA. Verifica tu API key."
      );
    } finally {
      setGeneratingCueId(null);
      setIsGeneratingVoices(false);
    }
  }, [
    isGeneratingVoices,
    narratableCues,
    getVoiceForCue,
    speakerVoices,
    syncDurationsFromCache,
  ]);

  const seekToTime = useCallback(
    (timeSec: number, autoPlay?: boolean) => {
      const clamped = Math.max(0, Math.min(timeSec, timeline.totalDuration));
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);

      const snap = getPlaybackSnapshot(timeline, clamped);
      lastCueIdRef.current = snap.activeCue.id;
      lastSceneIdRef.current = snap.activeScene.scene.id;
      ttsAudioEngine.stopActiveVoice();

      const shouldPlay = autoPlay ?? isPlayingRef.current;
      if (autoPlay) setIsPlaying(true);
      if (shouldPlay && !snap.activeCue.silent) {
        ttsAudioEngine.playCueAudio(
          snap.activeCue.id,
          snap.cueElapsed,
          playbackRateRef.current
        );
      }
    },
    [timeline]
  );

  const handleTogglePlay = useCallback(() => {
    ttsAudioEngine.ensureContext();
    if (isPlayingRef.current) {
      setIsPlaying(false);
      ttsAudioEngine.stopActiveVoice();
    } else {
      let startAt = currentTimeRef.current;
      if (startAt >= timelineRef.current.totalDuration - 0.05) {
        startAt = 0;
        currentTimeRef.current = 0;
        setCurrentTime(0);
      }
      const snap = getPlaybackSnapshot(timelineRef.current, startAt);
      lastCueIdRef.current = snap.activeCue.id;
      lastSceneIdRef.current = snap.activeScene.scene.id;
      if (!snap.activeCue.silent) {
        ttsAudioEngine.playCueAudio(
          snap.activeCue.id,
          snap.cueElapsed,
          playbackRateRef.current
        );
      }
      setIsPlaying(true);
    }
  }, []);

  const handleSelectScene = useCallback(
    (sceneId: SceneId) => {
      const target = timeline.scenes.find((s) => s.scene.id === sceneId);
      if (target) seekToTime(target.startTime);
    },
    [timeline, seekToTime]
  );

  const handlePrevScene = useCallback(() => {
    const prevIdx = Math.max(0, snapshot.sceneIndex - 1);
    seekToTime(timeline.scenes[prevIdx].startTime);
  }, [snapshot.sceneIndex, timeline.scenes, seekToTime]);

  const handleNextScene = useCallback(() => {
    const nextIdx = Math.min(timeline.scenes.length - 1, snapshot.sceneIndex + 1);
    seekToTime(timeline.scenes[nextIdx].startTime);
  }, [snapshot.sceneIndex, timeline.scenes, seekToTime]);

  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    ttsAudioEngine.setMuted(next);
  }, [isMuted]);

  const handleExportVideo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isExporting) return;

    if (typeof MediaRecorder === "undefined") {
      setTtsError("Tu navegador no soporta MediaRecorder para exportar WebM.");
      return;
    }

    try {
      ttsAudioEngine.ensureContext();
      const canvasStream = canvas.captureStream(30);
      const audioStream = ttsAudioEngine.getExportStream();
      const tracks = [...canvasStream.getVideoTracks()];
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }
      const combined = new MediaStream(tracks);

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(combined, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        setIsExporting(false);
        setExportProgress(0);
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "futsal-motion-graphics.webm";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      };

      mediaRecorderRef.current = recorder;
      setIsExporting(true);
      setExportProgress(0);
      setPlaybackRate(1);
      playbackRateRef.current = 1;

      seekToTime(0, true);
      recorder.start(250);
    } catch (err) {
      setIsExporting(false);
      setTtsError(
        err instanceof Error ? err.message : "No se pudo iniciar la exportación WebM."
      );
    }
  }, [isExporting, seekToTime]);

  // Spacebar shortcut to play/pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON") {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleTogglePlay]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1016] text-slate-100">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExportClick={handleExportVideo}
        onGenerateAllVoices={handleGenerateAllVoices}
        isGeneratingVoices={isGeneratingVoices}
        generatedCount={generatedCueIds.size}
        totalNarratableCount={narratableCues.length}
      />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-8">
            <MotionStage
              canvasRef={canvasRef}
              timeline={timeline}
              snapshot={snapshot}
              currentTime={currentTime}
              isPlaying={isPlaying}
              isMuted={isMuted}
              isExporting={isExporting}
              exportProgress={exportProgress}
              playbackRate={playbackRate}
              generatedCount={generatedCueIds.size}
              totalNarratableCount={narratableCues.length}
              onTogglePlay={handleTogglePlay}
              onSeek={(t) => seekToTime(t)}
              onSelectScene={handleSelectScene}
              onPrevScene={handlePrevScene}
              onNextScene={handleNextScene}
              onReset={() => {
                setIsPlaying(false);
                seekToTime(0, false);
              }}
              onToggleMute={handleToggleMute}
              onChangeRate={setPlaybackRate}
              onExportVideo={handleExportVideo}
            />
          </div>

          <div className="lg:col-span-4">
            <InspectorDeck
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              timeline={timeline}
              snapshot={snapshot}
              speakerVoices={speakerVoices}
              onChangeSpeakerVoice={handleChangeSpeakerVoice}
              onSelectScene={handleSelectScene}
              onSelectCue={(t) => seekToTime(t, true)}
              onGenerateSingleCue={handleGenerateSingleCue}
              onGenerateAllVoices={handleGenerateAllVoices}
              generatingCueId={generatingCueId}
              isGeneratingVoices={isGeneratingVoices}
              generatedCueIds={generatedCueIds}
              ttsError={ttsError}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
