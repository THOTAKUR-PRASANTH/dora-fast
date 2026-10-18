"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import Link from "next/link";

type UploadStatus =
  | "idle"
  | "validating"
  | "preparing"
  | "uploading"
  | "finalizing"
  | "success"
  | "error";

type UploadView = {
  status: UploadStatus;
  progress: number;
  speed: string;
  message: string;
  error?: string;
};

type InitResponse = {
  key?: string;
  uploadId?: string;
  partSize?: number;
  error?: string;
  message?: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GiB
const MIN_PART_SIZE = 5 * 1024 * 1024; // R2/S3 multipart minimum for non-final parts
const DEFAULT_PART_SIZE = 16 * 1024 * 1024;
const MAX_PARTS = 10_000;
const CONCURRENCY = 4;
const MAX_FILENAME_LENGTH = 255;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unit]}`;
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

function validateFile(file: File): string | null {
  const name = file.name.trim();
  if (!name) return "Choose a file with a valid filename.";
  if (name.length > MAX_FILENAME_LENGTH) {
    return `Filename must be ${MAX_FILENAME_LENGTH} characters or fewer.`;
  }
  if (/[\u0000-\u001F\u007F]/.test(name)) {
    return "The filename contains unsupported control characters. Rename the file and try again.";
  }
  if (file.size <= 0) return "This file is empty. Choose a file larger than 0 bytes.";
  if (file.size > MAX_FILE_SIZE) {
    return `This file is ${formatBytes(file.size)}. The maximum allowed size is 5 GiB.`;
  }
  if (!Number.isSafeInteger(file.size)) return "The file size could not be validated by this browser.";
  return null;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.message === "string" && body.message.trim()) return body.message;
    if (typeof body?.error === "string" && body.error.trim()) return body.error;
  } catch {
    // Some server errors return an empty or non-JSON body.
  }
  return fallback;
}

function uploadPart(
  url: string,
  blob: Blob,
  onProgress: (loaded: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.timeout = 15 * 60 * 1000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(event.loaded, blob.size));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Part upload failed (HTTP ${xhr.status}). Please retry.`));
        return;
      }
      const etag = xhr.getResponseHeader("ETag");
      if (!etag) {
        reject(new Error("The storage response did not include an ETag. Check your R2 bucket CORS configuration."));
        return;
      }
      resolve(etag);
    };
    xhr.onerror = () => reject(new Error("Network error while uploading a part. Check your connection and retry."));
    xhr.ontimeout = () => reject(new Error("A part upload timed out. Check your connection and retry."));
    xhr.onabort = () => reject(new Error("The upload was cancelled."));
    xhr.send(blob);
  });
}

