import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasProduct } from "@/lib/products";
import type { SectionType } from "@/lib/cv";

export type CvOwner = {
  id: string;
  username: string;
  displayName: string;
};

/**
 * Resolve a username to an activated CV owner, or 404. Every CV route
 * calls this — the layout can't pass data down, so this keeps the check
 * in one place rather than repeated inline in six files.
 */
export async function getCvOwner(username: string): Promise<CvOwner> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) notFound();

  const activated = await hasProduct(profile.id, "cv");
  if (!activated) notFound();

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
  };
}

/** The cv_profiles row (hero content + design choices). */
export async function getCvProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cv_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/**
 * Visible items for one section type, ordered. Scoped per-route so
 * /experience doesn't pay for loading every project's data.
 */
export async function getSectionItems(userId: string, type: SectionType) {
  const supabase = await createClient();

  const { data: section } = await supabase
    .from("cv_sections")
    .select("id, visible, custom_title")
    .eq("user_id", userId)
    .eq("type", type)
    .maybeSingle();

  if (!section || !section.visible) return { section: null, items: [] };

  const { data: items } = await supabase
    .from("cv_items")
    .select("id, section_id, data, position, visible, slug")
    .eq("section_id", section.id)
    .eq("visible", true)
    .order("position");

  return { section, items: items ?? [] };
}
