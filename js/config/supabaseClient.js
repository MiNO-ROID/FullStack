//import supabse createClient function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase project credentials
const SUPABASE_URL = "https://ctfmdagftjbjmrxcvifw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vlMtSjFVVXrntElJYlrUzA_wPpJ1_TO";

//initailized supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export default supabase;