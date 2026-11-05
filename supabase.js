import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

export const SUPABASE_URL = "https://ctfmdagftjbjmrxcvifw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0Zm1kYWdmdGpiam1yeGN2aWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NTE5OTQsImV4cCI6MjEwODAyNzk5NH0.s-MtggzNOyDKmoG4yzZiJ-pSMB41fG-5_HA_tbHaATU";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const PHOTO_BUCKET = "product-photos";
export const photoUrl = (path) => (path ? sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl : "");
