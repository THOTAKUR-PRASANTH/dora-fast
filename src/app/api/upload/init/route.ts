
import {
  CreateMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET_NAME } from "@/lib/r2";

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;
const PART_SIZE = 16 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Please log in first." },
      { status: 401 }
    );
  }

  let key: string | undefined;
  let uploadId: string | undefined;

  try {
    const body = await request.json();
    const { filename, size, contentType } = body;

    if (
      typeof filename !== "string" ||
      !filename.trim() ||
      filename.length > 200 ||
      /[/\\\r\n\0]/.test(filename) ||
      typeof size !== "number" ||
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { error: "Invalid filename or file size. Maximum is 5 GiB." },
        { status: 400 }
      );
    }

    const safeContentType =
      typeof contentType === "string" &&
      contentType.length <= 150 &&
      /^[\w.+-]+\/[\w.+-]+$/.test(contentType)
        ? contentType
        : "application/octet-stream";

    key = `uploads/${randomUUID()}`;

    const created = await r2.send(
      new CreateMultipartUploadCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: safeContentType,
        Metadata: {
          originalname: filename.trim(),
        },
      })
    );

    uploadId = created.UploadId;

    if (!uploadId) {
      throw new Error("R2 did not return an upload ID.");
    }

    const { error: dbError } = await supabase
      .from("files")
      .insert({
        owner_id: user.id,
        storage_key: key,
        upload_id: uploadId,
        original_filename: filename.trim(),
        file_size: size,
        content_type: safeContentType,
        status: "pending",
      });

    if (dbError) {
      throw new Error("Could not save upload metadata.");
    }

    return NextResponse.json({
      key,
      uploadId,
      partSize: PART_SIZE,
    });
  } catch (error) {
    if (key && uploadId) {
      try {
        await r2.send(
          new AbortMultipartUploadCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            UploadId: uploadId,
          })
        );
      } catch (cleanupError) {
        console.error("Multipart cleanup failed:", cleanupError);
      }
    }

    console.error("Upload initialization failed:", error);

    return NextResponse.json(
      { error: "Could not initialize the upload." },
      { status: 500 }
    );
  }
}
