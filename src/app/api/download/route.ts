
import {
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { r2, R2_BUCKET_NAME } from "@/lib/r2";
// import { createClient } from "@/lib/supabase/server";
import { authenticateApiRequest } from "@/lib/supabase/api-auth";

function getContentType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();

  const types: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    zip: "application/zip",
    csv: "text/csv",
    json: "application/json",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
  };

  return types[extension ?? ""] ?? "application/octet-stream";
}

export async function POST(request: Request) {
  try {
    // // 1. Verify the signed-in user.
    // const supabase = await createClient();
    // const {
    //   data: { user },
    //   error: authError,
    // } = await supabase.auth.getUser();

    // if (authError || !user) {
    //   return NextResponse.json(
    //     { error: "Unauthorized. Please log in." },
    //     { status: 401 }
    //   );
    // }

        const auth = await authenticateApiRequest(request);

    if (!auth.user || !auth.supabase) {
      return NextResponse.json(
        { error: auth.error ?? "Unauthorized. Please log in." },
        { status: auth.status }
      );
    }

    const { supabase, user } = auth;

    // 2. Validate the storage key.
    const body = await request.json();
    const { key } = body;

    if (
      typeof key !== "string" ||
      !/^uploads\/[0-9a-f-]{36}$/i.test(key)
    ) {
      return NextResponse.json(
        { error: "Invalid file key." },
        { status: 400 }
      );
    }

    // 3. Confirm this file belongs to the current user.
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("original_filename, content_type, status")
      .eq("storage_key", key)
      .eq("owner_id", user.id)
      .eq("status", "ready")
      .maybeSingle();

    if (fileError) {
      console.error("File ownership lookup failed:", fileError.message);
      return NextResponse.json(
        { error: "Could not verify file access." },
        { status: 500 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "File not found or access denied." },
        { status: 404 }
      );
    }

    // 4. Read the R2 object's metadata.
    const object = await r2.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    // Use the filename stored in Supabase, not client input or R2 metadata.
    const filename = file.original_filename;

    const fallback = filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\;]/g, "_");

    const disposition =
      `attachment; filename="${fallback}"; ` +
      `filename*=UTF-8''${encodeURIComponent(filename)}`;

    // Prefer the recorded content type, with an extension fallback.
    const contentType =
      file.content_type &&
      file.content_type !== "application/octet-stream"
        ? file.content_type
        : getContentType(filename);

    // 5. Create a short-lived download URL.
    const downloadUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ResponseContentDisposition: disposition,
        ResponseContentType: contentType,
      }),
      { expiresIn: 300 }
    );

    return NextResponse.json({
      success: true,
      filename,
      downloadUrl,
      expiresInSeconds: 300,
    });
  } catch (error) {
    console.error("Download URL generation failed:", error);

    return NextResponse.json(
      { error: "Could not generate the download URL." },
      { status: 500 }
    );
  }
}
