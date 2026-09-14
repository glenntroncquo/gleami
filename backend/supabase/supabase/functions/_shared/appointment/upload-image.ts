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

/** Expects a data URL (`data:image/png;base64,...`); returns the storage path on success. */
export async function uploadAppointmentImage(
  companyId: string,
  imageData: string,
): Promise<UploadAppointmentImageResult> {
  const matches = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) {
    return "invalid_format";
  }

  const mimeType = matches[1];
  const base64String = matches[2];
  const ext = mimeType.split("/")[1];
  const fileName = `${companyId}/appointments/${crypto.randomUUID()}.${ext}`;
  const fileBytes = base64ToUint8Array(base64String);

  const { error } = await supabaseAdmin.storage.from("company").upload(fileName, fileBytes, {
    contentType: mimeType,
  });

  if (error) {
    return "upload_failed";
  }

  return fileName;
}
