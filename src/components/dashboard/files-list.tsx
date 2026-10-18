"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { UPLOAD_HREF } from "./config";

export type FileItem = {
  id: string;
  name: string;
  ext: string;
  sizeLabel: string;
  dateLabel: string;
  expiry: { label: string; state: "none" | "active" | "soon" | "expired" };
  href: string;
};

const badgeStyles: Record<FileItem["expiry"]["state"], string> = {
  none: "border-white/10 bg-white/5 text-zinc-400",
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  soon: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  expired: "border-red-500/30 bg-red-500/10 text-red-300",
};

export default function FilesList({ files, error }: { files: FileItem[]; error?: string }) {
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
  }, [files, query]);

  async function copyLink(file: FileItem) {
    try {
      await navigator.clipboard.writeText(new URL(file.href, window.location.origin).href);
      setCopiedId(file.id);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      window.prompt("Copy this link:", new URL(file.href, window.location.origin).href);
    }
  }

  return (
    <section className="fade-up" style={{ animationDelay: "0.3s" }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">My files</h2>
          <p className="mt-1 text-sm text-zinc-400">Everything you’ve uploaded, newest first.</p>
        </div>
        {files.length > 0 && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            aria-label="Search files"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-purple-500 sm:w-72"
          />
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        {error ? (
          <div className="p-6 text-sm">
            <p className="font-medium text-red-300">Couldn’t load your files.</p>
            <p className="mt-1 break-words text-zinc-400">{error}</p>
            <p className="mt-3 text-zinc-500">
              Check the table name in <code className="text-zinc-300">components/dashboard/config.ts</code> and that the
              signed-in user can read it (row-level security).
            </p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-violet-200">
              ↑
            </div>
            <p className="text-lg font-medium">No files yet</p>
            <p className="mt-1 max-w-sm text-sm text-zinc-400">Upload your first file and it will show up here.</p>
            <Link
              href={UPLOAD_HREF}
              className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-purple-600 px-5 text-sm font-medium text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700 active:scale-95"
            >
              Upload a file
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-400">No files match “{query}”.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {visible.map((file) => (
              <li key={file.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-[10px] font-bold uppercase tracking-wide text-violet-100">
                    {file.ext || "file"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100" title={file.name}>
                      {file.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                      <span>{file.sizeLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{file.dateLabel}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeStyles[file.expiry.state]}`}
                      >
                        {file.expiry.label}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyLink(file)}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-zinc-200 transition hover:bg-white/10 active:scale-95"
                  >
                    {copiedId === file.id ? "Copied ✓" : "Copy link"}
                  </button>
                  <a
                    href={file.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex h-8 items-center justify-center rounded-md bg-[#fafafa] px-3 text-xs font-medium text-[#171717] transition hover:bg-white/90 active:scale-95 ${
                      file.expiry.state === "expired" ? "pointer-events-none opacity-40" : ""
                    }`}
                  >
                    Open
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}