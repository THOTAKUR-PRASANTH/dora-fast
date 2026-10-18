
import {
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
// import { createClient } from "@/lib/supabase/server";
import { authenticateApiRequest } from "@/lib/supabase/api-auth";
import { r2, R2_BUCKET_NAME } from "@/lib/r2";

const PART_SIZE = 16 * 1024 * 1024;

export async function POST(request: Request) {
  //const supabase = await createClient();

  // 1. Verify the signed-in user.
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
  try {
    const body = await request.json();
    const { key, uploadId, parts } = body;

    // 2. Validate the request.
    if (
      typeof key !== "string" ||
      !/^uploads\/[0-9a-f-]{36}$/i.test(key) ||
      typeof uploadId !== "string" ||
      !Array.isArray(parts) ||
      parts.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid upload details." },
        { status: 400 }
      );
    }

    // 3. Confirm that this upload belongs to the signed-in user.
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("id, file_size, status")
      .eq("storage_key", key)
      .eq("upload_id", uploadId)
      .eq("owner_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (fileError) {
      console.error("File lookup failed:", fileError.message);
      return NextResponse.json(
        { error: "Could not verify upload ownership." },
        { status: 500 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "Upload not found or access denied." },
        { status: 404 }
      );
    }

    // 4. Validate the expected number and order of parts.
    const expectedParts = Math.ceil(
      Number(file.file_size) / PART_SIZE
    );

    if (
      !Number.isSafeInteger(Number(file.file_size)) ||
      expectedParts < 1 ||
      parts.length !== expectedParts
    ) {
      return NextResponse.json(
        { error: "The uploaded parts are incomplete." },
        { status: 400 }
      );
    }

    const validParts = parts.every(
      (part: { PartNumber?: unknown; ETag?: unknown }, index: number) =>
        part &&
        part.PartNumber === index + 1 &&
        typeof part.ETag === "string" &&
        part.ETag.length > 0 &&
        part.ETag.length <= 200
    );

    if (!validParts) {
      return NextResponse.json(
        { error: "Invalid or incorrectly ordered parts." },
        { status: 400 }
      );
    }

    // 5. Complete the multipart upload in R2.
    const result = await r2.send(
      new CompleteMultipartUploadCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map(
            (part: { PartNumber: number; ETag: string }) => ({
              PartNumber: part.PartNumber,
              ETag: part.ETag,
            })
          ),
        },
      })
    );

    // 6. Mark the file ready in Supabase.
    const { error: updateError } = await supabase
      .from("files")
      .update({ status: "ready" })
      .eq("id", file.id)
      .eq("owner_id", user.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("File status update failed:", updateError.message);
      return NextResponse.json(
        {
          error:
            "The file was uploaded, but its database status could not be updated. Please contact support.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      key,
      etag: result.ETag ?? null,
    });
  } catch (error) {
    console.error("Upload completion failed:", error);
    return NextResponse.json(
      { error: "Failed to complete upload." },
      { status: 500 }
    );
  }
}
