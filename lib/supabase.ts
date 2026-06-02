import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_REAL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);