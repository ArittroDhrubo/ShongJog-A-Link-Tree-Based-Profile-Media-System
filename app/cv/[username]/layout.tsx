import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasProduct } from "@/lib/products";
import { getTemplate, templateVars } from "@/lib/cv-templates";
import CvNav, { type NavItem } from "@/components/cv/CvNav";
import { CvMotionProvider, PageTransition } from "@/components/cv/motion";

// Phase B: the shell every portfolio page shares. Fetches identity +
// template once, applies the design tokens to the root, and renders the
// persistent nav — so page routes only fetch their own section data.
export default async function CvLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) notFound();

  const activated = await hasProduct(profile.id, "cv");
  if (!activated) notFound();

  const { data: cv } = await supabase
    .from("cv_profiles")
    .select("template_id, accent_color")
    .eq("user_id", profile.id)
    .maybeSingle();

  const template = getTemplate(cv?.template_id);
  const vars = templateVars(template, cv?.accent_color);

  // Only offer nav entries for sections that actually have content —
  // an empty "Projects" link on a page with no projects reads as broken.
  const { data: sections } = await supabase
    .from("cv_sections")
    .select("id, type")
    .eq("user_id", profile.id)
    .eq("visible", true);

  const { data: counts } = await supabase
    .from("cv_items")
    .select("section_id")
    .eq("user_id", profile.id)
    .eq("visible", true);

  const filled = new Set(
    (sections ?? [])
      .filter((s) =>
        (counts ?? []).some((i) => i.section_id === s.id)
      )
      .map((s) => s.type)
  );

  const base = `/cv/${profile.username}`;
  const displayName = profile.display_name ?? profile.username;

  const items: NavItem[] = [{ href: base, label: "Home" }];
  if (filled.has("experience")) {
    items.push({ href: `${base}/experience`, label: "Experience" });
  }
  if (filled.has("projects")) {
    items.push({ href: `${base}/projects`, label: "Projects" });
  }
  // "About" collects bio + skills + education + certifications.
  if (
    filled.has("skills") ||
    filled.has("education") ||
    filled.has("certifications")
  ) {
    items.push({ href: `${base}/about`, label: "About" });
  }
  if (filled.has("contact")) {
    items.push({ href: `${base}/contact`, label: "Contact" });
  }

  return (
    <div
      className={`cvt cvt-${template.scheme}`}
      style={vars as CSSProperties}
      data-template={template.id}
    >
      <CvMotionProvider style={template.motion}>
        <CvNav
          username={profile.username}
          displayName={displayName}
          items={items}
        />
        <div className="cvt-page">
          <PageTransition>{children}</PageTransition>
        </div>
      </CvMotionProvider>
      <footer className="cvt-foot" data-print-hide="true">
        <Link href="/">
          made with <b>সংযোগ</b>
        </Link>
      </footer>
    </div>
  );
}
