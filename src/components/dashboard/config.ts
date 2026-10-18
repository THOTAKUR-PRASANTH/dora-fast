// ---- Edit these three to match your project -------------------------------

/** Where your existing multipart uploader lives. */
export const UPLOAD_HREF = "/dashboard/upload-files";

/** Supabase table that stores one row per uploaded file. */
export const FILES_TABLE = "files";

/** Link used by the "Open" / "Copy link" buttons (used when a row has no share_url / url column). */
export const fileHref = (id: string) => `/api/files/${id}/download`;