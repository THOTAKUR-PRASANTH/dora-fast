
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function authenticateApiRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  if (authorization && !match) {
    return {
      supabase: null,
      user: null,
      error: "Invalid Authorization header.",
      status: 401,
    };
  }

  if (match) {
    const token = match[1];

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !publishableKey) {
      console.error("Supabase environment configuration is missing.");

      return {
        supabase: null,
        user: null,
        error: "Authentication is not configured.",
        status: 500,
      };
    }

    const supabase = createSupabaseJsClient(url, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        supabase: null,
        user: null,
        error: "Your session is invalid or expired. Please log in again.",
        status: 401,
      };
    }

    return {
      supabase,
      user,
      error: null,
      status: 200,
    };
  }

  // Preserve the existing website's cookie-based login.
  const supabase = await createServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase: null,
      user: null,
      error: "Please log in first.",
      status: 401,
    };
  }

  return {
    supabase,
    user,
    error: null,
    status: 200,
  };
}
