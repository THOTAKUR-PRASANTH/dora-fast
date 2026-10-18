"use client";

import {
  FormEvent,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const RESEND_SECONDS = 30;


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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || cooldown > 0) return;

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm?next=/auth/update-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage(
        "If an account exists for that email, a password-reset email will be sent. Please check your inbox and spam folder."
      );
      setCooldown(RESEND_SECONDS);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="No worries! Enter the email associated with your account and we’ll send you a secure password-reset link."
      footer={
        <Link href="/auth?mode=login" className="font-medium text-purple-300 transition hover:text-purple-200 hover:underline">
          ← Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field id="email" label="Email address">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={loading || cooldown > 0}
          />
        </Field>

        {message && <StatusBox type="success">{message}</StatusBox>}
        {error && (
          <StatusBox type="error" key={error}>
            {error}
          </StatusBox>
        )}

        <SubmitButton type="submit" disabled={loading || cooldown > 0} isLoading={loading}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : message ? "Resend reset link" : "Send reset link →"}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}