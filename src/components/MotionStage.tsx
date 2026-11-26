import React from "react";
import {
  Download,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { CompiledTimeline, PlaybackSnapshot, SceneId } from "../data/futsalScript";
import { formatTimecode } from "../engine/motionMath";

interface MotionStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  timeline: CompiledTimeline;
  snapshot: PlaybackSnapshot;
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  isExporting: boolean;
  exportProgress: number;
  playbackRate: number;
  generatedCount: number;
  totalNarratableCount: number;
  onTogglePlay: () => void;
  onSeek: (timeSec: number) => void;
  onSelectScene: (sceneId: SceneId) => void;
  onPrevScene: () => void;
  onNextScene: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  onChangeRate: (rate: number) => void;
  onExportVideo: () => void;
}

export const MotionStage: React.FC<MotionStageProps> = ({
  canvasRef,
  timeline,
  snapshot,
  currentTime,
  isPlaying,
  isMuted,
  isExporting,
  exportProgress,
  playbackRate,
  generatedCount,
  totalNarratableCount,
  onTogglePlay,
  onSeek,
  onSelectScene,
  onPrevScene,
  onNextScene,
  onReset,
  onToggleMute,
  onChangeRate,
  onExportVideo,
}) => {
  const progressPct =
    timeline.totalDuration > 0
      ? Math.min(100, (currentTime / timeline.totalDuration) * 100)
      : 0;

  return (
    <section id="stage" className="flex flex-col gap-4">
      {/* 16:9 Broadcast Canvas Viewport */}
      <div
        data-testid="motion-stage"
        className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-[#080D13] shadow-2xl"
      >
        <canvas
          ref={canvasRef}
          data-testid="motion-canvas"
          data-scene={snapshot.activeScene.scene.id}
          data-cue={snapshot.activeCue.id}
          className="w-full h-full block"
        />

        {isExporting && (
          <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center gap-3 p-6">
            <p className="font-display text-2xl font-bold tracking-wide text-slate-100">
              Grabando video WebM sincronizado
            </p>
            <div className="w-64 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-150"
                style={{ width: `${Math.round(exportProgress * 100)}%` }}
              />
            </div>
            <p className="font-mono text-xs text-slate-300 tabular-nums">
              {Math.round(exportProgress * 100)}% completado — no cierres esta pestaña
            </p>
          </div>
        )}
      </div>

      {/* Interactive Timeline & Transport Deck */}
      <div className="rounded-xl border border-slate-800/90 bg-[#101822] p-4 flex flex-col gap-3.5">
        {/* Scene Segment Track */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="truncate">
              {snapshot.activeScene.scene.sceneNumber}: {snapshot.activeScene.scene.title}
              <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
              <span>{snapshot.activeScene.scene.speaker}</span>
            </span>
            <span className="font-mono tabular-nums text-slate-300 shrink-0">
              {generatedCount}/{totalNarratableCount} voces IA sincronizadas
            </span>
          </div>

          {/* Segmented Timeline Scrubber */}
          <div className="relative flex items-center gap-1 w-full h-7">
            {timeline.scenes.map((ts) => {
              const widthPct = (ts.duration / Math.max(0.01, timeline.totalDuration)) * 100;
              const isCurrent = ts.scene.id === snapshot.activeScene.scene.id;
              const shortLabel = ts.scene.sceneNumber
                .replace("Escena ", "E")
                .replace("Créditos", "Créd.");

              return (
                <button
                  key={ts.scene.id}
                  type="button"
                  onClick={() => onSelectScene(ts.scene.id)}
                  style={{ width: `${widthPct}%` }}
                  title={`${ts.scene.sceneNumber}: ${ts.scene.title} (${ts.scene.scriptTimeRange})`}
                  aria-label={`Ir a ${ts.scene.sceneNumber}: ${ts.scene.title}`}
                  className={`relative h-full rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer overflow-hidden flex items-center justify-center border ${
                    isCurrent
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  }`}
                >
                  <span className="truncate px-1">{shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Fine Scrubber Range Input */}
          <div className="relative flex items-center">
            <input
              type="range"
              aria-label="Línea de tiempo del video"
              min={0}
              max={Math.max(0.1, timeline.totalDuration)}
              step={0.05}
              value={Math.min(currentTime, timeline.totalDuration)}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-1.5 accent-emerald-400 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="sr-only">{progressPct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Transport Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={isExporting}
              aria-label={isPlaying ? "Pausar reproducción" : "Reproducir motion graphics"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? "Pausar" : "Reproducir"}</span>
            </button>

            <button
              type="button"
              onClick={onPrevScene}
              disabled={isExporting}
              aria-label="Escena anterior"
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onNextScene}
              disabled={isExporting}
              aria-label="Escena siguiente"
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onReset}
              disabled={isExporting}
              aria-label="Reiniciar al inicio"
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="ml-2 font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
              {formatTimecode(currentTime)} <span className="text-slate-600">/</span>{" "}
              {formatTimecode(timeline.totalDuration)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="playback-rate-select">
              Velocidad de reproducción
            </label>
            <select
              id="playback-rate-select"
              value={playbackRate}
              onChange={(e) => onChangeRate(Number(e.target.value))}
              className="px-2.5 py-2 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-mono text-slate-300 cursor-pointer"
            >
              <option value={1}>1.0x</option>
              <option value={1.15}>1.15x</option>
              <option value={1.25}>1.25x</option>
            </select>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? "Activar sonido" : "Silenciar sonido"}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onExportVideo}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isExporting ? "Exportando..." : "Exportar .webm"}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