export default function UploadFiles() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<UploadView>({
    status: "idle",
    progress: 0,
    speed: "0 B/s",
    message: "Choose a file to get started.",
  });

  function chooseFile(nextFile: File | null) {
    if (busy || !nextFile) return;
    const validationError = validateFile(nextFile);
    setFile(nextFile);
    setView({
      status: validationError ? "error" : "idle",
      progress: 0,
      speed: "0 B/s",
      message: validationError ? "This file cannot be uploaded." : "File checked. Ready to upload.",
      error: validationError ?? undefined,
    });
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
    // Allow choosing the same file again after a failed attempt.
    event.currentTarget.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function uploadFile() {
    if (!file || busy) return;

    const validationError = validateFile(file);
    if (validationError) {
      setView({ status: "error", progress: 0, speed: "0 B/s", message: "Validation failed.", error: validationError });
      return;
    }

    setBusy(true);
    setView({ status: "preparing", progress: 0, speed: "Calculating…", message: "Preparing a secure upload…" });

    try {
      const initResponse = await fetch("/api/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, size: file.size }),
      });
      if (!initResponse.ok) {
        throw new Error(await readError(initResponse, "Could not start the upload. Please try again."));
      }

      const init = (await initResponse.json()) as InitResponse;
      const key = init.key;
      const uploadId = init.uploadId;
      if (!key || !uploadId) {
        throw new Error("The upload service returned an incomplete response. Please contact support if this continues.");
      }

      const chunkSize = Number(init.partSize) > 0 ? Number(init.partSize) : DEFAULT_PART_SIZE;
      if (chunkSize < MIN_PART_SIZE) {
        throw new Error("The upload service returned an invalid part size. Please check the multipart upload configuration.");
      }
      const partCount = Math.ceil(file.size / chunkSize);
      if (partCount < 1 || partCount > MAX_PARTS) {
        throw new Error("This file cannot be split into a valid number of upload parts. Please contact support.");
      }

      const completedBytes = new Array<number>(partCount).fill(0);
      const parts: { PartNumber: number; ETag: string }[] = [];
      const startedAt = Date.now();
      let nextPart = 0;

      setView({ status: "uploading", progress: 0, speed: "0 B/s", message: `Uploading ${partCount} part${partCount === 1 ? "" : "s"}…` });

      async function worker() {
        while (true) {
          const index = nextPart++;
          if (index >= partCount) return;

          const partNumber = index + 1;
          const start = index * chunkSize;
          const blob = file.slice(start, Math.min(start + chunkSize, file.size));
          let etag = "";
          let partError: unknown;

          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const urlResponse = await fetch("/api/upload/part-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, uploadId, partNumber }),
              });
              if (!urlResponse.ok) {
                throw new Error(await readError(urlResponse, `Could not prepare upload part ${partNumber}.`));
              }
              const urlBody = await urlResponse.json();
              if (typeof urlBody?.url !== "string" || !urlBody.url) {
                throw new Error("The upload service did not return a valid part URL.");
              }

              etag = await uploadPart(urlBody.url, blob, (loaded) => {
                completedBytes[index] = loaded;
                const transferred = completedBytes.reduce((sum, value) => sum + value, 0);
                const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.1);
                setView({
                  status: "uploading",
                  progress: Math.min(99, (transferred / file.size) * 100),
                  speed: formatSpeed(transferred / elapsedSeconds),
                  message: `Uploading part ${partNumber} of ${partCount}…`,
                });
              });

              completedBytes[index] = blob.size;
              parts.push({ PartNumber: partNumber, ETag: etag });
              break;
            } catch (error) {
              partError = error;
              completedBytes[index] = 0;
              if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
              }
            }
          }

          if (!etag) {
            throw partError instanceof Error ? partError : new Error(`Part ${partNumber} failed after three attempts.`);
          }
        }
      }

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, partCount) }, () => worker()));
      parts.sort((a, b) => a.PartNumber - b.PartNumber);

      if (parts.length !== partCount || parts.some((part, index) => part.PartNumber !== index + 1 || !part.ETag)) {
        throw new Error("Some upload parts are missing. The file has not been finalized; please retry.");
      }

      setView({ status: "finalizing", progress: 99, speed: "Almost done", message: "Verifying parts and finalizing your file…" });
      const completeResponse = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, uploadId, parts }),
      });
      if (!completeResponse.ok) {
        throw new Error(await readError(completeResponse, "All parts uploaded, but finalization failed. Please retry or contact support."));
      }

      setView({ status: "success", progress: 100, speed: "Complete", message: "Upload completed successfully." });
      setFile(null);
    } catch (error) {
      setView((previous) => ({
        ...previous,
        status: "error",
        message: "Upload could not be completed.",
        error: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
      }));
    } finally {
      setBusy(false);
    }
  }

  const progressColor = view.status === "error" ? "bg-red-400" : view.status === "success" ? "bg-emerald-400" : "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-400";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <section className="fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.07] px-3 py-1.5 text-xs font-medium text-violet-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Secure upload workspace
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Upload your <span className="sw-gradient-text">files.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Big files, fewer steps. Upload directly to private cloud storage with live progress and automatic retries.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-7">
          <div
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-label="Choose a file to upload, maximum size 5 GiB"
            onClick={() => !busy && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (!busy && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
            className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-10 text-center transition sm:min-h-72 ${
              dragging ? "border-violet-300 bg-violet-400/10" : "border-white/15 bg-white/[0.02] hover:border-violet-300/50 hover:bg-white/[0.04]"
            } ${busy ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/15 to-indigo-500/10 text-3xl text-violet-200">↑</span>
            <h2 className="mt-5 max-w-full break-all text-lg font-semibold text-zinc-100">
              {file ? file.name : "Drop your file here"}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {file ? `${formatBytes(file.size)} · ${file.type || "Unknown file type"}` : "or click to browse your device"}
            </p>
            <p className="mt-4 text-xs text-zinc-500">Maximum 5 GiB per file · Any file type</p>
          </div>
          <input ref={inputRef} type="file" className="hidden" onChange={onInputChange} disabled={busy} />

          {file && !busy && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-200">{file.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatBytes(file.size)}</p>
              </div>
              <button type="button" onClick={() => { setFile(null); setView({ status: "idle", progress: 0, speed: "0 B/s", message: "Choose a file to get started." }); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.06]">
                Remove
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={uploadFile}
            disabled={!file || busy || view.status === "error" && !file}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {busy ? "Uploading…" : view.status === "success" ? "Upload another file" : "Start upload"}
          </button>

          <div className="mt-7" aria-live="polite">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className={view.status === "error" ? "text-red-300" : view.status === "success" ? "text-emerald-300" : "text-zinc-300"}>{view.message}</span>
              <span className="font-semibold tabular-nums text-zinc-200">{view.progress.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-label="Upload progress" aria-valuenow={view.progress} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full rounded-full transition-[width] duration-200 ${progressColor}`} style={{ width: `${view.progress}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-zinc-500">
              <span>{file ? `${formatBytes((view.progress / 100) * file.size)} of ${formatBytes(file.size)}` : view.status === "success" ? "File upload finished" : "No file selected"}</span>
              <span>{view.speed}</span>
            </div>
            {view.error && (
              <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200">
                <p className="font-semibold">Upload issue</p>
                <p className="mt-1 leading-6">{view.error}</p>
                <p className="mt-2 text-xs text-red-200/70">Your file is not marked as complete unless the server finalizes the multipart upload.</p>
              </div>
            )}
            {view.status === "success" && (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200">
                <p className="font-semibold">Your upload is complete.</p>
                <p className="mt-1 text-emerald-100/70">The server confirmed multipart upload finalization.</p>
                <Link href="/dashboard/files" className="mt-3 inline-flex items-center gap-2 font-semibold hover:text-white">View my files <span>→</span></Link>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Upload rules</p>
            <h2 className="mt-3 text-lg font-semibold">Clear limits. Reliable transfers.</h2>
            <ul className="mt-5 space-y-4 text-sm text-zinc-400">
              <li className="flex gap-3"><span className="text-emerald-300">✓</span><span><strong className="text-zinc-200">Maximum size:</strong> 5 GiB per file.</span></li>
              <li className="flex gap-3"><span className="text-emerald-300">✓</span><span><strong className="text-zinc-200">Non-empty files:</strong> empty files are rejected.</span></li>
              <li className="flex gap-3"><span className="text-emerald-300">✓</span><span><strong className="text-zinc-200">Filename check:</strong> valid name, up to 255 characters.</span></li>
              <li className="flex gap-3"><span className="text-emerald-300">✓</span><span><strong className="text-zinc-200">Multipart upload:</strong> parts upload in parallel with retries.</span></li>
              <li className="flex gap-3"><span className="text-emerald-300">✓</span><span><strong className="text-zinc-200">Private storage:</strong> upload requires a signed-in session on the server.</span></li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-xl text-cyan-200">◈</span>
              <div>
                <h3 className="text-sm font-semibold">Need your files?</h3>
                <p className="mt-1 text-xs text-zinc-500">Review completed uploads.</p>
              </div>
            </div>
            <Link href="/dashboard/files" className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.05]">Open My Files <span className="ml-2">→</span></Link>
          </div>

          <p className="px-1 text-xs leading-5 text-zinc-600">File type is not restricted in the browser. The server must still validate the authenticated user, file size, filename, upload ownership, and permitted storage operations.</p>
        </aside>
      </section>
    </div>
  );
}
