import type { Metadata } from "next";
import Link from "next/link";
import { getCvOwner, getSectionItems } from "@/lib/cv-data";
import { slugify } from "@/lib/cv-templates";
import type { ProjectData } from "@/lib/cv";
import { RevealOnView, StaggerGroup, StaggerItem } from "@/components/cv/motion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `Projects · ${username}` };
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const owner = await getCvOwner(username);
  const { items } = await getSectionItems(owner.id, "projects");
  const base = `/cv/${owner.username}`;

  return (
    <main className="cvsec">
      <RevealOnView as="header" className="cvsec-head">
        <p className="cvsec-eyebrow">Projects</p>
        <h1 className="cvsec-title">Selected work</h1>
      </RevealOnView>

      {items.length === 0 ? (
        <p className="cvsec-empty">No projects listed yet.</p>
      ) : (
        <StaggerGroup className="cvgrid" trigger="view">
          {items.map((item) => {
            const d = item.data as unknown as ProjectData;
            const slug = item.slug ?? slugify(d.title);
            return (
              <StaggerItem key={item.id}>
              <Link
                className="cvcard cv-hover-lift"
                href={`${base}/projects/${slug}`}
              >
                <div className="cvcard-media cv-hover-zoom">
                  {d.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.cover_url} alt={d.title} />
                  ) : (
                    <span className="cvcard-ph" aria-hidden="true">▦</span>
                  )}
                </div>
                <div className="cvcard-body">
                  <h2>{d.title}</h2>
                  {d.description && <p>{d.description}</p>}
                  {(d.tags?.length ?? 0) > 0 && (
                    <div className="cvcard-tags">
                      {d.tags!.slice(0, 4).map((t, i) => (
                        <span key={`${t}-${i}`}>{t}</span>
                      ))}
                    </div>
                  )}
                  <span className="cvcard-more">View case study →</span>
                </div>
              </Link>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}
    </main>
  );
}
