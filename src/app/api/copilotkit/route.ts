import {
  CopilotRuntime,
  EmptyAdapter,
  GoogleGenerativeAIAdapter,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import {
  getConfiguredAiProvider,
  getGoogleStudioApiKey,
  getGoogleStudioModel,
  getOpenRouterBaseUrl,
  getOpenRouterApiKey,
  getOpenRouterClientHeaders,
  getOpenRouterModel,
  logAiProviderSelection,
} from "@/lib/ai-provider";

const runtime = new CopilotRuntime({
  a2ui: {
    injectA2UITool: true,
  },
});

const provider = getConfiguredAiProvider();
logAiProviderSelection("copilotkit");

const serviceAdapter =
  provider.name === "google"
    ? new GoogleGenerativeAIAdapter({
        apiKey: getGoogleStudioApiKey() || "missing-google-studio-api-key",
        model: getGoogleStudioModel(),
        apiVersion: "v1beta",
      })
    : provider.name === "openrouter"
      ? new OpenAIAdapter({
          model: getOpenRouterModel(),
          openai: new OpenAI({
            apiKey: getOpenRouterApiKey() || "missing-openrouter-api-key",
            baseURL: getOpenRouterBaseUrl(),
            defaultHeaders: getOpenRouterClientHeaders(),
          }),
        })
      : new EmptyAdapter();

const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime,
  serviceAdapter,
  endpoint: "/api/copilotkit",
});

export const POST = handleRequest;

