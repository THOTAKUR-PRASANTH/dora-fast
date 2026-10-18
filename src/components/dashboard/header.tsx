"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UPLOAD_HREF } from "./config";
import Image from "next/image";
const links = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/dashboard/files", label: "My Files", icon: "▤" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

export default function DashboardHeader({
  email,
  name,
}: {
  email: string;
  name?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initial = (name || email).charAt(0).toUpperCase();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Lock page scroll + close on Escape / when the screen grows to desktop size
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <>
      <header className="fade-up sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-[clamp(1rem,4vw,2rem)]">
          {/* Logo always opens Dashboard */}
          <Link
            href="/dashboard"
            aria-label="Dora-Fast dashboard"
            onClick={() => setOpen(false)}
            className="flex shrink-0 items-center gap-2.5"
          >
            <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
            <span className="text-lg font-bold tracking-tight">
              Dora<span className="text-violet-300">-Fast</span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Dashboard navigation" className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "border-violet-400/15 bg-violet-400/10 text-violet-200"
                      : "border-transparent text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <span aria-hidden="true" className="text-base">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <Link
              href={UPLOAD_HREF}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:brightness-110 active:scale-95"
            >
              <span aria-hidden="true">↑</span>
              <span>Upload Files</span>
            </Link>

            <Link
              href="/dashboard/settings"
              title={email}
              aria-label={`Account settings for ${email}`}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition ${
                pathname.startsWith("/dashboard/settings")
                  ? "border-violet-300/40 bg-violet-500/20 text-violet-100"
                  : "border-white/10 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-100 hover:border-white/30"
              }`}
            >
              {initial}
            </Link>

            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                Log out
              </button>
            </form>
          </div>

          {/* Mobile / tablet: menu button */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] transition hover:bg-white/10 active:scale-95 lg:hidden"
          >
            <span className="sr-only">Menu</span>
            <span
              aria-hidden="true"
              className={`absolute h-0.5 w-5 rounded-full bg-white transition-all duration-300 ${
                open ? "translate-y-0 rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              aria-hidden="true"
              className={`absolute h-0.5 w-5 rounded-full bg-white transition-all duration-300 ${
                open ? "scale-x-0 opacity-0" : "opacity-100"
              }`}
            />
            <span
              aria-hidden="true"
              className={`absolute h-0.5 w-5 rounded-full bg-white transition-all duration-300 ${
                open ? "translate-y-0 -rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile / tablet menu (sits under the header, sized to the dynamic viewport) */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? "visible" : "invisible"}`}
        style={{ transitionProperty: "visibility", transitionDuration: "0s", transitionDelay: open ? "0s" : "0.25s" }}
      >
        {/* Backdrop */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Panel */}
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute inset-x-0 top-14 max-h-[calc(100dvh-3.5rem)] origin-top overflow-y-auto overscroll-contain border-b border-white/10 bg-[#0a0a0a]/95 px-[clamp(1rem,4vw,2rem)] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl shadow-black/60 backdrop-blur-xl transition duration-200 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
        >
          {/* Account */}
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-violet-500/30 to-indigo-500/30 text-base font-semibold text-violet-100">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-white">{name || email.split("@")[0]}</span>
              <span className="block truncate text-xs text-zinc-500">{email}</span>
            </span>
          </Link>

          {/* Links */}
          <nav aria-label="Mobile navigation" className="mt-4 space-y-1">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-base font-medium transition ${
                    active
                      ? "border-violet-400/15 bg-violet-400/10 text-violet-200"
                      : "border-transparent text-zinc-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <span aria-hidden="true" className="w-5 text-center text-lg">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="mt-5 space-y-3">
            <Link
              href={UPLOAD_HREF}
              onClick={() => setOpen(false)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-base font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 active:scale-[0.98]"
            >
              <span aria-hidden="true">↑</span>
              Upload Files
            </Link>

            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-base font-medium text-red-300 transition hover:bg-red-500/20 active:scale-[0.98]"
              >
                <span aria-hidden="true">↗</span>
                Log out
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}