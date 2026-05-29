import "server-only";

import pdf from "@cedrugs/pdf-parse";
import mammoth from "mammoth";

import { DOCUMENT_DOCX_MIME, DOCUMENT_PDF_MIME } from "@/server/documents/runtime";

export async function extractDocumentText(input: { buffer: Buffer; mimeType: string }) {
  let text = "";

  if (input.mimeType === DOCUMENT_PDF_MIME) {
    const result = await pdf(input.buffer);
    text = result.text;
  } else if (input.mimeType === DOCUMENT_DOCX_MIME) {
    const result = await mammoth.extractRawText({ buffer: input.buffer });
    text = result.value;
  } else {
    throw new Error("unsupported-mime-type");
  }

  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
