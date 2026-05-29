import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env.server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { extractDocumentText } from "@/server/documents/extract";
import {
  DOCUMENT_STORAGE_BUCKET,
  buildDocumentStoragePath,
  documentExpiresAt,
  loadDocumentRuntimeContext,
  sanitizeFilename,
  validateDocumentFile,
} from "@/server/documents/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(statusCode: number, status: string, error: string) {
  return NextResponse.json({ error, status }, { status: statusCode });
}

function preview(text: string) {
  return text.length > 700 ? `${text.slice(0, 700)}...` : text;
}

function readSingleFile(formData: FormData) {
  const files = formData.getAll("file").filter((value): value is File => value instanceof File && value.size > 0);
  return files.length === 1 ? files[0] : null;
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return jsonError(401, "unauthorized", "auth-required");
  }

  if (!serverEnv.documentRunsEnabled) {
    return jsonError(403, "disabled", "document-runs-disabled");
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);

  if (Number.isFinite(contentLength) && contentLength > serverEnv.documentMaxFileBytes + 100_000) {
    return jsonError(413, "failed", "file-too-large");
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, "failed", "invalid-multipart");
  }

  const rentalId = formData.get("rentalId");
  const file = readSingleFile(formData);

  if (typeof rentalId !== "string" || !rentalId || !file) {
    return jsonError(400, "failed", "invalid-request");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return jsonError(500, "failed", "missing-service-client");
  }

  const { context, error } = await loadDocumentRuntimeContext({
    profileId: profile.id,
    rentalId,
    supabase,
  });

  if (error || !context) {
    return jsonError(error?.statusCode ?? 500, "not_eligible", error?.error ?? "document-runtime-unavailable");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const originalFilename = sanitizeFilename(file.name || "document");
  const mimeType = file.type;
  const validationError = validateDocumentFile({
    buffer,
    filename: originalFilename,
    mimeType,
    size: file.size,
  });

  if (validationError) {
    return jsonError(validationError.statusCode, "failed", validationError.error);
  }

  const storagePath = buildDocumentStoragePath({
    filename: originalFilename,
    rentalId: context.rental.id,
    userId: profile.id,
  });

  const { error: uploadError } = await supabase.storage.from(DOCUMENT_STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (uploadError) {
    return jsonError(500, "failed", "document-upload-failed");
  }

  const { data: fileRow, error: insertError } = await supabase
    .from("agent_run_files")
    .insert({
      agent_id: context.rental.agent_id,
      agent_version_id: context.rental.agent_version_id,
      expires_at: documentExpiresAt(),
      mime_type: mimeType,
      original_filename: originalFilename,
      rental_request_id: context.rental.id,
      size_bytes: file.size,
      status: "uploaded",
      storage_bucket: DOCUMENT_STORAGE_BUCKET,
      storage_path: storagePath,
      user_id: profile.id,
    })
    .select("id,created_at")
    .maybeSingle<{ created_at: string; id: string }>();

  if (insertError || !fileRow) {
    await supabase.storage.from(DOCUMENT_STORAGE_BUCKET).remove([storagePath]);
    return jsonError(500, "failed", "document-file-create-failed");
  }

  await supabase.from("agent_run_files").update({ status: "extracting" }).eq("id", fileRow.id);

  try {
    const extractedText = (await extractDocumentText({ buffer, mimeType })).slice(0, serverEnv.documentMaxExtractedChars);

    if (!extractedText.trim()) {
      await supabase
        .from("agent_run_files")
        .update({
          extraction_error: "no_extractable_text",
          status: "failed",
        })
        .eq("id", fileRow.id);

      return NextResponse.json(
        {
          error: "no_extractable_text",
          file: {
            createdAt: fileRow.created_at,
            id: fileRow.id,
            mimeType,
            originalFilename,
            sizeBytes: file.size,
            status: "failed",
          },
          status: "failed",
        },
        { status: 422 },
      );
    }

    const { error: extractedUpdateError } = await supabase
      .from("agent_run_files")
      .update({
        extracted_text: extractedText,
        extraction_error: null,
        status: "extracted",
      })
      .eq("id", fileRow.id);

    if (extractedUpdateError) {
      return jsonError(500, "failed", "document-extraction-save-failed");
    }

    return NextResponse.json({
      file: {
        createdAt: fileRow.created_at,
        extractedTextPreview: preview(extractedText),
        id: fileRow.id,
        mimeType,
        originalFilename,
        sizeBytes: file.size,
        status: "extracted",
      },
      status: "extracted",
    });
  } catch {
    await supabase
      .from("agent_run_files")
      .update({
        extraction_error: "document-extraction-failed",
        status: "failed",
      })
      .eq("id", fileRow.id);

    return jsonError(422, "failed", "document-extraction-failed");
  }
}
