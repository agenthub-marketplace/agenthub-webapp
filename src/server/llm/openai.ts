import "server-only";

import { serverEnv } from "@/lib/env.server";

type RunOpenAITextInput = {
  developerMessage: string;
  maxOutputTokens: number;
  model: string;
  userMessage: string;
};

export type OpenAITextResult = {
  inputTokens: number | null;
  outputText: string;
  outputTokens: number | null;
  totalTokens: number | null;
};

type ResponsesApiOutputContent = {
  text?: string;
  type?: string;
};

type ResponsesApiOutput = {
  content?: ResponsesApiOutputContent[];
  type?: string;
};

type ResponsesApiResponse = {
  error?: {
    message?: string;
    type?: string;
  };
  output?: ResponsesApiOutput[];
  output_text?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

function extractOutputText(data: ResponsesApiResponse) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks =
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => typeof text === "string" && text.trim().length > 0) ?? [];

  return chunks.join("\n\n").trim();
}

export async function runOpenAIText(input: RunOpenAITextInput): Promise<OpenAITextResult> {
  if (!serverEnv.openaiApiKey) {
    throw new Error("openai-api-key-missing");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: [
          {
            content: [{ text: input.developerMessage, type: "input_text" }],
            role: "developer",
          },
          {
            content: [{ text: input.userMessage, type: "input_text" }],
            role: "user",
          },
        ],
        max_output_tokens: input.maxOutputTokens,
        model: input.model,
        stream: false,
        tools: [],
      }),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${serverEnv.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    const data = (await response.json()) as ResponsesApiResponse;

    if (!response.ok) {
      throw new Error(data.error?.type || data.error?.message || "openai-request-failed");
    }

    const outputText = extractOutputText(data);

    if (!outputText) {
      throw new Error("openai-empty-output");
    }

    return {
      inputTokens: data.usage?.input_tokens ?? null,
      outputText,
      outputTokens: data.usage?.output_tokens ?? null,
      totalTokens: data.usage?.total_tokens ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("openai-timeout");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
