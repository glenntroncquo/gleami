import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/** Public URL for a file in the `company` storage bucket (staff/client photos etc.), matching the pattern used across platform/client. */
export function getCompanyImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/company/${path}`;
}

/** Upload to a fresh URL so cached avatars cannot mask a replacement. */
export async function uploadStaffPhoto(companyId: string, staffId: string, base64: string): Promise<string> {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const extension = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'jpg'
    : bytes[0] === 0x89 && bytes[1] === 0x50 ? 'png'
    : binary.startsWith('RIFF') && binary.slice(8, 12) === 'WEBP' ? 'webp' : null;
  if (!extension) throw new Error('Unsupported photo format');
  const imagePath = `${companyId}/profile/${staffId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const { error } = await supabase.storage.from('company').upload(imagePath, bytes.buffer, {
    contentType: extension === 'jpg' ? 'image/jpeg' : `image/${extension}`,
    upsert: false,
  });
  if (error) throw error;
  return imagePath;
}

/** Best-effort cleanup, limited to this company's profile directory. */
export async function removeStaffPhoto(companyId: string, imagePath: string | null | undefined): Promise<void> {
  if (!imagePath?.startsWith(`${companyId}/profile/`)) return;
  await supabase.storage.from('company').remove([imagePath]);
}
