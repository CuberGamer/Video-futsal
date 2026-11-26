export interface TtsResponseSuccess {
  ok: true;
  audioBase64: string;
  mimeType: string;
}

export interface TtsResponseFailure {
  ok: false;
  error: string;
  retryable: boolean;
}

export type ParsedTtsResponse = TtsResponseSuccess | TtsResponseFailure;

export function parseTtsApiResponse(
  status: number,
  contentType: string | null,
  rawBody: string
): ParsedTtsResponse {
  const trimmed = rawBody.trim();
  const looksLikeHtml =
    trimmed.startsWith("<") ||
    (contentType ? contentType.toLowerCase().includes("text/html") : false);

  if (looksLikeHtml) {
    const hint =
      status === 200
        ? "Recarga la vista previa o asegúrate de abrir la URL de desarrollo activa con backend (/api/tts)."
        : "Verifica que el servidor backend (/api/tts) esté activo o vuelve a intentarlo.";
    return {
      ok: false,
      error: `El servidor devolvió una página HTML en lugar de JSON (HTTP ${status}). ${hint}`,
      retryable: status >= 500 || status === 0,
    };
  }

  if (!trimmed) {
    return {
      ok: false,
      error: `El servidor devolvió una respuesta vacía (HTTP ${status}).`,
      retryable: status >= 500,
    };
  }

  let parsed: { audioBase64?: unknown; mimeType?: unknown; error?: unknown };
  try {
    parsed = JSON.parse(trimmed) as {
      audioBase64?: unknown;
      mimeType?: unknown;
      error?: unknown;
    };
  } catch {
    return {
      ok: false,
      error: `Respuesta no válida del servidor TTS (HTTP ${status}).`,
      retryable: status >= 500,
    };
  }

  if (status < 200 || status >= 300 || typeof parsed.audioBase64 !== "string" || !parsed.audioBase64) {
    const errMsg =
      typeof parsed.error === "string" && parsed.error.trim().length > 0
        ? parsed.error
        : `Error ${status} al generar voz IA.`;
    return {
      ok: false,
      error: errMsg,
      retryable: status >= 502,
    };
  }

  return {
    ok: true,
    audioBase64: parsed.audioBase64,
    mimeType: typeof parsed.mimeType === "string" ? parsed.mimeType : "audio/wav",
  };
}
