
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { r2, R2_BUCKET_NAME } from "@/lib/r2";



export async function GET() {
  try {
    await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        MaxKeys: 1,
      })
    );

    return NextResponse.json({
      success: true,
      message: "Cloudflare R2 connected successfully!",
      bucket: R2_BUCKET_NAME,
    });
  } catch (error) {
    console.error("R2 connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not connect to Cloudflare R2.",
      },
      { status: 500 }
    );
  }
}

