import type { Metadata } from "next";
import { getCvOwner, getSectionItems } from "@/lib/cv-data";
import { formatDateRange, type ExperienceData } from "@/lib/cv";
import { RevealOnView } from "@/components/cv/motion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `Experience · ${username}` };
}

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const owner = await getCvOwner(username);
  const { items } = await getSectionItems(owner.id, "experience");

  return (
    <main className="cvsec">
      <RevealOnView as="header" className="cvsec-head">
        <p className="cvsec-eyebrow">Experience</p>
        <h1 className="cvsec-title">Where I&apos;ve worked</h1>
      </RevealOnView>

      {items.length === 0 ? (
        <p className="cvsec-empty">No roles listed yet.</p>
      ) : (
        <div className="cvtl">
          {items.map((item) => {
            const d = item.data as unknown as ExperienceData;
            return (
              <RevealOnView as="article" className="cvtl-item" key={item.id}>
                <div className="cvtl-when">
                  {formatDateRange(d.start_date, d.end_date, d.current)}
                </div>
                <div className="cvtl-body">
                  <h2>{d.role}</h2>
                  <p className="cvtl-org">
                    {d.company}
                    {d.location ? ` · ${d.location}` : ""}
                  </p>
                  {d.description && <p className="cvtl-desc">{d.description}</p>}
                </div>
              </RevealOnView>
            );
          })}
        </div>
      )}
    </main>
  );
}
