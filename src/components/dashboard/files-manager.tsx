"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ManagedFile = {
  id: string;
  name: string;
  ext: string;
  sizeLabel: string;
  sizeBytes: number;
  dateLabel: string;
  expiry: { label: string; state: "none" | "active" | "soon" | "expired" };
  href: string;
  contentType: string;
};

const expiryClasses: Record<ManagedFile["expiry"]["state"], string> = {
  none: "border-white/10 bg-white/5 text-zinc-400",
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  soon: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  expired: "border-red-400/20 bg-red-400/10 text-red-300",
};

function formatTotal(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value.toFixed(1)} ${units[unit]}`;
}

export default function FilesManager({ initialFiles, loadError }: { initialFiles: ManagedFile[]; loadError?: string }) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "largest">("newest");
  const [selected, setSelected] = useState<ManagedFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = files.filter((file) => `${file.name} ${file.ext} ${file.contentType}`.toLowerCase().includes(q));
    return result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "largest") return b.sizeBytes - a.sizeBytes;
      const aDate = Date.parse(a.dateLabel);
      const bDate = Date.parse(b.dateLabel);
      return sort === "oldest" ? aDate - bDate : bDate - aDate;
    });
  }, [files, query, sort]);

  async function copyLink(file: ManagedFile) {
    try {
      const url = new URL(file.href, window.location.origin).href;
      await navigator.clipboard.writeText(url);
      setCopiedId(file.id);
      setNotice("File link copied to clipboard.");
      window.setTimeout(() => setCopiedId((current) => current === file.id ? null : current), 1600);
    } catch {
      setError("Clipboard access was blocked by your browser. Open the file and copy its address instead.");
    }
  }

  async function confirmDelete() {
    if (!selected || deleting) return;
    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
        headers: { "Accept": "application/json" },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "The file could not be deleted. Please try again.");
      setFiles((current) => current.filter((file) => file.id !== selected.id));
      setNotice(`“${selected.name}” was deleted from your file list and cloud storage.`);
      setSelected(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error while deleting this file.");
    } finally {
      setDeleting(false);
    }
  }

  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const expiredCount = files.filter((file) => file.expiry.state === "expired").length;

  return (
    <div className="space-y-8">
      <section className="fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.07] px-3 py-1.5 text-xs font-medium text-violet-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Private file library
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">My <span className="sw-gradient-text">Files.</span></h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">Every transfer in one place. Find it, open it, copy its link, or remove it when you no longer need it.</p>
          </div>
          <a href="/dashboard/upload-files" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:brightness-110 active:scale-[0.98]">
            <span aria-hidden="true">↑</span> Upload files
          </a>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="fastshare-card rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5">
          <p className="text-sm text-zinc-400">Total files</p><p className="mt-2 text-3xl font-semibold tabular-nums">{files.length}</p><p className="mt-2 text-xs text-zinc-500">Your stored file records</p>
        </article>
        <article className="fastshare-card rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5">
          <p className="text-sm text-zinc-400">Total size</p><p className="mt-2 text-3xl font-semibold tabular-nums">{formatTotal(totalBytes)}</p><p className="mt-2 text-xs text-zinc-500">Combined size of listed files</p>
        </article>
        <article className="fastshare-card rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5">
          <p className="text-sm text-zinc-400">Expired files</p><p className="mt-2 text-3xl font-semibold tabular-nums">{expiredCount}</p><p className="mt-2 text-xs text-zinc-500">Based on available expiry metadata</p>
        </article>
      </section>

      {notice && <p role="status" className="fade-up rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm text-emerald-200">✓ {notice}</p>}
      {(error || loadError) && <p role="alert" className="fade-up rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-200">{error || loadError}</p>}

      <section className="fade-up" style={{ animationDelay: "0.12s" }}>
        <div className="fastshare-card rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-semibold">Your library</h2><p className="mt-1 text-sm text-zinc-500">Search and organize your uploads.</p></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block">
                <span className="sr-only">Search files</span><span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files..." className="h-10 w-full rounded-lg border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 sm:w-64" />
              </label>
              <select aria-label="Sort files" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 rounded-lg border border-white/10 bg-[#11111a] px-3 text-sm text-zinc-300 outline-none focus:border-violet-400/50">
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option><option value="largest">Largest first</option>
              </select>
            </div>
          </div>

          {files.length === 0 && !loadError ? (
            <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-300/[0.06] text-2xl text-violet-200">▤</div>
              <h3 className="mt-4 text-lg font-semibold">Your library is ready</h3><p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Once you upload a file, it will appear here with its size, date, and available actions.</p>
              <a href="/dashboard/upload-files" className="mt-5 inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-violet-100">Upload your first file →</a>
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="py-14 text-center"><p className="font-medium text-zinc-200">No matching files</p><p className="mt-2 text-sm text-zinc-500">Try a different search term.</p><button onClick={() => setQuery("")} className="mt-4 text-sm text-violet-200 hover:text-white">Clear search</button></div>
          ) : (
            <ul className="mt-5 space-y-2">
              {visibleFiles.map((file, index) => (
                <li key={file.id} className="group rounded-xl border border-white/[0.07] bg-white/[0.018] p-3 transition duration-300 hover:-translate-y-px hover:border-violet-300/20 hover:bg-white/[0.035] sm:p-4" style={{ animation: "fade-up 450ms both", animationDelay: `${Math.min(index * 45, 360)}ms` }}>
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-300/10 bg-gradient-to-br from-violet-500/15 to-indigo-500/10 text-[10px] font-bold tracking-wide text-violet-100">{file.ext || "FILE"}</div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-zinc-100" title={file.name}>{file.name}</p><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500"><span>{file.sizeLabel}</span><span>·</span><span>{file.dateLabel}</span><span>·</span><span className="truncate">{file.contentType}</span></div></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${expiryClasses[file.expiry.state]}`}>{file.expiry.label}</span>
                      <button type="button" onClick={() => copyLink(file)} className="inline-flex h-8 items-center justify-center rounded-lg bg-yellow-200/30 border border-pink-300 px-3 text-xs font-medium text-zinc-300 transition hover:border-violet-300/20 hover:bg-white/[0.05] hover:text-white">{copiedId === file.id ? "Copied ✓" : "Copy link"}</button>
                      <a href={file.href} target="_blank" rel="noreferrer" className={`inline-flex h-8 items-center justify-center rounded-lg bg-green-500  px-3 text-xs font-semibold text-zinc-950 transition hover:bg-green-500 ${file.expiry.state === "expired" ? "pointer-events-none opacity-40" : ""}`} aria-disabled={file.expiry.state === "expired"}>Open ↗</a>
                      <button type="button" onClick={() => { setSelected(file); setError(null); setNotice(null); }} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-red-400 bg-red-500 px-3 text-xs font-medium text-white-200 transition hover:border-red-400 hover:bg-red-600">⌫ <span>Delete</span></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-4 text-xs text-zinc-500"><span>Showing {visibleFiles.length} of {files.length} files</span><span>Private by default · Dora-Fast</span></div>
        </div>
      </section>

      {/* Explicit confirmation is required for every delete. */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-2xl border border-red-300/15 bg-[#101017] p-5 shadow-2xl shadow-black/50 sm:p-6" style={{ animation: "pop-in 180ms ease-out both" }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 text-xl text-red-200">⌫</div>
            <h2 id="delete-title" className="mt-4 text-xl font-semibold">Delete this file?</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">You are about to permanently delete:</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="break-all text-sm font-medium text-zinc-100">{selected.name}</p><p className="mt-1 text-xs text-zinc-500">{selected.sizeLabel} · {selected.dateLabel}</p></div>
            <p className="mt-3 text-sm leading-6 text-red-200/90">This action cannot be undone. The server will remove the object from Cloudflare R2 and then remove its database record.</p>
            {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.07] p-3 text-sm text-red-200">{error}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={deleting} onClick={() => setSelected(null)} className="h-10 rounded-lg border border-white/10 px-4 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50">Keep file</button>
              <button type="button" disabled={deleting} onClick={confirmDelete} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-60">{deleting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}{deleting ? "Deleting from storage…" : "Yes, permanently delete"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
