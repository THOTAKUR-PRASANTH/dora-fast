import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/dashboard/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/auth?mode=login");
  }

  const metaName = data.user.user_metadata?.name;
  const name = typeof metaName === "string" ? metaName : "";
  const email = data.user.email ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Account</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Your <span className="sw-gradient-text">settings.</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">Update your name, email and password.</p>
      </section>

      <SettingsForm initialName={name} initialEmail={email} />
    </div>
  );
}