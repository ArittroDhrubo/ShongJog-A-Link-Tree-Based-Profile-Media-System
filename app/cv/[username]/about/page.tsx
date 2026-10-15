import type { Metadata } from "next";
import { getCvOwner, getCvProfile, getSectionItems } from "@/lib/cv-data";
import { RevealOnView } from "@/components/cv/motion";
import {
  formatDateRange,
  type SkillData,
  type EducationData,
  type CertificationData,
} from "@/lib/cv";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `About · ${username}` };
}

// Phase B consolidates bio + skills + education + certifications into one
// coherent About page, as the multi-page architecture intends.
export default async function AboutPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const owner = await getCvOwner(username);
  const cv = await getCvProfile(owner.id);

  const [{ items: skills }, { items: education }, { items: certs }] =
    await Promise.all([
      getSectionItems(owner.id, "skills"),
      getSectionItems(owner.id, "education"),
      getSectionItems(owner.id, "certifications"),
    ]);

  // Group skills by category when the user set one.
  const grouped = new Map<string, SkillData[]>();
  for (const it of skills) {
    const d = it.data as unknown as SkillData;
    const key = d.category?.trim() || "";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  }

  return (
    <main className="cvsec">
      <RevealOnView as="header" className="cvsec-head">
        <p className="cvsec-eyebrow">About</p>
        <h1 className="cvsec-title">{owner.displayName}</h1>
      </RevealOnView>

      {cv?.bio && (
        <RevealOnView as="p" className="cvabout-bio">
          {cv.bio}
        </RevealOnView>
      )}

      {skills.length > 0 && (
        <RevealOnView as="section" className="cvabout-block">
          <h2 className="cvabout-h2">Skills</h2>
          {[...grouped.entries()].map(([cat, list]) => (
            <div className="cvabout-skillgroup" key={cat || "_"}>
              {cat && <p className="cvabout-cat">{cat}</p>}
              <div className="cvskills">
                {list.map((d, i) => (
                  <span className="cvskill" key={`${d.name}-${i}`}>
                    {d.name}
                    <span className="cvskill-dots" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <i key={n} className={n <= (d.level ?? 3) ? "on" : ""} />
                      ))}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </RevealOnView>
      )}

      {education.length > 0 && (
        <RevealOnView as="section" className="cvabout-block">
          <h2 className="cvabout-h2">Education</h2>
          <div className="cvtl">
            {education.map((it) => {
              const d = it.data as unknown as EducationData;
              return (
                <article className="cvtl-item" key={it.id}>
                  <div className="cvtl-when">
                    {formatDateRange(d.start_date, d.end_date, d.current)}
                  </div>
                  <div className="cvtl-body">
                    <h3>{d.degree || d.institution}</h3>
                    <p className="cvtl-org">
                      {d.degree ? d.institution : d.field}
                      {d.gpa ? ` · GPA ${d.gpa}` : ""}
                    </p>
                    {d.description && <p className="cvtl-desc">{d.description}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </RevealOnView>
      )}

      {certs.length > 0 && (
        <RevealOnView as="section" className="cvabout-block">
          <h2 className="cvabout-h2">Certifications</h2>
          <div className="cvcerts">
            {certs.map((it) => {
              const d = it.data as unknown as CertificationData;
              return (
                <div className="cvcert" key={it.id}>
                  <p className="cvcert-title">{d.title}</p>
                  <p className="cvcert-meta">
                    {[d.issuer, d.date].filter(Boolean).join(" · ")}
                  </p>
                  {d.credential_url && (
                    <a
                      href={d.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Verify ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </RevealOnView>
      )}
    </main>
  );
}
