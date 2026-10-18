
import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/supabase/api-auth";
import { FILES_TABLE } from "@/components/dashboard/config";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);

  if (!auth.user || !auth.supabase) {
    return NextResponse.json(
      { error: auth.error ?? "Please log in first." },
      { status: auth.status }
    );
  }

  try {
    const { data, error } = await auth.supabase
      .from(FILES_TABLE)
      .select(
        "id, original_filename, file_size, content_type, status, created_at"
      )
      .eq("owner_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("File list lookup failed:", error.message);

      return NextResponse.json(
        { error: "Could not retrieve your files." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      files: (data ?? []).map((file) => ({
        id: file.id,
        filename: file.original_filename,
        size: file.file_size,
        contentType: file.content_type,
        status: file.status,
        createdAt: file.created_at,
      })),
    });
  } catch (error) {
    console.error("File listing failed:", error);

    return NextResponse.json(
      { error: "Unexpected error while listing files." },
      { status: 500 }
    );
  }
}
