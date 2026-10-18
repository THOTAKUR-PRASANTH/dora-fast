import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
//import { createClient } from "@/lib/supabase/server";
import { FILES_TABLE } from "@/components/dashboard/config";
import { authenticateApiRequest } from "@/lib/supabase/api-auth";


function getObjectKey(row: Record<string, unknown>): string | null {
  // Support common column names; keep the actual R2 key on the server.
  for (const field of ["object_key", "r2_key", "storage_key", "key", "file_key"]) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id || id.length > 200) return NextResponse.json({ error: "Invalid file id." }, { status: 400 });

        const auth = await authenticateApiRequest(_request);

    if (!auth.user || !auth.supabase) {
      return NextResponse.json(
        { error: auth.error ?? "Sign in to delete files." },
        { status: auth.status }
      );
    }

    const { supabase, user } = auth;
    // Fetch only a record owned by this authenticated user.
    const { data: row, error: lookupError } = await supabase
      .from(FILES_TABLE)
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("File delete lookup failed", lookupError);
      return NextResponse.json({ error: "Could not verify file ownership. No file was deleted." }, { status: 500 });
    }
    if (!row) return NextResponse.json({ error: "File not found, or you do not have permission to delete it." }, { status: 404 });

    const objectKey = getObjectKey(row as Record<string, unknown>);
    const bucket = process.env.R2_BUCKET_NAME ?? process.env.R2_BUCKET ?? process.env.CLOUDFLARE_R2_BUCKET;
    const r2 = createR2Client();
    if (!objectKey || !bucket || !r2) {
      console.error("R2 deletion is not configured or the row has no recognized object-key column.");
      return NextResponse.json({ error: "Storage deletion is not configured correctly. No database record was removed." }, { status: 500 });
    }

    // Delete the actual object first. If this fails, keep the DB row so the user can retry.
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    } catch (storageError) {
      console.error("R2 object deletion failed", storageError);
      return NextResponse.json({ error: "Cloud storage could not delete this file. Its record was kept so you can retry." }, { status: 502 });
    }

    const { error: dbDeleteError } = await supabase
      .from(FILES_TABLE)
      .delete()
      .eq("id", id)
      .eq("owner_id", auth.user.id);

    if (dbDeleteError) {
      // R2 deletion succeeded but DB deletion did not. Tell the user accurately.
      console.error("R2 object deleted but database record deletion failed", dbDeleteError);
      return NextResponse.json({ error: "The file object was deleted from cloud storage, but its database record could not be removed. Contact support to reconcile the record." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    console.error("Unexpected file deletion error", error);
    return NextResponse.json({ error: "Unexpected server error while deleting the file." }, { status: 500 });
  }
}
