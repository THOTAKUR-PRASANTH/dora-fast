
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
// import { createClient } from "@/lib/supabase/server";
import { authenticateApiRequest } from "@/lib/supabase/api-auth";
import { r2, R2_BUCKET_NAME } from "@/lib/r2";

export async function POST(request: Request) {
  //const supabase = await createClient();

  // const {
  //   data: { user },
  // } = await supabase.auth.getUser();

  // if (!user) {
  //   return NextResponse.json(
  //     { error: "Please log in first." },
  //     { status: 401 }
  //   );
  // }
    const auth = await authenticateApiRequest(request);

  if (!auth.user || !auth.supabase) {
    return NextResponse.json(
      { error: auth.error ?? "Please log in first." },
      { status: auth.status }
    );
  }

  const { supabase, user } = auth;
  try {
    const body = await request.json();
    const { key, uploadId, partNumber } = body;

    if (
      typeof key !== "string" ||
      !/^uploads\/[0-9a-f-]{36}$/.test(key) ||
      typeof uploadId !== "string" ||
      uploadId.length < 20 ||
      uploadId.length > 2000 ||
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > 10000
    ) {
      return NextResponse.json(
        { error: "Invalid upload parameters." },
        { status: 400 }
      );
    }

    const { data: file, error } = await supabase
      .from("files")
      .select("id")
      .eq("storage_key", key)
      .eq("upload_id", uploadId)
      .eq("owner_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (error || !file) {
      return NextResponse.json(
        { error: "Upload not found or access denied." },
        { status: 404 }
      );
    }

    const url = await getSignedUrl(
      r2,
      new UploadPartCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      }),
      { expiresIn: 900 }
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Part URL generation failed:", error);

    return NextResponse.json(
      { error: "Could not generate upload URL." },
      { status: 500 }
    );
  }
}
