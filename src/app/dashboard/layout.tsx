import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/header";
import ThemeStyles from "@/components/dashboard/theme-styles";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/auth?mode=login");
  }

  const email = data.user.email ?? "Signed-in user";
  const metaName = data.user.user_metadata?.name;
  const name = typeof metaName === "string" && metaName.trim() ? metaName.trim() : undefined;

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-[#0a0a0a] text-white">
      <ThemeStyles />
      <div aria-hidden="true" className="sw-grid pointer-events-none absolute inset-0 h-full" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <DashboardHeader email={email} name={name} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">{children}</main>

        <footer className="mx-auto flex w-full max-w-6xl flex-col gap-2 border-t border-white/10 px-4 py-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Dora-Fast</span>
          <span>Private storage · Multipart uploads · Supabase authentication</span>
        </footer>
      </div>
    </div>
  );
}