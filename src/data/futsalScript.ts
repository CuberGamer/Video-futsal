export type SpeakerKey = "Siles" | "Moya" | "Jairo y Santos";

export type TtsVoiceName = "Charon" | "Fenrir" | "Puck" | "Kore" | "Zephyr";

export type SceneId =
  | "scene-2"
  | "scene-3"
  | "scene-4"
  | "scene-5"
  | "scene-6"
  | "scene-7"
  | "scene-8"
  | "scene-9"
  | "scene-10"
  | "credits";

export interface ScriptCue {
  id: string;
  sceneId: SceneId;
  text: string;
  spokenText: string;
  defaultDurationSec: number;
  silent?: boolean;
  visualTag: string;
  cueSpeaker?: string;
}

export interface ScriptScene {
  id: SceneId;
  sceneNumber: string;
  title: string;
  scriptTimeRange: string;
  speaker: SpeakerKey | "Pantalla";
  visualNote: string;
  liveActionGapBefore?: string;
  cues: ScriptCue[];
}

export const VOICE_OPTIONS: { value: TtsVoiceName; label: string; tone: string }[] = [
  { value: "Charon", label: "Charon", tone: "Grave y documental" },
  { value: "Fenrir", label: "Fenrir", tone: "Enérgica y deportiva" },
  { value: "Puck", label: "Puck", tone: "Ágil y dinámica" },
  { value: "Kore", label: "Kore", tone: "Clara y narrativa" },
  { value: "Zephyr", label: "Zephyr", tone: "Suave y precisa" },
];

export const DEFAULT_SPEAKER_VOICES: Record<SpeakerKey, TtsVoiceName> = {
  Siles: "Charon",
  Moya: "Fenrir",
  "Jairo y Santos": "Puck",
};

export const CUE_GAP_SEC = 0.35;

