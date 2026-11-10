import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function createServerSupabaseClient({
  allowCookieWrites = true,
}: { allowCookieWrites?: boolean } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        if (!allowCookieWrites) {
          return;
        }

        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
