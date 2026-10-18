"use client";

import { FormEvent, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = { type: "error" | "success"; text: string } | null;

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${
        props.disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    />
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-200">
        {label}
      </label>
      {children}
    </div>
  );
}

function SaveButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700 active:scale-[0.98] sm:w-auto ${
        loading ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-purple-300 shadow-[0_0_8px_rgba(192,132,252,0.5)]" />
        </span>
      )}
      <span className={`transition-opacity duration-200 ${loading ? "opacity-0" : "opacity-100"}`}>{children}</span>
    </button>
  );
}

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      role="status"
      className={`break-words rounded-lg border px-4 py-3 text-sm ${
        status.type === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      {status.text}
    </p>
  );
}

function Section({
  title,
  description,
  delay,
  children,
}: {
  title: string;
  description: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <section
      className="fade-up rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6"
      style={{ animationDelay: `${delay}s` }}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function SettingsForm({ initialName, initialEmail }: { initialName: string; initialEmail: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [currentEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState<"profile" | "email" | "password" | null>(null);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [emailStatus, setEmailStatus] = useState<Status>(null);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("profile");
    setProfileStatus(null);
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
    if (error) {
      setProfileStatus({ type: "error", text: error.message });
    } else {
      setProfileStatus({ type: "success", text: "Profile updated." });
      router.refresh();
    }
    setBusy(null);
  }

  async function saveEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailStatus(null);
    const next = email.trim();
    if (next.toLowerCase() === currentEmail.toLowerCase()) {
      setEmailStatus({ type: "error", text: "That’s already your email address." });
      return;
    }
    setBusy("email");
    const { error } = await supabase.auth.updateUser(
      { email: next },
      { emailRedirectTo: `${window.location.origin}/auth/callback` }
    );
    if (error) {
      setEmailStatus({ type: "error", text: error.message });
    } else {
      setEmailStatus({
        type: "success",
        text: "Confirmation sent. Open the link in your inbox to finish changing your email (you may need to confirm from your old address too).",
      });
    }
    setBusy(null);
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordStatus(null);
    if (password.length < 8) {
      setPasswordStatus({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setPasswordStatus({ type: "error", text: "Passwords don’t match." });
      return;
    }
    setBusy("password");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPasswordStatus({ type: "error", text: error.message });
    } else {
      setPasswordStatus({ type: "success", text: "Password updated." });
      setPassword("");
      setConfirm("");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-5">
      {/* Profile card with the rotating border */}
      <div className="pop-in" style={{ animationDelay: "0.1s" }}>
        <div className="auth-card relative overflow-hidden rounded-2xl bg-black/80 p-[2px] shadow-2xl shadow-black/40 backdrop-blur-lg">
          <div className="relative z-10 rounded-[14px] bg-black p-5 sm:p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-indigo-500/30 text-xl font-semibold text-violet-100">
                {(name || currentEmail).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Profile</h2>
                <p className="truncate text-sm text-zinc-400">{currentEmail}</p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-5">
              <Field id="name" label="Name">
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  disabled={busy !== null}
                  maxLength={80}
                />
              </Field>
              <StatusMessage status={profileStatus} />
              <SaveButton loading={busy === "profile"}>Save changes</SaveButton>
            </form>
          </div>
        </div>
      </div>

      <Section title="Email address" description="We’ll email a confirmation link before the change applies." delay={0.2}>
        <form onSubmit={saveEmail} className="space-y-5">
          <Field id="email" label="Email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={busy !== null}
              required
            />
          </Field>
          <StatusMessage status={emailStatus} />
          <SaveButton loading={busy === "email"}>Update email</SaveButton>
        </form>
      </Section>

      <Section title="Password" description="Use at least 8 characters." delay={0.3}>
        <form onSubmit={savePassword} className="space-y-5">
          <Field id="new-password" label="New password">
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={busy !== null}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-4 flex items-center text-xs font-medium text-gray-400 hover:text-white"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          <Field id="confirm-password" label="Confirm new password">
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              disabled={busy !== null}
              required
            />
          </Field>
          <StatusMessage status={passwordStatus} />
          <SaveButton loading={busy === "password"}>Update password</SaveButton>
        </form>
      </Section>
    </div>
  );
}