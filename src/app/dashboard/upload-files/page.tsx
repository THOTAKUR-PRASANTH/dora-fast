import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UploadFiles from "@/components/dashboard/upload-files";

export default async function UploadFilesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/auth?mode=login");
  }

  return <UploadFiles />;
}
