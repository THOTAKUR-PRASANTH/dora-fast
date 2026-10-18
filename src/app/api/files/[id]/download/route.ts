
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FILES_TABLE } from "@/components/dashboard/config";

function getObjectKey(row: Record<string, unknown>): string | null {
  for (const field of [
    "object_key",
    "r2_key",
    "storage_key",
    "key",
    "file_key",
  ]) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function createR2Client() {
  const accountId =
    process.env.R2_ACCOUNT_ID ??
    process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID ??
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY ??
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id || id.length > 200) {
      return NextResponse.json(
        { error: "Invalid file ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: auth, error: authError } =
      await supabase.auth.getUser();

    if (authError || !auth.user) {
      return NextResponse.json(
        { error: "Please sign in to download this file." },
        { status: 401 }
      );
    }

    const { data: row, error: lookupError } = await supabase
      .from(FILES_TABLE)
      .select("*")
      .eq("id", id)
      .eq("owner_id", auth.user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Download lookup failed:", lookupError);
      return NextResponse.json(
        { error: "Could not look up this file." },
        { status: 500 }
      );
    }

    if (!row) {
      return NextResponse.json(
        { error: "File not found, or you do not have permission to download it." },
        { status: 404 }
      );
    }

    const record = row as Record<string, unknown>;
    const objectKey = getObjectKey(record);
    const bucket =
      process.env.R2_BUCKET_NAME ??
      process.env.R2_BUCKET ??
      process.env.CLOUDFLARE_R2_BUCKET;

    const r2 = createR2Client();

    if (!objectKey || !bucket || !r2) {
      console.error("Download configuration or object key is missing.");
      return NextResponse.json(
        { error: "Cloud storage is not configured correctly." },
        { status: 500 }
      );
    }

    const rawName =
      record.original_filename ??
      record.original_name ??
      record.filename ??
      record.name;

    const filename =
      typeof rawName === "string" && rawName.trim()
        ? rawName.trim().split(/[\\/]/).pop() || "download"
        : "download";

    const safeFilename = filename
      .replace(/[\r\n"]/g, "_");

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ResponseContentDisposition:
        `attachment; filename="${safeFilename}"`,
    });

    const url = await getSignedUrl(r2, command, {
      expiresIn: 60,
    });

    return NextResponse.redirect(url, 302);
  } catch (error) {
    console.error("File download failed:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while downloading the file." },
      { status: 500 }
    );
  }
}
