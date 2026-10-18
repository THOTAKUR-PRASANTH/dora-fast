
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FilesList, { type FileItem } from "@/components/dashboard/files-list";
import { FILES_TABLE, fileHref } from "@/components/dashboard/config";

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

type DashboardFileRow = {
  id: string | number;
  original_name?: unknown;
  filename?: unknown;
  name?: unknown;
  size_bytes?: unknown;
  file_size?: unknown;
  size?: unknown;
  created_at?: string | null;
  createdAt?: string | null;
  expires_at?: string | null;
  expiresAt?: string | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();

  if (authError || !data.user) {
    redirect("/auth?mode=login");
  }

  const email = data.user.email ?? "Signed-in user";
  const metadataName = data.user.user_metadata?.name;
  const name =
    typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim()
      : email.split("@")[0];

  // Load only the signed-in user's file records.
  const { data: rows, error: filesError } = await supabase
    .from(FILES_TABLE)
    .select("*")
    .eq("owner_id", data.user.id)
    .order("created_at", { ascending: false });

  const fileRows = (rows ?? []) as DashboardFileRow[];
  const files: FileItem[] = fileRows.map((row) => {
    const name = String(row.original_name ?? row.filename ?? row.name ?? "Untitled file");
    const size = Number(row.size_bytes ?? row.file_size ?? row.size ?? 0);
    const createdAt = row.created_at ?? row.createdAt ?? null;
    const expiresAt = row.expires_at ?? row.expiresAt ?? null;

    let expiry: FileItem["expiry"] = {
      label: "No expiry",
      state: "none",
    };

    if (expiresAt) {
      const expiryDate = new Date(expiresAt);

      if (!Number.isNaN(expiryDate.getTime())) {
        expiry = {
          label: `Expires ${formatDate(expiresAt)}`,
          state: "active",
        };
      }
    }

    const extension = name.includes(".")
      ? name.split(".").pop()!.slice(0, 8).toUpperCase()
      : "FILE";

    return {
      id: String(row.id),
      name,
      ext: extension,
      sizeLabel: formatSize(size),
      dateLabel: formatDate(createdAt),
      expiry,
      href: fileHref(String(row.id)),
    };
  });

  const totalBytes = files.reduce((sum, file) => {
    const matchingRow = fileRows.find((row) => String(row.id) === file.id);
    return sum + Number(
      matchingRow?.size_bytes ??
      matchingRow?.file_size ??
      matchingRow?.size ??
      0
    );
  }, 0);

  const firstName = name.split(/\s+/)[0];

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <section className="fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 text-xs font-medium text-violet-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Your personal workspace
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Welcome back,{" "}
              <span className="sw-gradient-text">{firstName}.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Your files. Your space. Your speed.
              <span className="mt-1 block text-zinc-500">
                Everything you upload, organized in one simple workspace.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-500/30 font-semibold text-violet-100">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Signed in as</p>
              <p className="max-w-[220px] truncate text-sm font-medium text-zinc-200">
                {email}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="fastshare-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-400">Your files</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {files.length}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/10 text-xl text-violet-200">
              ◫
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Files associated with your account
          </p>
        </article>

        <article className="fastshare-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-400">Total file size</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {formatSize(totalBytes)}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-xl text-cyan-200">
              ◈
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Combined size of listed files
          </p>
        </article>

        <article className="fastshare-card rounded-2xl p-5 sm:col-span-2 sm:p-6 xl:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-400">Workspace status</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                Ready to go
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-xl text-emerald-200">
              ✓
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Your authenticated workspace is active
          </p>
        </article>
      </section>

          {/* Brand banner */}
      <section className="pop-in">
        <div className="auth-card relative overflow-hidden rounded-2xl bg-black/80 p-[2px] shadow-2xl shadow-black/40 backdrop-blur-lg">
          <div className="relative z-10 overflow-hidden rounded-[14px] bg-black p-6 sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
            />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
                  The Dora-Fast experience
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Less waiting.
                  <span className="sw-gradient-text block">More doing.</span>
                </h2>
                <p className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">
                  From everyday documents to large files, keep your transfers
                  simple and your workflow moving.
                </p>
              </div>

              <Link
                href="/dashboard/upload-files"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 active:scale-[0.98]"
              >
                Upload a file <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
     
      {/* Small closing slogan */}
      <section className="border-t border-white/[0.08] pt-6">
        <p className="text-center text-sm text-zinc-500">
          Built for simple transfers.{" "}
          <span className="text-zinc-300">Designed to keep you moving.</span>
        </p>
      </section>
    </div>
  );
}
