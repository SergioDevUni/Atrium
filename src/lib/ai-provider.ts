export type AiProviderName = "google" | "openrouter" | "fallback";

export type ConfiguredAiProvider = {
  name: AiProviderName;
  model?: string;
  reason: string;
};

type AiJsonOptions = {
  prompt: string;
  temperature: number;
};

type AiJsonResponse = {
  provider: Exclude<AiProviderName, "fallback">;
  model: string;
  text: string;
};

type GoogleStudioResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: unknown;
      }>;
    };
  }>;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

export const GOOGLE_STUDIO_DEFAULT_MODEL = "gemini-3.1-flash-lite";
export const GOOGLE_STUDIO_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const OPENROUTER_DEFAULT_MODEL = "google/gemini-3.1-flash-lite";
export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export function getConfiguredAiProvider(): ConfiguredAiProvider {
  if (hasGoogleStudioApiKey()) {
    return {
      name: "google",
      model: getGoogleStudioModel(),
      reason: "GOOGLE_API_KEY or GEMINI_API_KEY is configured. Google Studio takes priority.",
    };
  }

  if (hasOpenRouterApiKey()) {
    return {
      name: "openrouter",
      model: getOpenRouterModel(),
      reason: "OPENROUTER_API_KEY is configured and no Google Studio key was found.",
    };
  }

  return {
    name: "fallback",
    reason: "No Google Studio or OpenRouter API key is configured.",
  };
}

export function logAiProviderSelection(scope: string) {
  const provider = getConfiguredAiProvider();
  console.info(
    `[ai-provider] ${scope}: provider=${provider.name}, model=${provider.model ?? "none"}, reason=${provider.reason}`,
  );
}

export function hasGoogleStudioApiKey() {
  return Boolean(getGoogleStudioApiKey());
}

export function getGoogleStudioApiKey() {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
}

export function getGoogleStudioModel() {
  return process.env.GOOGLE_GEMINI_MODEL ?? process.env.GEMINI_MODEL ?? GOOGLE_STUDIO_DEFAULT_MODEL;
}

export function hasOpenRouterApiKey() {
  return Boolean(getOpenRouterApiKey());
}

export function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY || "";
}

export function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL;
}

export function getOpenRouterBaseUrl() {
  return (process.env.OPENROUTER_BASE_URL ?? OPENROUTER_DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function getOpenRouterClientHeaders() {
  const headers: Record<string, string> = {};

  if (process.env.OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  }

  if (process.env.OPENROUTER_APP_NAME) {
    headers["X-Title"] = process.env.OPENROUTER_APP_NAME;
  }

  return headers;
}

export async function requestAiJson({
  prompt,
  temperature,
}: AiJsonOptions): Promise<AiJsonResponse | undefined> {
  const provider = getConfiguredAiProvider();

  if (provider.name === "google") {
    return requestGoogleStudioJson({ prompt, temperature });
  }

  if (provider.name === "openrouter") {
    return requestOpenRouterJson({ prompt, temperature });
  }

  return undefined;
}

async function requestGoogleStudioJson({
  prompt,
  temperature,
}: AiJsonOptions): Promise<AiJsonResponse | undefined> {
  const model = getGoogleStudioModel();
  const response = await fetch(`${GOOGLE_STUDIO_BASE_URL}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": getGoogleStudioApiKey(),
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature,
      },
    }),
  });

  if (!response.ok) {
    const body = await safeResponseText(response);
    console.warn(
      `[ai-provider] google request failed: status=${response.status}, model=${model}, body=${body.slice(0, 500)}`,
    );
    throw new Error(`Google Studio request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as GoogleStudioResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== "string") {
    console.warn(`[ai-provider] google response did not include text content for model=${model}.`);
    throw new Error("Google Studio response did not include text content.");
  }

  return { provider: "google", model, text: content };
}

async function requestOpenRouterJson({
  prompt,
  temperature,
}: AiJsonOptions): Promise<AiJsonResponse | undefined> {
  const model = getOpenRouterModel();
  const response = await fetch(`${getOpenRouterBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      ...getOpenRouterClientHeaders(),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature,
    }),
  });

  if (!response.ok) {
    const body = await safeResponseText(response);
    console.warn(
      `[ai-provider] openrouter request failed: status=${response.status}, model=${model}, body=${body.slice(0, 500)}`,
    );
    throw new Error(`OpenRouter request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    console.warn(`[ai-provider] openrouter response did not include text content for model=${model}.`);
    throw new Error("OpenRouter response did not include text content.");
  }

  return { provider: "openrouter", model, text: content };
}

async function safeResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
