import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

interface CachedAudio {
  audioBase64: string;
  mimeType: string;
  createdAt: number;
}

const ttsCache = new Map<string, CachedAudio>();

function getGeminiClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en el servidor.");
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function ensureWavBuffer(rawBuffer: Buffer, mimeType: string): { buffer: Buffer; mimeType: string } {
  const isRiff =
    rawBuffer.length >= 12 &&
    rawBuffer.toString("ascii", 0, 4) === "RIFF" &&
    rawBuffer.toString("ascii", 8, 12) === "WAVE";

  if (isRiff || (mimeType.includes("wav") && rawBuffer.length > 44)) {
    return { buffer: rawBuffer, mimeType: "audio/wav" };
  }

  // Raw L16 PCM (24kHz, mono, 16-bit LE) -> wrap with 44-byte RIFF/WAV header
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = rawBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // AudioFormat = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return {
    buffer: Buffer.concat([header, rawBuffer]),
    mimeType: "audio/wav",
  };
}

let workingStrategyIndex: number | null = null;

async function generateSpeechWithRetry(
  text: string,
  voiceName: string,
  style: string,
  maxRetries = 2
): Promise<{ audioBase64: string; mimeType: string }> {
  const strategies: {
    model: string;
    apiVersion?: string;
    useSpeechMetadata: boolean;
    useSpeechConfig: boolean;
  }[] = [
    { model: "gemini-3.8-flash-lite-tts", apiVersion: undefined, useSpeechMetadata: true, useSpeechConfig: true },
    { model: "gemini-3.8-flash-lite-tts", apiVersion: "v1alpha", useSpeechMetadata: true, useSpeechConfig: true },
    { model: "gemini-3.8-flash-lite-tts", apiVersion: undefined, useSpeechMetadata: false, useSpeechConfig: true },
    { model: "gemini-2.5-flash-preview-tts", apiVersion: undefined, useSpeechMetadata: false, useSpeechConfig: true },
    { model: "gemini-3.8-flash-lite-tts", apiVersion: undefined, useSpeechMetadata: false, useSpeechConfig: false },
  ];

  const orderedIndices =
    workingStrategyIndex !== null
      ? [workingStrategyIndex, ...strategies.map((_, idx) => idx).filter((idx) => idx !== workingStrategyIndex)]
      : strategies.map((_, idx) => idx);

  let lastError: unknown = null;

  for (const idx of orderedIndices) {
    const strat = strategies[idx];
    const ai = getGeminiClient(strat.apiVersion);
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const part: Record<string, unknown> = strat.useSpeechMetadata
          ? { text, speechMetadata: { style } }
          : { text };

        const config: Record<string, unknown> = {
          responseModalities: ["AUDIO"],
        };
        if (strat.useSpeechConfig) {
          config.speechConfig = {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          };
        }

        const response = await ai.models.generateContent({
          model: strat.model,
          contents: [
            {
              role: "user",
              parts: [part as never],
            },
          ],
          config: config as never,
        });

        const resPart = response.candidates?.[0]?.content?.parts?.[0];
        const inlineData = resPart?.inlineData;
        if (!inlineData?.data) {
          throw new Error("El modelo no devolvió datos de audio.");
        }

        workingStrategyIndex = idx;
        const rawBuf = Buffer.from(inlineData.data, "base64");
        const wav = ensureWavBuffer(rawBuf, inlineData.mimeType || "audio/wav");

        return {
          audioBase64: wav.buffer.toString("base64"),
          mimeType: wav.mimeType,
        };
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("INVALID_ARGUMENT") || msg.includes("Unknown name") || msg.includes("NOT_FOUND") || msg.includes("404") || msg.includes("400")) {
          break;
        }
        if (attempt < maxRetries) {
          const delayMs = 600 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Error al generar voz IA.");
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceName = "Charon", style } = req.body ?? {};

      if (typeof text !== "string" || text.trim().length === 0) {
        res.status(400).json({ error: "El campo 'text' es obligatorio." });
        return;
      }

      if (text.length > 1500) {
        res.status(400).json({ error: "El texto supera el límite permitido." });
        return;
      }

      const validVoices = new Set(["Puck", "Charon", "Kore", "Fenrir", "Zephyr"]);
      const selectedVoice = validVoices.has(voiceName) ? voiceName : "Charon";
      const selectedStyle =
        typeof style === "string" && style.trim().length > 0
          ? style.trim()
          : "Locutor documental deportivo en español latinoamericano, ritmo dinámico, claro y entusiasta.";

      const cacheKey = `${selectedVoice}::${selectedStyle}::${text.trim()}`;
      const cached = ttsCache.get(cacheKey);
      if (cached) {
        res.json({
          audioBase64: cached.audioBase64,
          mimeType: cached.mimeType,
          cached: true,
        });
        return;
      }

      const result = await generateSpeechWithRetry(
        text.trim(),
        selectedVoice,
        selectedStyle
      );

      ttsCache.set(cacheKey, {
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        createdAt: Date.now(),
      });

      res.json({
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        cached: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al generar la locución IA.";
      const status =
        message.includes("no está configurada") ? 503 : 502;
      res.status(status).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*splat}", (_req, res) => {
      const indexHtml = path.join(distDir, "index.html");
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send("Build not found.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Futsal Motion Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
