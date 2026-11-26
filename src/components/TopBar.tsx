import React from "react";

export type StudioTab = "scenes" | "voice" | "script";

interface TopBarProps {
  activeTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  onExportClick: () => void;
  onGenerateAllVoices: () => void;
  isGeneratingVoices: boolean;
  generatedCount: number;
  totalNarratableCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onExportClick,
  onGenerateAllVoices,
  isGeneratingVoices,
  generatedCount,
  totalNarratableCount,
}) => {
  const allReady = generatedCount >= totalNarratableCount && totalNarratableCount > 0;

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/80 bg-[#0B1016]">
      <a
        href="#stage"
        className="font-display text-2xl font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
      >
        Futsal Motion Studio
      </a>

      <nav aria-label="Secciones del estudio" className="hidden md:flex items-center gap-7 text-sm font-medium">
        <button
          type="button"
          onClick={() => onSelectTab("scenes")}
          className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 border-b-2 ${
            activeTab === "scenes"
              ? "text-emerald-400 border-emerald-400"
              : "text-slate-400 border-transparent hover:text-slate-100"
          }`}
        >
          Escenas
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("voice")}
          className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 border-b-2 ${
            activeTab === "voice"
              ? "text-emerald-400 border-emerald-400"
              : "text-slate-400 border-transparent hover:text-slate-100"
          }`}
        >
          Voz IA
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("script")}
          className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 border-b-2 ${
            activeTab === "script"
              ? "text-emerald-400 border-emerald-400"
              : "text-slate-400 border-transparent hover:text-slate-100"
          }`}
        >
          Guión
        </button>
        <button
          type="button"
          onClick={onExportClick}
          className="whitespace-nowrap shrink-0 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer py-1 border-b-2 border-transparent"
        >
          Exportar
        </button>
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onGenerateAllVoices}
          disabled={isGeneratingVoices}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-wait transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          {isGeneratingVoices
            ? `Generando (${generatedCount}/${totalNarratableCount})`
            : allReady
            ? "Voces IA listas"
            : "Generar Voz IA"}
        </button>
      </div>
    </header>
  );
};
