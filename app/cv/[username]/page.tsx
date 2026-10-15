import type { Metadata } from "next";
import Link from "next/link";
import { getCvOwner, getCvProfile } from "@/lib/cv-data";
import { getTemplate } from "@/lib/cv-templates";
import CvActions from "@/components/CvActions";
import { StaggerGroup, StaggerItem, RevealOnView } from "@/components/cv/motion";
import { createClient } from "@/lib/supabase/server";
import type { ContactData } from "@/lib/cv";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) return { title: "CV not found · সংযোগ" };

  const { data: cv } = await supabase
    .from("cv_profiles")
    .select("tagline, bio, hero_photo_url")
    .eq("user_id", profile.id)
    .maybeSingle();

  const name = profile.display_name ?? profile.username;
  const title = cv?.tagline ? `${name} — ${cv.tagline}` : `${name} · CV`;
  const description =
    cv?.bio?.slice(0, 160) || cv?.tagline || `${name}'s portfolio and CV.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/cv/${profile.username}`,
      images: cv?.hero_photo_url ? [{ url: cv.hero_photo_url }] : undefined,
    },
    twitter: {
      card: cv?.hero_photo_url ? "summary_large_image" : "summary",
      title,
      description,
      images: cv?.hero_photo_url ? [cv.hero_photo_url] : undefined,
    },
  };
}

// Phase B: the hero is now its own page — it no longer competes with six
// stacked sections, so the template can actually compose it.
export default async function CvHomePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const owner = await getCvOwner(username);
  const cv = await getCvProfile(owner.id);
  const template = getTemplate(cv?.template_id);

  const supabase = await createClient();
  const { data: contactSection } = await supabase
    .from("cv_sections")
    .select("id")
    .eq("user_id", owner.id)
    .eq("type", "contact")
    .maybeSingle();
  let contact: ContactData = {};
  if (contactSection) {
    const { data: c } = await supabase
      .from("cv_items")
      .select("data")
      .eq("section_id", contactSection.id)
      .maybeSingle();
    if (c?.data) contact = c.data as ContactData;
  }

  const base = `/cv/${owner.username}`;
  const ctaHref =
    cv?.cta_type === "email" && cv?.cta_destination
      ? `mailto:${cv.cta_destination}`
      : cv?.cta_type === "link" && cv?.cta_destination
      ? cv.cta_destination
      : cv?.cta_type === "scroll"
      ? `${base}/contact`
      : null;

  return (
    <main className={`cvh cvh-${template.heroLayout}`}>
      <div className="cvh-inner">
        <StaggerGroup className="cvh-text" trigger="mount">
          <StaggerItem as="p" className="cvh-eyebrow">
            Portfolio
          </StaggerItem>
          <StaggerItem as="h1" className="cvh-name">
            {owner.displayName}
          </StaggerItem>
          {cv?.tagline && (
            <StaggerItem as="p" className="cvh-tagline">
              {cv.tagline}
            </StaggerItem>
          )}
          {cv?.location && (
            <StaggerItem as="p" className="cvh-location">
              {cv.location}
            </StaggerItem>
          )}
          {cv?.bio && (
            <StaggerItem as="p" className="cvh-bio">
              {cv.bio}
            </StaggerItem>
          )}

          <StaggerItem className="cvh-cta-row">
            {cv?.cta_label && ctaHref && (
              <a
                className="cvh-cta"
                data-print-hide="true"
                href={ctaHref}
                {...(cv.cta_type === "link"
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {cv.cta_label}
              </a>
            )}
            <Link className="cvh-cta-ghost cv-underline" href={`${base}/projects`}>
              View work →
            </Link>
          </StaggerItem>

          <StaggerItem>
            <CvActions
            name={owner.displayName}
            tagline={cv?.tagline ?? null}
            location={cv?.location ?? null}
            contact={contact}
            cvUrl={`https://shohojog.vercel.app${base}`}
              printHref={`${base}/print`}
            />
          </StaggerItem>
        </StaggerGroup>

        {cv?.hero_photo_url && (
          <RevealOnView className="cvh-media" delay={0.15}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cv.hero_photo_url} alt={owner.displayName} />
          </RevealOnView>
        )}
      </div>
    </main>
  );
}
