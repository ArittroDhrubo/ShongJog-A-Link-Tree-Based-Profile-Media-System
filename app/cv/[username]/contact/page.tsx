import type { Metadata } from "next";
import { getCvOwner, getCvProfile, getSectionItems } from "@/lib/cv-data";
import CvActions from "@/components/CvActions";
import type { ContactData } from "@/lib/cv";
import { RevealOnView, StaggerGroup, StaggerItem } from "@/components/cv/motion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `Contact · ${username}` };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const owner = await getCvOwner(username);
  const cv = await getCvProfile(owner.id);
  const { items } = await getSectionItems(owner.id, "contact");
  const contact = (items[0]?.data ?? {}) as ContactData;

  const rows: { label: string; value: string; href: string }[] = [];
  if (contact.email)
    rows.push({ label: "Email", value: contact.email, href: `mailto:${contact.email}` });
  if (contact.phone)
    rows.push({ label: "Phone", value: contact.phone, href: `tel:${contact.phone}` });
  if (contact.linkedin)
    rows.push({ label: "LinkedIn", value: contact.linkedin, href: contact.linkedin });
  if (contact.github)
    rows.push({ label: "GitHub", value: contact.github, href: contact.github });
  if (contact.website)
    rows.push({ label: "Website", value: contact.website, href: contact.website });

  return (
    <main className="cvsec">
      <RevealOnView as="header" className="cvsec-head">
        <p className="cvsec-eyebrow">Contact</p>
        <h1 className="cvsec-title">Get in touch</h1>
      </RevealOnView>

      {rows.length === 0 ? (
        <p className="cvsec-empty">No contact details listed yet.</p>
      ) : (
        <StaggerGroup className="cvcontact" trigger="view">
          {rows.map((r) => (
            <StaggerItem key={r.label}>
            <a
              className="cvcontact-row"
              href={r.href}
              {...(r.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <span className="cvcontact-label">{r.label}</span>
              <span className="cvcontact-value">{r.value}</span>
              <span className="cvcontact-arrow" aria-hidden="true">→</span>
            </a>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      <CvActions
        name={owner.displayName}
        tagline={cv?.tagline ?? null}
        location={cv?.location ?? null}
        contact={contact}
        cvUrl={`https://shohojog.vercel.app/cv/${owner.username}`}
        printHref={`/cv/${owner.username}/print`}
      />
    </main>
  );
}
