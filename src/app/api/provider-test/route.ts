import { NextResponse } from "next/server";
import { getConfiguredAiProvider, logAiProviderSelection, requestAiJson } from "@/lib/ai-provider";

export async function GET() {
  const provider = getConfiguredAiProvider();
  logAiProviderSelection("provider-test");

  if (provider.name === "fallback") {
    return NextResponse.json({
      ok: false,
      provider,
      message: "No provider key configured. Add GOOGLE_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.",
    });
  }

  try {
    const response = await requestAiJson({
      prompt: 'Return strict JSON only: {"ok": true, "message": "provider test passed"}',
      temperature: 0,
    });
    const parsed = parseJson(response?.text);

    return NextResponse.json({
      ok: parsed?.ok === true,
      provider: {
        name: response?.provider ?? provider.name,
        model: response?.model ?? provider.model,
      },
      response: parsed ?? response?.text ?? null,
      message: parsed?.ok === true ? "Provider test passed." : "Provider returned a response, but it was not the expected JSON.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider,
        message: error instanceof Error ? error.message : "Provider test failed.",
      },
      { status: 502 },
    );
  }
}

function parseJson(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value) as { ok?: unknown; message?: unknown };
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    try {
      return JSON.parse(match[0]) as { ok?: unknown; message?: unknown };
    } catch {
      return undefined;
    }
  }
}
