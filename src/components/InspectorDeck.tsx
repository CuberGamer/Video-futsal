import React from "react";
import { Mic, Play, RefreshCw, Scissors } from "lucide-react";
import {
  VOICE_OPTIONS,
  type CompiledTimeline,
  type PlaybackSnapshot,
  type SceneId,
  type SpeakerKey,
  type TtsVoiceName,
} from "../data/futsalScript";
import { formatTimecode } from "../engine/motionMath";
import type { StudioTab } from "./TopBar";

interface InspectorDeckProps {
  activeTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  timeline: CompiledTimeline;
  snapshot: PlaybackSnapshot;
  speakerVoices: Record<SpeakerKey, TtsVoiceName>;
  onChangeSpeakerVoice: (speaker: SpeakerKey, voice: TtsVoiceName) => void;
  onSelectScene: (sceneId: SceneId) => void;
  onSelectCue: (startTime: number) => void;
  onGenerateSingleCue: (cueId: string) => void;
  onGenerateAllVoices: () => void;
  generatingCueId: string | null;
  isGeneratingVoices: boolean;
  generatedCueIds: Set<string>;
  ttsError: string | null;
}

export const InspectorDeck: React.FC<InspectorDeckProps> = ({
  activeTab,
  onSelectTab,
  timeline,
  snapshot,
  speakerVoices,
  onChangeSpeakerVoice,
  onSelectScene,
  onSelectCue,
  onGenerateSingleCue,
  onGenerateAllVoices,
  generatingCueId,
  isGeneratingVoices,
  generatedCueIds,
  ttsError,
}) => {
  const speakers: SpeakerKey[] = ["Siles", "Moya", "Jairo y Santos"];
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  return (
    <aside className="rounded-xl border border-slate-800/90 bg-[#101822] flex flex-col overflow-hidden h-full max-h-[680px]">
      {/* Segmented Control */}
      <div className="p-2.5 border-b border-slate-800/80 bg-[#0D141D]">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-lg">
          <button
            type="button"
            onClick={() => onSelectTab("scenes")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "scenes"
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Escenas
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("voice")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "voice"
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Locución IA
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("script")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "script"
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Guión
          </button>
        </div>
      </div>

      {ttsError && (
        <div
          role="alert"
          className="mx-3 mt-3 px-3 py-2.5 rounded-lg border border-red-500/40 bg-red-950/40 text-xs text-red-200"
        >
          {ttsError}
        </div>
      )}

      {/* Tab Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {activeTab === "scenes" && (
          <>
            <p className="text-xs text-slate-400 pb-1">
              Secuencia armada sin Intro ni Escena 1 (reservadas para tu grabación).
            </p>

            {timeline.scenes.map((ts) => {
              const isCurrent = ts.scene.id === snapshot.activeScene.scene.id;
              const syncedCount = ts.cues.filter((c) => c.hasRealAudio).length;
              const narratableCount = ts.cues.filter((c) => !c.silent).length;

              return (
                <React.Fragment key={ts.scene.id}>
                  {ts.scene.liveActionGapBefore && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-700/80 bg-slate-900/40 text-xs text-slate-400">
                      <Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{ts.scene.liveActionGapBefore}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectScene(ts.scene.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      isCurrent
                        ? "bg-emerald-500/10 border-emerald-500/60"
                        : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-lg font-bold tracking-wide text-slate-100">
                        {ts.scene.sceneNumber}: {ts.scene.title}
                      </span>
                      <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                        {formatTimecode(ts.startTime)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>{ts.scene.speaker}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{ts.scene.scriptTimeRange}</span>
                      {narratableCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              syncedCount === narratableCount
                                ? "text-emerald-400"
                                : "text-slate-400"
                            }
                          >
                            {syncedCount}/{narratableCount} voz IA
                          </span>
                        </>
                      )}
                    </div>

                    <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">
                      {ts.scene.visualNote}
                    </p>
                  </button>
                </React.Fragment>
              );
            })}
          </>
        )}

        {activeTab === "voice" && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <h2 className="text-xs font-semibold text-slate-300">
                Voces por locutor (Gemini TTS)
              </h2>
              {speakers.map((sp) => (
                <div
                  key={sp}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-800 bg-slate-900/60"
                >
                  <label
                    htmlFor={`voice-${sp}`}
                    className="text-xs font-semibold text-slate-200 whitespace-nowrap"
                  >
                    {sp}
                  </label>
                  <select
                    id={`voice-${sp}`}
                    value={speakerVoices[sp]}
                    onChange={(e) =>
                      onChangeSpeakerVoice(sp, e.target.value as TtsVoiceName)
                    }
                    className="px-2.5 py-1.5 rounded-md border border-slate-700 bg-slate-950 text-xs text-slate-100 cursor-pointer"
                  >
                    {VOICE_OPTIONS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label} — {v.tone}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onGenerateAllVoices}
              disabled={isGeneratingVoices}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>
                {isGeneratingVoices
                  ? "Generando locución sincronizada..."
                  : "Generar y sincronizar todas las voces IA"}
              </span>
            </button>

            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-semibold text-slate-300">
                Estado por segmento ({generatedCueIds.size} sincronizados)
              </h3>
              {timeline.cues
                .filter((c) => !c.silent)
                .map((cue) => {
                  const isReady = cue.hasRealAudio;
                  const isBusy = generatingCueId === cue.id;
                  return (
                    <div
                      key={cue.id}
                      className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <span className="font-semibold">{cue.sceneNumber}</span>
                          <span aria-hidden="true">·</span>
                          <span>{cue.cueSpeaker ?? cue.speaker}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-emerald-400">
                            {cue.audioDurationSec.toFixed(1)}s {isReady ? "IA" : "est."}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{cue.text}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelectCue(cue.startTime)}
                          aria-label={`Escuchar segmento ${cue.id}`}
                          className="p-1.5 rounded-md border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onGenerateSingleCue(cue.id)}
                          disabled={isBusy || isGeneratingVoices}
                          aria-label={`Generar voz IA para ${cue.id}`}
                          className="p-1.5 rounded-md border border-slate-700 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {activeTab === "script" && (
          <div className="space-y-2">
            {timeline.cues.map((cue) => {
              const isActive = cue.id === snapshot.activeCue.id;
              return (
                <button
                  key={cue.id}
                  type="button"
                  onClick={() => onSelectCue(cue.startTime)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    isActive
                      ? "bg-emerald-500/12 border-emerald-500/70"
                      : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>
                      {cue.sceneNumber} · {cue.cueSpeaker ?? cue.speaker}
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatTimecode(cue.startTime)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-200">{cue.text}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
