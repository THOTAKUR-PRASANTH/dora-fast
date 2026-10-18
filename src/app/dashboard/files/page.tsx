import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FilesManager, { type ManagedFile } from "@/components/dashboard/files-manager";
import { FILES_TABLE, fileHref } from "@/components/dashboard/config";

function formatBytes(value: unknown) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function getExpiry(value: unknown): ManagedFile["expiry"] {
  if (typeof value !== "string" || !value) return { label: "No expiry", state: "none" };
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return { label: "No expiry", state: "none" };
  const remaining = time - Date.now();
  if (remaining <= 0) return { label: "Expired", state: "expired" };
  if (remaining <= 3 * 24 * 60 * 60 * 1000) return { label: "Expires soon", state: "soon" };
  return { label: `Expires ${formatDate(value)}`, state: "active" };
}

export default async function MyFilesPage() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/auth?mode=login");

  const { data, error } = await supabase
    .from(FILES_TABLE)
    .select("*")
    .eq("owner_id", auth.user.id)
    .order("created_at", { ascending: false });

  const files: ManagedFile[] = (data ?? []).map((row: Record<string, any>) => {
    const name = String(row.original_name ?? row.filename ?? row.file_name ?? row.name ?? "Untitled file");
    const size = row.size_bytes ?? row.file_size ?? row.size;
    const created = row.created_at ?? row.createdAt ?? row.uploaded_at;
    const expiryAt = row.expires_at ?? row.expiry_at ?? row.expiresAt;
    const ext = name.includes(".") ? name.split(".").pop()!.slice(0, 8).toUpperCase() : "FILE";
    return {
      id: String(row.id), name, ext, sizeLabel: formatBytes(size),
      sizeBytes: Number(size) || 0, dateLabel: formatDate(created),
      expiry: getExpiry(expiryAt), href: fileHref(String(row.id)),
      contentType: String(row.content_type ?? row.mime_type ?? "File"),
    };
  });

  return <FilesManager initialFiles={files} loadError={error ? "We couldn't load your files. Check the files table columns and the signed-in user's row-level security policy." : undefined} />;
}
