import test from "node:test";
import assert from "node:assert/strict";
import { parseTtsApiResponse } from "./ttsResponse";

test("parseTtsApiResponse handles HTML <!doctype response gracefully without SyntaxError", () => {
  const res = parseTtsApiResponse(
    200,
    "text/html; charset=utf-8",
    "<!doctype html><html><body>SPA fallback</body></html>"
  );
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.match(res.error, /HTML en lugar de JSON/);
    assert.doesNotMatch(res.error, /Unexpected token/);
  }
});

test("parseTtsApiResponse handles 502 HTML gateway errors as retryable", () => {
  const res = parseTtsApiResponse(
    502,
    "text/html",
    "<html><title>502 Bad Gateway</title></html>"
  );
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.retryable, true);
  }
});

test("parseTtsApiResponse parses valid JSON audio payload", () => {
  const res = parseTtsApiResponse(
    200,
    "application/json",
    JSON.stringify({ audioBase64: "UklGRg==", mimeType: "audio/wav" })
  );
  assert.deepEqual(res, {
    ok: true,
    audioBase64: "UklGRg==",
    mimeType: "audio/wav",
  });
});

test("parseTtsApiResponse surfaces backend JSON error message", () => {
  const res = parseTtsApiResponse(
    503,
    "application/json",
    JSON.stringify({ error: "GEMINI_API_KEY no está configurada en el servidor." })
  );
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error, "GEMINI_API_KEY no está configurada en el servidor.");
  }
});
