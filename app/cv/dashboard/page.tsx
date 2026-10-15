import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasProduct } from "@/lib/products";
import CvDashboardClient from "./CvDashboardClient";

// Server shell: auth is enforced by middleware, this adds the
// product-activation gate and hands identity to the client editor.
export default async function CvDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Not activated yet? Send them through the CV onboarding rather than
  // showing an empty editor.
  const activated = await hasProduct(user.id, "cv");
  if (!activated) redirect("/cv/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <CvDashboardClient
      username={profile.username}
      displayName={profile.display_name ?? profile.username}
    />
  );
}