export const FUTSAL_SCENES: ScriptScene[] = [
  {
    id: "scene-2",
    sceneNumber: "Escena 2",
    title: "Origen e Historia",
    scriptTimeRange: "0:15 – 0:40",
    speaker: "Siles",
    visualNote: "Mapa de Montevideo y línea de tiempo animada",
    liveActionGapBefore: "Tu grabación: Intro y Escena 1 (0:00 – 0:15)",
    cues: [
      {
        id: "s2-c1",
        sceneId: "scene-2",
        text: "El futsal nació en 1930 en Montevideo, Uruguay. Lo creó el profesor de educación física Juan Carlos Ceriani Gravier, en la YMCA. Combinó reglas de fútbol 11, básquet, balonmano y waterpolo.",
        spokenText:
          "El futsal nació en 1930 en Montevideo, Uruguay. Lo creó el profesor de educación física Juan Carlos Ceriani Gravier, en la YMCA. Combinó reglas de fútbol 11, básquet, balonmano y waterpolo.",
        defaultDurationSec: 11.5,
        visualTag: "montevideo-1930",
      },
      {
        id: "s2-c2",
        sceneId: "scene-2",
        text: "En 1971 se fundó la FIFUSA. En 1982 se jugó el primer Mundial de FIFUSA en São Paulo, y lo ganó Brasil. En 1985 la FIFUSA empezó a usar el nombre futsal.",
        spokenText:
          "En 1971 se fundó la FIFUSA. En 1982 se jugó el primer Mundial de FIFUSA en San Pablo, y lo ganó Brasil. En 1985 la FIFUSA empezó a usar el nombre futsal.",
        defaultDurationSec: 10.5,
        visualTag: "fifusa-timeline",
      },
      {
        id: "s2-c3",
        sceneId: "scene-2",
        text: "En 1989 la FIFA organizó el primer Mundial oficial, en Países Bajos, del 5 al 15 de enero. Brasil ganó. Desde entonces se juega cada cuatro años.",
        spokenText:
          "En 1989 la FIFA organizó el primer Mundial oficial, en Países Bajos, del 5 al 15 de enero. Brasil ganó. Desde entonces se juega cada cuatro años.",
        defaultDurationSec: 9.5,
        visualTag: "fifa-1989",
      },
    ],
  },
  {
    id: "scene-3",
    sceneNumber: "Escena 3",
    title: "Evolución y Torneos",
    scriptTimeRange: "0:40 – 0:55",
    speaker: "Siles",
    visualNote: "Íconos de evolución reglamentaria y pirámide de torneos",
    cues: [
      {
        id: "s3-c1",
        sceneId: "scene-3",
        text: "Las reglas se fueron ajustando: cambios ilimitados, retroceso al arquero, límite de 4 segundos, pelota número 4 con menos rebote y sin regla de fuera de juego.",
        spokenText:
          "Las reglas se fueron ajustando: cambios ilimitados, retroceso al arquero, límite de 4 segundos, pelota número 4 con menos rebote y sin regla de fuera de juego.",
        defaultDurationSec: 9.5,
        visualTag: "evolution-rules",
      },
      {
        id: "s3-c2",
        sceneId: "scene-3",
        text: "Hoy hay Mundiales de la FIFA, campeonatos continentales, ligas nacionales y competencias escolares y universitarias.",
        spokenText:
          "Hoy hay Mundiales de la FIFA, campeonatos continentales, ligas nacionales y competencias escolares y universitarias.",
        defaultDurationSec: 7.0,
        visualTag: "tournaments-pyramid",
      },
    ],
  },
  {
    id: "scene-4",
    sceneNumber: "Escena 4",
    title: "El Campo de Juego",
    scriptTimeRange: "0:55 – 1:10",
    speaker: "Moya",
    visualNote: "Plano aéreo de la cancha con las medidas marcadas",
    cues: [
      {
        id: "s4-c1",
        sceneId: "scene-4",
        text: "En partidos internacionales, la cancha mide de 38 a 42 metros de largo y de 20 a 25 metros de ancho.",
        spokenText:
          "En partidos internacionales, la cancha mide de 38 a 42 metros de largo y de 20 a 25 metros de ancho.",
        defaultDurationSec: 6.5,
        visualTag: "court-dimensions",
      },
      {
        id: "s4-c2",
        sceneId: "scene-4",
        text: "El área del arquero es un cuarto de círculo de 6 metros de radio. El punto de penal está a 6 metros, y el segundo punto, a 10 metros, para faltas acumuladas. El arco mide 3 por 2 metros. En el centro, el círculo de 3 metros de radio es donde se hace el saque inicial.",
        spokenText:
          "El área del arquero es un cuarto de círculo de 6 metros de radio. El punto de penal está a 6 metros, y el segundo punto, a 10 metros, para faltas acumuladas. El arco mide 3 por 2 metros. En el centro, el círculo de 3 metros de radio es donde se hace el saque inicial.",
        defaultDurationSec: 14.5,
        visualTag: "court-zones",
      },
    ],
  },
  {
    id: "scene-5",
    sceneNumber: "Escena 5",
    title: "Técnicas",
    scriptTimeRange: "1:10 – 1:40",
    speaker: "Jairo y Santos",
    visualNote: "Primer plano en recuadro de cada técnica con su nombre en pantalla",
    cues: [
      {
        id: "s5-c1",
        sceneId: "scene-5",
        cueSpeaker: "Jairo",
        text: "Corto y preciso, por el espacio reducido. Con el interior del pie para controlar y con el empeine para pases largos.",
        spokenText:
          "Pase: Corto y preciso, por el espacio reducido. Con el interior del pie para controlar y con el empeine para pases largos.",
        defaultDurationSec: 7.5,
        visualTag: "tech-pase",
      },
      {
        id: "s5-c2",
        sceneId: "scene-5",
        cueSpeaker: "Jairo",
        text: "Con el empeine para potencia, con el interior para precisión y con la puntera en situaciones de apuro. Mirar el arco y apoyar bien el pie de sostén.",
        spokenText:
          "Remate: Con el empeine para potencia, con el interior para precisión y con la puntera en situaciones de apuro. Mirar el arco y apoyar bien el pie de sostén.",
        defaultDurationSec: 9.0,
        visualTag: "tech-remate",
      },
      {
        id: "s5-c3",
        sceneId: "scene-5",
        cueSpeaker: "Santos",
        text: "Con el interior, el exterior o la planta del pie, y con el pecho en pelotas altas. Orientar el cuerpo hacia el espacio libre antes de recibir.",
        spokenText:
          "Control: Con el interior, el exterior o la planta del pie, y con el pecho en pelotas altas. Orientar el cuerpo hacia el espacio libre antes de recibir.",
        defaultDurationSec: 8.5,
        visualTag: "tech-control",
      },
      {
        id: "s5-c4",
        sceneId: "scene-5",
        cueSpeaker: "Santos",
        text: "Superar a un rival con cambios de dirección, fintas, amagues o cambios de ritmo. Por ejemplo, la bicicleta, el caño o la suela.",
        spokenText:
          "Regate o pique: Superar a un rival con cambios de dirección, fintas, amagues o cambios de ritmo. Por ejemplo, la bicicleta, el caño o la suela.",
        defaultDurationSec: 8.5,
        visualTag: "tech-regate",
      },
      {
        id: "s5-c5",
        sceneId: "scene-5",
        cueSpeaker: "Jairo",
        text: "Toques cortos, la cabeza levantada y el cuerpo entre el rival y la pelota.",
        spokenText:
          "Conducción: Toques cortos, la cabeza levantada y el cuerpo entre el rival y la pelota.",
        defaultDurationSec: 5.5,
        visualTag: "tech-conduccion",
      },
      {
        id: "s5-c6",
        sceneId: "scene-5",
        cueSpeaker: "Santos",
        text: "Marcaje individual, presión sobre el jugador con pelota, cobertura de un compañero, quite sin falta y organización de la marca en el área.",
        spokenText:
          "Defensa: Marcaje individual, presión sobre el jugador con pelota, cobertura de un compañero, quite sin falta y organización de la marca en el área.",
        defaultDurationSec: 8.5,
        visualTag: "tech-defensa",
      },
    ],
  },
  {
    id: "scene-6",
    sceneNumber: "Escena 6",
    title: "Reglas Principales",
    scriptTimeRange: "1:40 – 2:15",
    speaker: "Moya",
    visualNote: "Íconos numerados animados para cada regla",
    cues: [
      {
        id: "s6-c1",
        sceneId: "scene-6",
        text: "Cinco jugadores por equipo, incluido el arquero, con cambios ilimitados. Dos tiempos de 20 minutos de tiempo efectivo. Cada equipo puede pedir un minuto de tiempo muerto por tiempo. No hay fuera de juego.",
        spokenText:
          "Cinco jugadores por equipo, incluido el arquero, con cambios ilimitados. Dos tiempos de 20 minutos de tiempo efectivo. Cada equipo puede pedir un minuto de tiempo muerto por tiempo. No hay fuera de juego.",
        defaultDurationSec: 11.5,
        visualTag: "rule-01-basics",
      },
      {
        id: "s6-c2",
        sceneId: "scene-6",
        text: "El arquero tiene 4 segundos con la pelota en las manos. Los saques de banda, de esquina, de meta y los tiros libres también tienen 4 segundos.",
        spokenText:
          "El arquero tiene 4 segundos con la pelota en las manos. Los saques de banda, de esquina, de meta y los tiros libres también tienen 4 segundos.",
        defaultDurationSec: 8.5,
        visualTag: "rule-02-4sec",
      },
      {
        id: "s6-c3",
        sceneId: "scene-6",
        text: "Si el arquero toma con la mano un pase deliberado con el pie de un compañero, es tiro libre indirecto.",
        spokenText:
          "Si el arquero toma con la mano un pase deliberado con el pie de un compañero, es tiro libre indirecto.",
        defaultDurationSec: 6.5,
        visualTag: "rule-03-backpass",
      },
      {
        id: "s6-c4",
        sceneId: "scene-6",
        text: "Desde la sexta falta acumulada por tiempo, el rival tiene tiro libre directo sin barrera desde el segundo penal, a 10 metros.",
        spokenText:
          "Desde la sexta falta acumulada por tiempo, el rival tiene tiro libre directo sin barrera desde el segundo penal, a 10 metros.",
        defaultDurationSec: 7.5,
        visualTag: "rule-04-6thfoul",
      },
      {
        id: "s6-c5",
        sceneId: "scene-6",
        text: "Tiro libre directo: se puede marcar gol directo. Indirecto: el gol vale solo si otro jugador toca la pelota antes. La barrera se ubica a 5 metros.",
        spokenText:
          "Tiro libre directo: se puede marcar gol directo. Indirecto: el gol vale solo si otro jugador toca la pelota antes. La barrera se ubica a 5 metros.",
        defaultDurationSec: 8.5,
        visualTag: "rule-05-freekicks",
      },
      {
        id: "s6-c6",
        sceneId: "scene-6",
        text: "El penal se ejecuta desde 6 metros. El arquero debe quedarse sobre la línea hasta que se patee.",
        spokenText:
          "El penal se ejecuta desde 6 metros. El arquero debe quedarse sobre la línea hasta que se patee.",
        defaultDurationSec: 6.0,
        visualTag: "rule-06-penalty",
      },
      {
        id: "s6-c7",
        sceneId: "scene-6",
        text: "Tarjeta amarilla: amonestación. Dos amarillas o una roja: expulsión, sin reemplazo. Las faltas graves pueden tener una suspensión de 2 minutos.",
        spokenText:
          "Tarjeta amarilla: amonestación. Dos amarillas o una roja: expulsión, sin reemplazo. Las faltas graves pueden tener una suspensión de 2 minutos.",
        defaultDurationSec: 8.5,
        visualTag: "rule-07-cards",
      },
    ],
  },
  {
    id: "scene-7",
    sceneNumber: "Escena 7",
    title: "Tipos de Infracciones",
    scriptTimeRange: "2:15 – 2:30",
    speaker: "Moya",
    visualNote: "Tres columnas animadas: Personales, Técnicas y Disciplinarias",
    cues: [
      {
        id: "s7-c1",
        sceneId: "scene-7",
        text: "Personales: contacto indebido, como empujar, sujetar o golpear. Tiro libre directo.",
        spokenText:
          "Personales: contacto indebido, como empujar, sujetar o golpear. Tiro libre directo.",
        defaultDurationSec: 5.5,
        visualTag: "col-personales",
      },
      {
        id: "s7-c2",
        sceneId: "scene-7",
        text: "Técnicas: sin contacto, como que el arquero retenga la pelota más de 4 segundos. Tiro libre indirecto.",
        spokenText:
          "Técnicas: sin contacto, como que el arquero retenga la pelota más de 4 segundos. Tiro libre indirecto.",
        defaultDurationSec: 6.5,
        visualTag: "col-tecnicas",
      },
      {
        id: "s7-c3",
        sceneId: "scene-7",
        text: "Disciplinarias: protestar o tener conducta antideportiva. Tarjeta amarilla o roja.",
        spokenText:
          "Disciplinarias: protestar o tener conducta antideportiva. Tarjeta amarilla o roja.",
        defaultDurationSec: 5.5,
        visualTag: "col-disciplinarias",
      },
    ],
  },
  {
    id: "scene-8",
    sceneNumber: "Escena 8",
    title: "El Rol del Arquero",
    scriptTimeRange: "2:30 – 2:40",
    speaker: "Siles",
    visualNote: "Una atajada y una salida jugando con los pies",
    cues: [
      {
        id: "s8-c1",
        sceneId: "scene-8",
        text: "El arquero juega con los pies como un jugador más, sale como línea extra, organiza la defensa e inicia los contraataques.",
        spokenText:
          "El arquero juega con los pies como un jugador más, sale como línea extra, organiza la defensa e inicia los contraataques.",
        defaultDurationSec: 8.0,
        visualTag: "goalkeeper-sweeper",
      },
    ],
  },
  {
    id: "scene-9",
    sceneNumber: "Escena 9",
    title: "Formaciones y Sistemas",
    scriptTimeRange: "2:40 – 2:50",
    speaker: "Moya",
    visualNote: "Gráfico animado de formaciones en la cancha",
    cues: [
      {
        id: "s9-c1",
        sceneId: "scene-9",
        text: "Formaciones comunes: 1-2-1 y cuadrado 2-2. Hay un pívot de referencia arriba, dos alas por las bandas y un fijo o cierre que arma la defensa junto al arquero. También se usan el 3-1, con presión alta, y el 4-0.",
        spokenText:
          "Formaciones comunes: 1-2-1 y cuadrado 2-2. Hay un pívot de referencia arriba, dos alas por las bandas y un fijo o cierre que arma la defensa junto al arquero. También se usan el 3-1, con presión alta, y el 4-0.",
        defaultDurationSec: 13.0,
        visualTag: "formations-morph",
      },
    ],
  },
  {
    id: "scene-10",
    sceneNumber: "Escena 10",
    title: "Cierre",
    scriptTimeRange: "2:50 – 3:00",
    speaker: "Jairo y Santos",
    visualNote: "Los cinco integrantes en la cancha",
    cues: [
      {
        id: "s10-c1",
        sceneId: "scene-10",
        text: "Así que eso fue lo básico: cancha, técnicas, reglas, arquero y formaciones. El futsal combina rapidez, técnica y trabajo colectivo.",
        spokenText:
          "Así que eso fue lo básico: cancha, técnicas, reglas, arquero y formaciones. El futsal combina rapidez, técnica y trabajo colectivo.",
        defaultDurationSec: 8.5,
        visualTag: "closing-five",
      },
    ],
  },
  {
    id: "credits",
    sceneNumber: "Créditos",
    title: "Fuentes y Redes",
    scriptTimeRange: "3:00 – 3:10",
    speaker: "Pantalla",
    visualNote: "Fuentes: FIFA, The FA, futsal.com, Wikipedia, AMF y futsal.tech. IG de @deptoEF.ET20",
    cues: [
      {
        id: "cred-c1",
        sceneId: "credits",
        text: "Fuentes: FIFA, The FA, futsal.com, Wikipedia, AMF y futsal.tech. IG de @deptoEF.ET20",
        spokenText: "",
        defaultDurationSec: 7.0,
        silent: true,
        visualTag: "credits-slate",
      },
    ],
  },
];

