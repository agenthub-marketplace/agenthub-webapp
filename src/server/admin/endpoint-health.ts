import "server-only";

import { createHmac } from "node:crypto";
import { request as httpsRequest } from "node:https";

import { serverEnv } from "@/lib/env.server";
import { resolveSafeWorkflowEndpointUrl } from "@/server/workflows/runtime";

export type EndpointHealthFamily = "creator_api" | "workflow_webhook";

export type EndpointHealthResult = {
  code: string;
  detail: string;
  ok: boolean;
  responseChars?: number;
};

function signPayload(body: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

  return {
    signature,
    timestamp,
  };
}

async function postHealthPayload(input: {
  body: string;
  endpointUrl: string;
  headers: Record<string, string>;
  maxResponseChars: number;
  timeoutMs: number;
}) {
  const resolved = await resolveSafeWorkflowEndpointUrl(input.endpointUrl);

  if (!resolved) {
    return { code: "url_not_safe", text: null };
  }

  const bodyBuffer = Buffer.from(input.body);
  let lastCode = "timeout_or_network";

  for (const resolvedAddress of resolved.addresses) {
    try {
      const responseText = await new Promise<string>((resolve, reject) => {
        const request = httpsRequest(
          {
            family: resolvedAddress.family,
            headers: {
              ...input.headers,
              "Accept-Encoding": "identity",
              "Content-Length": bodyBuffer.byteLength.toString(),
              Host: resolved.url.host,
            },
            hostname: resolved.hostname,
            lookup: (_hostname, _options, callback) => callback(null, resolvedAddress.address, resolvedAddress.family),
            method: "POST",
            path: `${resolved.url.pathname}${resolved.url.search}`,
            port: resolved.port,
            servername: resolved.hostname,
            timeout: input.timeoutMs,
          },
          (response) => {
            const statusCode = response.statusCode ?? 0;

            if (statusCode >= 300 && statusCode < 400) {
              response.resume();
              reject(new Error("redirect_blocked"));
              return;
            }

            if (statusCode < 200 || statusCode >= 300) {
              response.resume();
              reject(new Error(`http_${statusCode}`));
              return;
            }

            const contentLength = Number(response.headers["content-length"]);

            if (Number.isFinite(contentLength) && contentLength > input.maxResponseChars) {
              response.destroy(new Error("response_too_large"));
              return;
            }

            const chunks: Buffer[] = [];
            let totalBytes = 0;

            response.on("data", (chunk: Buffer) => {
              totalBytes += chunk.byteLength;

              if (totalBytes > input.maxResponseChars) {
                response.destroy(new Error("response_too_large"));
                return;
              }

              chunks.push(chunk);
            });
            response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            response.on("error", reject);
          },
        );

        request.on("timeout", () => request.destroy(new Error("timeout_or_network")));
        request.on("error", reject);
        request.end(bodyBuffer);
      });

      return { code: null, text: responseText };
    } catch (error) {
      lastCode = error instanceof Error ? error.message : "timeout_or_network";
    }
  }

  return { code: lastCode, text: null };
}

function parseJsonResponse(text: string | null) {
  if (!text) {
    return { code: "empty_response", parsed: null as unknown };
  }

  try {
    return { code: null, parsed: JSON.parse(text) as unknown };
  } catch {
    return { code: "invalid_json", parsed: null as unknown };
  }
}

export async function testCreatorEndpointHealth(input: {
  endpointUrl: string;
  family: EndpointHealthFamily;
}): Promise<EndpointHealthResult> {
  const secret =
    input.family === "creator_api" ? serverEnv.creatorEndpointSigningSecret : serverEnv.workflowWebhookSigningSecret;

  if (!secret) {
    return {
      code: "signing_secret_missing",
      detail: "Le secret de signature serveur n'est pas configuré pour cette famille d'endpoint.",
      ok: false,
    };
  }

  const body = JSON.stringify({
    agenthub_health_check: true,
    input_text: "AgentHub endpoint health check. Return JSON only.",
    run_id: "health_check",
    step: {
      key: "health_check",
      label: "AgentHub health check",
      type: input.family === "creator_api" ? "creator_endpoint" : "webhook_step",
    },
  });
  const signed = signPayload(body, secret);
  const response = await postHealthPayload({
    body,
    endpointUrl: input.endpointUrl,
    headers: {
      "Content-Type": "application/json",
      "x-agenthub-signature": signed.signature,
      "x-agenthub-timestamp": signed.timestamp,
    },
    maxResponseChars: serverEnv.creatorEndpointMaxResponseChars,
    timeoutMs:
      input.family === "creator_api" ? serverEnv.creatorEndpointTimeoutMs : serverEnv.workflowStepTimeoutMs,
  });

  if (response.code || response.text === null) {
    return {
      code: response.code ?? "request_failed",
      detail: "L'endpoint n'a pas répondu correctement au POST de test AgentHub.",
      ok: false,
    };
  }

  const parsed = parseJsonResponse(response.text);

  if (parsed.code) {
    return {
      code: parsed.code,
      detail: "L'endpoint doit répondre avec un JSON valide.",
      ok: false,
      responseChars: response.text.length,
    };
  }

  if (input.family === "creator_api") {
    const outputText =
      parsed.parsed &&
      typeof parsed.parsed === "object" &&
      !Array.isArray(parsed.parsed) &&
      typeof (parsed.parsed as { output_text?: unknown }).output_text === "string"
        ? (parsed.parsed as { output_text: string }).output_text.trim()
        : "";

    if (!outputText) {
      return {
        code: "missing_output_text",
        detail: 'L’agent API creator doit répondre avec un champ JSON "output_text".',
        ok: false,
        responseChars: response.text.length,
      };
    }
  }

  return {
    code: "ok",
    detail:
      input.family === "creator_api"
        ? 'Endpoint joignable, JSON valide, champ "output_text" présent.'
        : "Endpoint joignable et réponse JSON valide.",
    ok: true,
    responseChars: response.text.length,
  };
}
