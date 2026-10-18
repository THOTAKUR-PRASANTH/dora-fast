
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

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-200">
        {label}
      </label>
      {children}
    </div>
  );
}

function SaveButton({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
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
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-purple-300" />
        </span>
      )}
      <span className={loading ? "opacity-0" : "opacity-100"}>
        {children}
      </span>
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

export default function SettingsForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState<"profile" | "password" | null>(null);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileStatus(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setProfileStatus({
        type: "error",
        text: "Username cannot be empty.",
      });
      return;
    }

    if (trimmedName.length > 80) {
      setProfileStatus({
        type: "error",
        text: "Username must be 80 characters or fewer.",
      });
      return;
    }

    setBusy("profile");

    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: trimmedName },
      });

      if (error) {
        setProfileStatus({ type: "error", text: error.message });
      } else {
        setName(trimmedName);
        setProfileStatus({
          type: "success",
          text: "Username updated successfully.",
        });
        router.refresh();
      }
    } catch {
      setProfileStatus({
        type: "error",
        text: "Unable to update your username. Please try again.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordStatus(null);

    if (password.length < 8) {
      setPasswordStatus({
        type: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }

    if (password !== confirm) {
      setPasswordStatus({
        type: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    setBusy("password");

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setPasswordStatus({ type: "error", text: error.message });
      } else {
        setPasswordStatus({
          type: "success",
          text: "Password updated successfully.",
        });
        setPassword("");
        setConfirm("");
      }
    } catch {
      setPasswordStatus({
        type: "error",
        text: "Unable to update your password. Please try again.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Profile and username */}
      <div className="pop-in" style={{ animationDelay: "0.1s" }}>
        <div className="auth-card relative overflow-hidden rounded-2xl bg-black/80 p-[2px] shadow-2xl shadow-black/40 backdrop-blur-lg">
          <div className="relative z-10 rounded-[14px] bg-black p-5 sm:p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-indigo-500/30 text-xl font-semibold text-violet-100">
                {(name || initialEmail).charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Profile</h2>
                <p className="truncate text-sm text-zinc-400">
                  Manage your username
                </p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-5">
              <Field id="name" label="Username">
                <Input
                  id="name"
                  type="text"
                  autoComplete="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your username"
                  disabled={busy !== null}
                  maxLength={80}
                  required
                />
              </Field>

              <StatusMessage status={profileStatus} />

              <SaveButton loading={busy === "profile"}>
                Save username
              </SaveButton>
            </form>
          </div>
        </div>
      </div>

      {/* Read-only email */}
      <Section
        title="Email address"
        description="Your registered email address cannot be changed here."
        delay={0.2}
      >
        <Field id="email" label="Registered email">
          <Input
            id="email"
            type="email"
            value={initialEmail}
            disabled
            readOnly
            aria-describedby="email-help"
          />
        </Field>

        <p id="email-help" className="mt-3 text-xs text-zinc-500">
          This email is linked to your Dora-Fast account and is displayed for
          reference only.
        </p>
      </Section>

      {/* Change password */}
      <Section
        title="Change password"
        description="Choose a strong password with at least 8 characters."
        delay={0.3}
      >
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
                placeholder="Enter new password"
                disabled={busy !== null}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-4 flex items-center text-xs font-medium text-gray-400 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
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
              placeholder="Confirm new password"
              disabled={busy !== null}
              required
            />
          </Field>

          <StatusMessage status={passwordStatus} />

          <SaveButton loading={busy === "password"}>
            Update password
          </SaveButton>
        </form>
      </Section>
    </div>
  );
}