export interface TimelineCue extends ScriptCue {
  speaker: SpeakerKey | "Pantalla";
  sceneTitle: string;
  sceneNumber: string;
  startTime: number;
  endTime: number;
  audioDurationSec: number;
  hasRealAudio: boolean;
}

export interface TimelineScene {
  scene: ScriptScene;
  startTime: number;
  endTime: number;
  duration: number;
  cues: TimelineCue[];
}

export interface CompiledTimeline {
  scenes: TimelineScene[];
  cues: TimelineCue[];
  totalDuration: number;
}

export interface PlaybackSnapshot {
  activeScene: TimelineScene;
  activeCue: TimelineCue;
  sceneIndex: number;
  cueIndex: number;
  cueIndexInScene: number;
  sceneElapsed: number;
  sceneProgress: number;
  cueElapsed: number;
  cueProgress: number;
}

export function computeTimeline(
  scenes: ScriptScene[],
  audioDurations: Record<string, number>,
  gapSec: number = CUE_GAP_SEC
): CompiledTimeline {
  let cursor = 0;
  const compiledScenes: TimelineScene[] = [];
  const flatCues: TimelineCue[] = [];

  for (const scene of scenes) {
    const sceneStart = cursor;
    const sceneCues: TimelineCue[] = [];

    for (const cue of scene.cues) {
      const realDur = audioDurations[cue.id];
      const hasRealAudio = typeof realDur === "number" && realDur > 0.1;
      const baseDur = hasRealAudio ? realDur : cue.defaultDurationSec;
      const totalCueDur = cue.silent ? baseDur : baseDur + gapSec;
      const cueStart = cursor;
      const cueEnd = cursor + totalCueDur;

      const compiledCue: TimelineCue = {
        ...cue,
        speaker: scene.speaker,
        sceneTitle: scene.title,
        sceneNumber: scene.sceneNumber,
        startTime: cueStart,
        endTime: cueEnd,
        audioDurationSec: baseDur,
        hasRealAudio,
      };

      sceneCues.push(compiledCue);
      flatCues.push(compiledCue);
      cursor = cueEnd;
    }

    compiledScenes.push({
      scene,
      startTime: sceneStart,
      endTime: cursor,
      duration: Math.max(0.01, cursor - sceneStart),
      cues: sceneCues,
    });
  }

  return {
    scenes: compiledScenes,
    cues: flatCues,
    totalDuration: cursor,
  };
}

