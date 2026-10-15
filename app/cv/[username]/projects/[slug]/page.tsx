import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCvOwner, getSectionItems } from "@/lib/cv-data";
import { slugify } from "@/lib/cv-templates";
import type { ProjectData } from "@/lib/cv";
import { RevealOnView } from "@/components/cv/motion";

async function findProject(userId: string, slug: string) {
  const { items } = await getSectionItems(userId, "projects");
  const idx = items.findIndex(
    (i) => (i.slug ?? slugify((i.data as unknown as ProjectData).title)) === slug
  );
  if (idx === -1) return null;
  return {
    item: items[idx],
    prev: idx > 0 ? items[idx - 1] : null,
    next: idx < items.length - 1 ? items[idx + 1] : null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const owner = await getCvOwner(username);
  const found = await findProject(owner.id, slug);
  if (!found) return { title: "Project not found" };
  const d = found.item.data as unknown as ProjectData;
  return {
    title: `${d.title} · ${owner.displayName}`,
    description: d.description?.slice(0, 160),
    openGraph: {
      title: d.title,
      description: d.description?.slice(0, 160),
      images: d.cover_url ? [{ url: d.cover_url }] : undefined,
    },
  };
}

// Phase B ships the route + basic case-study shell. Phase E enriches it
// with the problem/approach/outcome narrative and gallery.
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const owner = await getCvOwner(username);
  const found = await findProject(owner.id, slug);
  if (!found) notFound();

  const d = found.item.data as unknown as ProjectData;
  const base = `/cv/${owner.username}`;

  const linkFor = (it: typeof found.prev) =>
    it
      ? `${base}/projects/${
          it.slug ?? slugify((it.data as unknown as ProjectData).title)
        }`
      : null;

  return (
    <main className="cvproj">
      <Link className="cvproj-back cv-underline" href={`${base}/projects`}>
        ← All projects
      </Link>

      <RevealOnView as="header" className="cvproj-head">
        <h1>{d.title}</h1>
        {d.description && <p className="cvproj-lede">{d.description}</p>}
        {(d.tags?.length ?? 0) > 0 && (
          <div className="cvproj-tags">
            {d.tags!.map((t, i) => (
              <span key={`${t}-${i}`}>{t}</span>
            ))}
          </div>
        )}
        <div className="cvproj-links">
          {d.demo_url && (
            <a href={d.demo_url} target="_blank" rel="noopener noreferrer">
              Live site ↗
            </a>
          )}
          {d.repo_url && (
            <a href={d.repo_url} target="_blank" rel="noopener noreferrer">
              Source ↗
            </a>
          )}
        </div>
      </RevealOnView>

      {d.cover_url && (
        <RevealOnView className="cvproj-hero" delay={0.1}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.cover_url} alt={d.title} />
        </RevealOnView>
      )}

      <nav className="cvproj-nav" aria-label="Other projects">
        {linkFor(found.prev) ? (
          <Link href={linkFor(found.prev)!} className="cvproj-nav-prev">
            ← {(found.prev!.data as unknown as ProjectData).title}
          </Link>
        ) : (
          <span />
        )}
        {linkFor(found.next) ? (
          <Link href={linkFor(found.next)!} className="cvproj-nav-next">
            {(found.next!.data as unknown as ProjectData).title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
