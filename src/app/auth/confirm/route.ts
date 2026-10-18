
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");

  // Allow only a local path to prevent open redirects.
  const destination =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/auth/update-password";

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(
      new URL("/auth/forgot-password?error=invalid-link", url.origin)
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/auth/forgot-password?error=expired-link", url.origin)
    );
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
