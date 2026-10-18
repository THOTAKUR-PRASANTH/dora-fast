"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";

const rotatingLines = [
  "A little space to think bigger.",
  "Ideas deserve room to grow.",
  "Make something extraordinary.",
];

/* Purple + pink first, blue only at the very end */
const buttonGradient =
  "bg-gradient-to-r from-violet-600 via-fuchsia-500 via-75% to-sky-500";
const buttonGradientHover =
  "hover:from-violet-500 hover:via-fuchsia-400 hover:via-75% hover:to-sky-400";

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function Zap({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  );
}

function Reveal({
  children,
  delay = 0,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={`${reverse ? "fade-down" : "fade-up"} ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

function BorderBeam({
  duration = 7,
  borderWidth = 2,
  colorFrom = "#ec4899",
  colorTo = "#8b5cf6",
  delay = 0,
}: {
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}) {
  return (
    <div
      className="border-beam"
      style={
        {
          "--duration": duration,
          "--border-width": borderWidth,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
        } as CSSProperties
      }
    />
  );
}

/* Big outlined brand text in the footer that lights up under the cursor */
function TextHoverEffect({ text }: { text: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState(false);
  const [mask, setMask] = useState({ cx: "50%", cy: "50%" });

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMask({
      cx: `${((e.clientX - rect.left) / rect.width) * 100}%`,
      cy: `${((e.clientY - rect.top) / rect.height) * 100}%`,
    });
  };

  const textStyle: CSSProperties = { fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 58 };

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={onMove}
      className="select-none"
    >
      <defs>
        <linearGradient id="dfTextGradient" gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="25%">
          {hovered && (
            <>
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="25%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="75%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#f43f5e" />
            </>
          )}
        </linearGradient>
        <radialGradient id="dfRevealMask" gradientUnits="userSpaceOnUse" r="20%" cx={mask.cx} cy={mask.cy}>
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
        <mask id="dfTextMask">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#dfRevealMask)" />
        </mask>
      </defs>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" strokeWidth="0.3" stroke="#262626" fill="transparent" style={{ ...textStyle, opacity: hovered ? 0.7 : 0 }}>
        {text}
      </text>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" strokeWidth="0.3" stroke="#262626" fill="transparent" className="stroke-draw" style={textStyle}>
        {text}
      </text>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" stroke="url(#dfTextGradient)" strokeWidth="0.3" mask="url(#dfTextMask)" fill="transparent" style={textStyle}>
        {text}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky inset-x-0 top-0 z-[99999] h-14 w-full select-none border-b transition-colors ${
        scrolled ? "border-white/10 bg-background/40 backdrop-blur-md" : "border-transparent"
      }`}
    >
      <Reveal reverse delay={0.1} className="size-full">
        <div className="mx-auto flex h-full w-full max-w-full items-center justify-between px-3 sm:px-4 md:max-w-screen-xl md:px-12 lg:px-20">
          <Link href="/" aria-label="Dora-Fast home" className="flex min-w-0 items-center gap-2">
            <Image src="/logo.png" alt="" width={50} height={50} className="h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12 md:h-14 md:w-14" />
            <span className="truncate text-base font-bold !leading-none sm:text-lg">
              Dora<span className="text-violet-300">-Fast</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-x-2 sm:gap-x-4">
            <Link
              href="/auth?mode=login"
              className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-white transition-all duration-300 hover:border-violet-300/40 hover:bg-gradient-to-r hover:from-violet-500/20 hover:via-fuchsia-500/15 hover:via-75% hover:to-sky-500/15 hover:shadow-[0_0_24px_rgba(168,85,247,0.16)] active:scale-[0.98]"
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              className={`inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border border-white/15 px-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(168,85,247,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(217,70,239,0.32)] active:scale-[0.98] ${buttonGradient} ${buttonGradientHover}`}
            >
              Get Started
              <Zap className="ml-1.5 size-3.5 text-orange-400" />
            </Link>
          </div>
        </div>
      </Reveal>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "Testimonials", href: "#" },
      { label: "Integration", href: "#" },
    ],
  },
  {
    title: "Social",
    links: [
      { label: "Facebook", href: "#" },
      { label: "Instagram", href: "#" },
      { label: "Twitter", href: "#" },
      { label: "LinkedIn", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "#" },
      { label: "Support", href: "#" },
    ],
  },
  {
    title: "Dora-Fast",
    links: [
      { label: "About Us", href: "#" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
];

function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentYear(new Date().getFullYear());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <footer className="relative mx-auto flex w-full max-w-6xl flex-col items-center justify-center border-t border-border bg-[radial-gradient(35%_128px_at_50%_0%,rgba(255,255,255,0.08),transparent)] px-4 pb-8 sm:px-6 md:pb-0 lg:px-8">
      <div className="absolute left-1/2 top-0 h-1.5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />

      <div className="mt-12 grid w-full gap-8 sm:mt-16 xl:grid-cols-3 xl:gap-8">
        <Reveal delay={0.1}>
          <div className="flex flex-col items-start justify-start md:max-w-[400px]">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="" width={50} height={50} className="h-12 w-12 rounded-xl md:h-14 md:w-14" />
              <span className="text-xl font-bold text-white">
                Dora<span className="text-violet-300">-Fast</span>
              </span>
            </div>
            <p className="mt-4 text-start text-sm text-muted-foreground">Move with purpose.</p>
            <span className="mt-4 flex flex-wrap items-center text-sm text-neutral-200">
              Made by{" "}
              <Link href="https://prashanth.app/" className="ml-1 font-semibold">
                Prashanth_Chowdari
              </Link>
            </span>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-8 xl:col-span-2">
          {footerColumns.map((col, i) => (
            <Reveal key={col.title} delay={0.2 + i * 0.1}>
              <h3 className="text-base font-medium text-white">{col.title}</h3>
              <ul className="mt-4 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.label} className="mt-2 first:mt-0">
                    <Link href={l.href} className="transition-all duration-300 hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-8 w-full border-t border-border/40 pt-4 md:flex md:items-center md:justify-between md:pt-8">
        <Reveal delay={0.6}>
          <p className="mt-4 text-sm text-muted-foreground md:mt-0">
            &copy; {currentYear ?? ""} Dora-Fast. All rights reserved.
          </p>
        </Reveal>
      </div>

      <div className="hidden h-[15rem] w-full items-center justify-center md:flex">
        <TextHoverEffect text="Dora-Fast" />
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setLine((c) => (c + 1) % rotatingLines.length), 3500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-clip bg-background text-foreground">
      {/* grid background */}
      <div aria-hidden="true" className="sw-grid pointer-events-none absolute inset-0 h-full" />

      <Navbar />

      <main className="relative z-0 mx-auto mt-6 w-full sm:mt-14 md:mt-20">
        {/* Hero */}
        <section className="mx-auto h-full w-full max-w-full px-4 sm:px-6 md:max-w-screen-xl md:px-12 lg:px-20">
          <div className="flex w-full flex-col items-center justify-center bg-gradient-to-t from-background to-transparent text-center">
            <Reveal className="flex w-full flex-col items-center justify-center text-center">
              <button
                type="button"
                className="spark-badge group max-w-full border border-violet-400/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 via-75% to-sky-500/10 shadow-[0_0_22px_rgba(168,85,247,0.10)]"
              >
                <span>
                  <span className="spark" />
                </span>
                <span className="backdrop" />
                <span className="absolute inset-x-0 bottom-0 h-full w-full bg-gradient-to-tr from-white/20 to-transparent blur-md" />
                <span className="z-10 flex items-center justify-center gap-1 py-0.5 text-xs text-neutral-100 sm:text-sm">
                  ✨ A new perspective starts here
                  <ArrowRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                </span>
              </button>

              <h1 className="w-full text-balance py-4 text-center text-[1.75rem] font-medium !leading-[1.16] tracking-tight min-[400px]:text-3xl sm:py-6 sm:text-5xl md:text-6xl lg:text-7xl">
                Move with purpose.
                <br />
                <span key={line} className="sw-gradient-text line-change inline-block pb-2">
                  {rotatingLines[line]}
                </span>
              </h1>

              <p className="mb-6 max-w-2xl text-balance px-1 text-sm tracking-tight text-muted-foreground sm:mb-12 sm:text-lg md:text-xl">
                A thoughtful digital space designed to help you reset, explore possibilities, and make your next step feel effortless.
              </p>

              <div className="z-50 flex w-full flex-wrap items-center justify-center gap-3 px-2 sm:gap-4">
                <Link
                  href="/auth"
                  className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(168,85,247,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_38px_rgba(217,70,239,0.36)] active:scale-[0.98] sm:px-6 ${buttonGradient} ${buttonGradientHover}`}
                >
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.2} className="relative w-full bg-transparent px-1 pb-10 pt-10 sm:px-3 sm:pb-20 sm:pt-20 md:py-32">
              <div className="sw-gradient animate-image-glow absolute inset-0 left-1/2 h-1/4 w-3/4 -translate-x-1/2 blur-[5rem] md:top-[10%] md:h-1/3" />

              {/* Outer frame: NO overflow-hidden, so the beam is never clipped */}
              <div className="relative isolate rounded-xl p-1.5 ring-1 ring-inset ring-white/20 backdrop-blur-3xl sm:rounded-2xl sm:p-2 lg:p-3">
                <BorderBeam duration={7} delay={0} colorFrom="#ec4899" colorTo="#8b5cf6" borderWidth={2} />

                {/* Inner wrapper: image + bottom fades stay inside here */}
                <div className="relative overflow-hidden rounded-md lg:rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/img.png"
                    alt="Dora-Fast dashboard preview"
                    width={1200}
                    height={1200}
                    className="block h-auto w-full bg-foreground/10 ring-1 ring-border"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/2 w-full bg-gradient-to-t from-background to-transparent" />
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}