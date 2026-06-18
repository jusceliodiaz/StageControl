import { supabase } from "@/integrations/supabase/client";

const BUCKET = "presentations";

/**
 * Upload a file and return a long-lived signed URL.
 * Bucket is private (workspace blocks public buckets) so we generate
 * a 10-year signed URL for kiosk display use.
 */
export async function uploadPresentationFile(file: File, prefix = "") {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${prefix ? prefix + "/" : ""}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
  if (error) throw error;

  const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signError) throw signError;
  return { path, url: data.signedUrl };
}
