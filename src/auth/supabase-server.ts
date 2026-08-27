// Glass — cliente Supabase para el servidor (Server Components, Route Handlers, Actions).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`glass/auth: falta la variable ${name}`);
  return value;
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Invocado desde un Server Component: lo refresca el middleware.
          }
        },
      },
    },
  );
}
