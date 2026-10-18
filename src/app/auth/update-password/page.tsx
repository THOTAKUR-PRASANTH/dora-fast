"use client";

import {
  FormEvent,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";


const AUTH_CSS = `
.sw-grid {
  background-image:
    linear-gradient(to right, #161616 1px, transparent 1px),
    linear-gradient(to bottom, #161616 1px, transparent 1px);
  background-size: 3rem 3rem;
  -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 110%);
  mask-image: radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 110%);
}
.auth-card::before,
.auth-card::after {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(transparent, rgba(255, 255, 255, 0.7), transparent 15%);
  animation: rotate-border 8s linear infinite;
}
.auth-card::after { animation-delay: -4s; }
.pop-in { animation: pop-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
.fade-up { animation: fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
.shake { animation: shake 0.4s ease-in-out; }
.float { animation: float 5s ease-in-out infinite; }
.draw { stroke-dasharray: 100; stroke-dashoffset: 100; animation: draw 0.6s ease-out 0.25s forwards; }
.draw-circle { stroke-dasharray: 160; stroke-dashoffset: 160; animation: draw 0.7s ease-out forwards; }
@keyframes rotate-border { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pop-in {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@media (prefers-reduced-motion: reduce) {
  .auth-card::before, .auth-card::after, .pop-in, .fade-up, .shake, .float, .draw, .draw-circle { animation: none !important; }
  .draw, .draw-circle { stroke-dashoffset: 0; }
}
`;

/* Page shell: dark grid background + rotating-border card + big logo */
function AuthShell({
  children,
  title,
  subtitle,
  footer,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-[#0a0a0a] px-3 py-6 text-white sm:px-4">
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />
      <div aria-hidden="true" className="sw-grid pointer-events-none absolute inset-0 h-full" />

      <div className="pop-in relative z-10 flex w-full justify-center">
        <div className="auth-card relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black/80 p-[2px] shadow-2xl shadow-black/40 backdrop-blur-lg">
          <div className="relative z-10 w-full rounded-[14px] bg-black p-4 sm:p-6 md:p-12">
            <div className="flex w-full flex-col items-center gap-6 md:grid md:grid-cols-2 md:items-center md:gap-16">
              {/* Logo panel (scales with the viewport width AND height) */}
              <div className="flex flex-col items-center text-center">
                <div className="pop-in relative">
                  <div aria-hidden="true" className="absolute inset-0 scale-110 rounded-full bg-violet-500/25 blur-3xl" />
                  {/* Mobile size */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon.png"
                    alt="Dora-Fast logo"
                    className="float relative h-auto rounded-3xl object-contain ring-1 ring-white/10 md:hidden"
                    style={{ width: "min(clamp(6.5rem, 34vw, 9rem), 18dvh)" }}
                  />
                  {/* Desktop size */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon.png"
                    alt="Dora-Fast logo"
                    className="float relative hidden h-auto rounded-3xl object-contain ring-1 ring-white/10 md:block"
                    style={{ width: "min(clamp(13rem, 28vw, 21rem), 52dvh)" }}
                  />
                </div>

                <p className="fade-up mt-5 text-2xl font-extrabold leading-none tracking-tight md:text-3xl" style={{ animationDelay: "0.05s" }}>
                  Dora<span className="text-violet-300">-Fast</span>
                </p>
                <p className="fade-up mt-2.5 text-[10px] font-bold tracking-[0.25em] text-zinc-500" style={{ animationDelay: "0.1s" }}>
                  FAST · SIMPLE · SECURE
                </p>
              </div>

              {/* Form panel */}
              <div className="flex w-full flex-col items-center px-1 sm:px-4">
                <div className="w-full max-w-sm">
                  <h1 className="fade-up text-2xl font-semibold tracking-tight sm:text-3xl" style={{ animationDelay: "0.1s" }}>
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="fade-up mt-2 text-sm leading-6 text-zinc-400" style={{ animationDelay: "0.15s" }}>
                      {subtitle}
                    </p>
                  )}

                  <div className="fade-up mt-6" style={{ animationDelay: "0.2s" }}>
                    {children}
                  </div>

                  {footer && <div className="mt-6 text-center text-xs text-gray-400">{footer}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
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

function SubmitButton({
  children,
  isLoading = false,
  ...props
}: { children: ReactNode; isLoading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700 active:scale-[0.98] ${
        props.disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-purple-300 shadow-[0_0_8px_rgba(192,132,252,0.5)]" />
        </span>
      )}
      <span className={`flex items-center gap-3 transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"}`}>
        {children}
      </span>
    </button>
  );
}

function StatusBox({ type, children }: { type: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={type === "error" ? "alert" : "status"}
      className={`${type === "error" ? "shake" : "fade-up"} break-words rounded-lg border px-4 py-3 text-sm leading-6 ${
        type === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      {children}
    </p>
  );
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {off ? (
        <>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </>
      ) : (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function PasswordInput({
  id,
  label,
  ...props
}: { id: string; label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <Field id={id} label={label}>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} {...props} />
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-white"
        >
          <EyeIcon off={show} />
        </button>
      </div>
    </Field>
  );
}

function getStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = Math.min(score, 4);
  const labels = ["Too weak", "Weak", "Okay", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-red-500", "bg-amber-400", "bg-emerald-400", "bg-emerald-400"];
  return { level, label: pw ? labels[level] : "", color: colors[level] };
}

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Your reset session is missing or expired. Request a new password-reset email.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      setMessage("Your password has been updated successfully.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthShell title="Password updated!" subtitle={message}>
        <div className="space-y-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <svg viewBox="0 0 52 52" className="h-10 w-10" fill="none" stroke="#6ee7b7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="26" cy="26" r="23" className="draw-circle" pathLength="160" />
              <path d="M15 27l8 8 14-16" className="draw" pathLength="100" />
            </svg>
          </div>
          <Link
            href="/auth?mode=login"
            className="flex w-full items-center justify-center rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700 active:scale-[0.98]"
          >
            Go to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password for your account."
      footer={
        <>
          Link expired?{" "}
          <Link href="/auth/forgot-password" className="font-medium text-purple-300 transition hover:text-purple-200 hover:underline">
            Request a new one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <PasswordInput
            id="password"
            label="New password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />
          <div aria-hidden={!password} className={`transition-opacity duration-300 ${password ? "opacity-100" : "opacity-0"}`}>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    strength.level >= i ? strength.color : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">{strength.label || "\u00A0"}</p>
          </div>
        </div>

        <div className="space-y-1">
          <PasswordInput
            id="confirmPassword"
            label="Confirm new password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />
          {mismatch && <p className="text-xs text-red-300">Passwords don’t match yet.</p>}
        </div>

        {error && (
          <StatusBox type="error" key={error}>
            {error}
          </StatusBox>
        )}

        <SubmitButton type="submit" disabled={loading} isLoading={loading}>
          Update password
        </SubmitButton>
      </form>
    </AuthShell>
  );
}