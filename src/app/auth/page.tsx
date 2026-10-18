"use client";

import {
  FormEvent,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Loaded once at module level (client only) so the animation never remounts on re-render.
const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

const AUTH_CARD_CSS = `
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
@keyframes rotate-border {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.pop-in { animation: pop-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes pop-in {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;

type Mode = "signup" | "login";

/* ------------------------------------------------------------------ */
/* UI pieces (same look as skill-swap)                                 */
/* ------------------------------------------------------------------ */

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="auth-card relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black/80 p-[2px] shadow-2xl shadow-black/40 backdrop-blur-lg">
      <div className="relative z-10 w-full rounded-[14px] bg-black p-4 sm:p-6 md:p-12">{children}</div>
    </div>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-gray-200">
      {children}
    </label>
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

/* Lottie wrapper that scales with the viewport (width AND height aware) */
function Lottie({
  src,
  ratio,
  width,
  delay = 0,
  className = "",
}: {
  src: string;
  ratio: number; // width / height of the animation
  width: string; // any CSS width, e.g. clamp(...)
  delay?: number;
  className?: string;
}) {
  return (
    <div className={`pop-in ${className}`} style={{ animationDelay: `${delay}s` }}>
      <div style={{ width, aspectRatio: String(ratio), maxWidth: "100%" }}>
        <Player autoplay loop src={src} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AuthPage() {
  const [supabase] = useState(() => createClient());

  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "signup";

    const m = new URLSearchParams(window.location.search).get("mode");
    return m === "login" || m === "signup" ? m : "signup";
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setMessage("");
    setShowPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        setMessageType("success");
        setMessage(
          data.session
            ? "Account created successfully!"
            : "Check your email to confirm your account."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        window.location.href = "/dashboard";
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-[#0a0a0a] px-3 py-6 sm:px-4">
      <style dangerouslySetInnerHTML={{ __html: AUTH_CARD_CSS }} />
      <div aria-hidden="true" className="sw-grid pointer-events-none absolute inset-0 h-full" />

      <div className="pop-in relative z-10 flex w-full justify-center">
        <Card>
          <div className="flex w-full flex-col items-center justify-center gap-6 md:grid md:grid-cols-2 md:gap-16">
            {/* ---------- Left: Lottie (desktop) ---------- */}
            <div className="hidden flex-col items-center justify-center text-center md:flex">
              {isSignup ? (
                <Lottie
                  key="signup-desktop"
                  src="/animations/LoginLeady.json"
                  ratio={429 / 444}
                  width="min(clamp(16rem, 36vw, 28rem), 62dvh)"
                />
              ) : (
                <div key="login-desktop" className="flex flex-col items-center">
                  <Lottie
                    src="/animations/greeatings.json"
                    ratio={428 / 123}
                    width="min(clamp(14rem, 26vw, 19rem), 55dvh)"
                    className="mb-4"
                  />
                  <Lottie
                    src="/animations/register.json"
                    ratio={1}
                    width="min(clamp(15rem, 32vw, 28rem), 48dvh)"
                    delay={0.15}
                  />
                </div>
              )}
            </div>

            {/* ---------- Right: form ---------- */}
            <div className="flex w-full flex-col items-center justify-center px-1 sm:px-4">
              {/* Mobile-only animations */}
              <div className="mb-2 flex w-full flex-col items-center md:hidden">
                {isSignup ? (
                  <>
                    <h2 className="mb-2 text-center text-3xl font-bold text-white">Create Account</h2>
                    <Lottie
                      key="signup-mobile"
                      src="/animations/LoginLeady.json"
                      ratio={429 / 444}
                      width="min(clamp(10rem, 62vw, 18rem), 30dvh)"
                    />
                  </>
                ) : (
                  <div key="login-mobile" className="flex w-full flex-col items-center">
                    <Lottie
                      src="/animations/greeatings.json"
                      ratio={428 / 123}
                      width="min(clamp(11rem, 70vw, 18rem), 48dvh)"
                      className="mb-2"
                    />
                    <Lottie
                      src="/animations/register.json"
                      ratio={1}
                      width="min(clamp(9rem, 55vw, 16rem), 26dvh)"
                      delay={0.15}
                    />
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
                {isSignup && (
                  <div className="space-y-1">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      disabled={loading}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-white"
                    >
                      <EyeIcon off={showPassword} />
                    </button>
                  </div>
                </div>
                {!isSignup && (
                  <div className="-mt-2 flex justify-end">
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-purple-300 transition hover:text-purple-200 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                <SubmitButton type="submit" disabled={loading} isLoading={loading}>
                  {isSignup ? "Continue" : "Sign In"}
                </SubmitButton>

                {message && (
                  <p
                    role="status"
                    className={`break-words rounded-lg border px-4 py-3 text-sm ${
                      messageType === "success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/30 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {message}
                  </p>
                )}
              </form>

              <p className="mt-6 text-center text-xs text-gray-400">
                {isSignup ? "Already have an account? " : "Don’t have an account? "}
                <button type="button" onClick={switchMode} className="underline hover:text-white">
                  {isSignup ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}