export function getPlaybackSnapshot(
  timeline: CompiledTimeline,
  currentTime: number
): PlaybackSnapshot {
  const clamped = Math.max(0, Math.min(currentTime, Math.max(0, timeline.totalDuration - 0.0001)));

  let activeSceneIdx = timeline.scenes.length - 1;
  for (let i = 0; i < timeline.scenes.length; i++) {
    if (clamped < timeline.scenes[i].endTime) {
      activeSceneIdx = i;
      break;
    }
  }

  const activeScene = timeline.scenes[activeSceneIdx];

  let activeCueIdx = timeline.cues.length - 1;
  for (let i = 0; i < timeline.cues.length; i++) {
    if (clamped < timeline.cues[i].endTime) {
      activeCueIdx = i;
      break;
    }
  }
  const activeCue = timeline.cues[activeCueIdx];
  const cueIndexInScene = Math.max(
    0,
    activeScene.cues.findIndex((c) => c.id === activeCue.id)
  );

  const sceneElapsed = Math.max(0, clamped - activeScene.startTime);
  const sceneProgress = Math.min(1, sceneElapsed / Math.max(0.001, activeScene.duration));

  const cueTotal = Math.max(0.001, activeCue.endTime - activeCue.startTime);
  const cueElapsed = Math.max(0, clamped - activeCue.startTime);
  const cueProgress = Math.min(1, cueElapsed / cueTotal);

  return {
    activeScene,
    activeCue,
    sceneIndex: activeSceneIdx,
    cueIndex: activeCueIdx,
    cueIndexInScene,
    sceneElapsed,
    sceneProgress,
    cueElapsed,
    cueProgress,
  };
}

export function getNarratableCues(scenes: ScriptScene[] = FUTSAL_SCENES): ScriptCue[] {
  return scenes.flatMap((s) => s.cues).filter((c) => !c.silent && c.spokenText.trim().length > 0);
}
