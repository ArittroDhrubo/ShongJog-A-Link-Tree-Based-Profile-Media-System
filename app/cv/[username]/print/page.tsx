import type { Metadata } from "next";
import { getCvOwner, getCvProfile, getSectionItems } from "@/lib/cv-data";
import PrintActions from "@/components/cv/PrintActions";
import {
  formatDateRange,
  type ExperienceData,
  type ProjectData,
  type EducationData,
  type SkillData,
  type CertificationData,
  type ContactData,
} from "@/lib/cv";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `CV · ${username}`, robots: { index: false } };
}

// Phase B: the PDF is now its own route rather than a mode of the
// scrolling page — correct now that the site itself is multi-page.
// Single source of truth is preserved: this page IS what prints.
export default async function CvPrintPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const owner = await getCvOwner(username);
  const cv = await getCvProfile(owner.id);

  const [
    { items: experience },
    { items: projects },
    { items: skills },
    { items: education },
    { items: certs },
    { items: contactItems },
  ] = await Promise.all([
    getSectionItems(owner.id, "experience"),
    getSectionItems(owner.id, "projects"),
    getSectionItems(owner.id, "skills"),
    getSectionItems(owner.id, "education"),
    getSectionItems(owner.id, "certifications"),
    getSectionItems(owner.id, "contact"),
  ]);
  const contact = (contactItems[0]?.data ?? {}) as ContactData;

  const contactLine = [
    contact.email,
    contact.phone,
    cv?.location,
    contact.linkedin,
    contact.github,
    contact.website,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="cvpr">
      <PrintActions />

      <article className="cvpr-doc">
        <header className="cvpr-head">
          <h1>{owner.displayName}</h1>
          {cv?.tagline && <p className="cvpr-tagline">{cv.tagline}</p>}
          {contactLine && <p className="cvpr-contact">{contactLine}</p>}
          {cv?.bio && <p className="cvpr-bio">{cv.bio}</p>}
        </header>

        {experience.length > 0 && (
          <section className="cvpr-sec">
            <h2>Experience</h2>
            {experience.map((it) => {
              const d = it.data as unknown as ExperienceData;
              return (
                <div className="cvpr-entry" key={it.id}>
                  <div className="cvpr-when">
                    {formatDateRange(d.start_date, d.end_date, d.current)}
                  </div>
                  <div>
                    <p className="cvpr-role">{d.role}</p>
                    <p className="cvpr-org">
                      {d.company}
                      {d.location ? ` · ${d.location}` : ""}
                    </p>
                    {d.description && <p className="cvpr-desc">{d.description}</p>}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {education.length > 0 && (
          <section className="cvpr-sec">
            <h2>Education</h2>
            {education.map((it) => {
              const d = it.data as unknown as EducationData;
              return (
                <div className="cvpr-entry" key={it.id}>
                  <div className="cvpr-when">
                    {formatDateRange(d.start_date, d.end_date, d.current)}
                  </div>
                  <div>
                    <p className="cvpr-role">{d.degree || d.institution}</p>
                    <p className="cvpr-org">
                      {d.degree ? d.institution : d.field}
                      {d.gpa ? ` · GPA ${d.gpa}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {projects.length > 0 && (
          <section className="cvpr-sec">
            <h2>Projects</h2>
            {projects.map((it) => {
              const d = it.data as unknown as ProjectData;
              return (
                <div className="cvpr-proj" key={it.id}>
                  <p className="cvpr-role">{d.title}</p>
                  {d.description && <p className="cvpr-desc">{d.description}</p>}
                  {(d.tags?.length ?? 0) > 0 && (
                    <p className="cvpr-tags">{d.tags!.join(" · ")}</p>
                  )}
                  {(d.demo_url || d.repo_url) && (
                    <p className="cvpr-links">
                      {[d.demo_url, d.repo_url].filter(Boolean).join("  ·  ")}
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {skills.length > 0 && (
          <section className="cvpr-sec">
            <h2>Skills</h2>
            <p className="cvpr-skills">
              {skills
                .map((it) => (it.data as unknown as SkillData).name)
                .join("  ·  ")}
            </p>
          </section>
        )}

        {certs.length > 0 && (
          <section className="cvpr-sec">
            <h2>Certifications</h2>
            {certs.map((it) => {
              const d = it.data as unknown as CertificationData;
              return (
                <p className="cvpr-cert" key={it.id}>
                  <b>{d.title}</b>
                  {[d.issuer, d.date].filter(Boolean).length
                    ? ` — ${[d.issuer, d.date].filter(Boolean).join(", ")}`
                    : ""}
                </p>
              );
            })}
          </section>
        )}

        <footer className="cvpr-foot">
          shohojog.vercel.app/cv/{owner.username}
        </footer>
      </article>
    </div>
  );
}
