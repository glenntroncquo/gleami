import { supabaseAdmin } from "../infrastructure/supabase/client.ts";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export type UploadAppointmentImageResult = string | "invalid_format" | "upload_failed";

/**
 * Hard cap on decoded image bytes. The company bucket enforces its own 10 MiB
 * limit at the storage layer, but the base64 payload is decoded in the edge
 * function first — an uncapped data URL is a memory-exhaustion vector, so it
 * is rejected here before decoding.
 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 8;

/** Mirrors the company bucket's allowed_mime_types (H1 storage lockdown). */
const ALLOWED_IMAGE_MIME = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

/** Expects a data URL (`data:image/png;base64,...`); returns the storage path on success. */
export async function uploadAppointmentImage(
  companyId: string,
  imageData: string,
): Promise<UploadAppointmentImageResult> {
  const matches = imageData.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!matches) {
    return "invalid_format";
  }

  const mimeType = matches[1];
  const base64String = matches[2];
  const ext = ALLOWED_IMAGE_MIME.get(mimeType);
  if (!ext) {
    return "invalid_format";
  }
  if (base64String.length > MAX_BASE64_LENGTH) {
    return "invalid_format";
  }

  const fileName = `${companyId}/appointments/${crypto.randomUUID()}.${ext}`;
  const fileBytes = base64ToUint8Array(base64String);
  if (fileBytes.length > MAX_IMAGE_BYTES) {
    return "invalid_format";
  }

  const { error } = await supabaseAdmin.storage.from("company").upload(fileName, fileBytes, {
    contentType: mimeType,
  });

  if (error) {
    return "upload_failed";
  }

  return fileName;
}
