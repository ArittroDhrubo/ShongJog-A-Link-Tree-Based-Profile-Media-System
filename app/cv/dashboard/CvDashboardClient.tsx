"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandLink from "@/components/BrandLink";
import ThemeToggle from "@/components/ThemeToggle";
import ProductSwitcher from "@/components/ProductSwitcher";
import {
  CV_TEMPLATES,
  CV_ACCENT_OVERRIDES,
  getTemplate,
  DEFAULT_TEMPLATE_ID,
} from "@/lib/cv-templates";
import {
  SECTION_META,
  getCvWallpaper,
  getCvFontFamily,
  normalizeCvAccent,
  formatDateRange,
  ALL_SECTIONS,
  type CvSection,
  type CvItem,
  type ExperienceData,
  type ProjectData,
  type EducationData,
  type SkillData,
  type CertificationData,
  type ContactData,
} from "@/lib/cv";

type Loaded = {
  tagline: string;
  bio: string;
  heroPhoto: string;
  location: string;
  ctaLabel: string;
  ctaType: string;
  ctaDest: string;
  accent: string;
  font: string;
  wallpaper: string;
};

export default function CvDashboardClient({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- about / hero ----
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [heroPhoto, setHeroPhoto] = useState("");
  const [location, setLocation] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaType, setCtaType] = useState("email");
  const [ctaDest, setCtaDest] = useState("");
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  // ---- design ----
  const [accent, setAccent] = useState("#f0a83c");
  const [font, setFont] = useState("system");
  const [wallpaper, setWallpaper] = useState("slate");

  // ---- sections + items ----
  const [sections, setSections] = useState<CvSection[]>([]);
  const [items, setItems] = useState<CvItem[]>([]);

  // ---- entry forms ----
  const [showExpForm, setShowExpForm] = useState(false);
  const [expDraft, setExpDraft] = useState<ExperienceData>({
    role: "",
    company: "",
  });
  const [showProjForm, setShowProjForm] = useState(false);
  const [projDraft, setProjDraft] = useState<ProjectData>({ title: "" });
  const [tagInput, setTagInput] = useState("");
  const projImgInput = useRef<HTMLInputElement>(null);
  const [uploadingProj, setUploadingProj] = useState(false);

  // ---- phase 5 sections ----
  const [showEduForm, setShowEduForm] = useState(false);
  const [eduDraft, setEduDraft] = useState<EducationData>({ institution: "" });
  const [skillDraft, setSkillDraft] = useState<SkillData>({ name: "", level: 3 });
  const [showCertForm, setShowCertForm] = useState(false);
  const [certDraft, setCertDraft] = useState<CertificationData>({ title: "" });
  const [contact, setContact] = useState<ContactData>({});
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  // Phase A: template replaces the à-la-carte font/wallpaper pickers.
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);

  function notify(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);

    const { data: cv } = await supabase
      .from("cv_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (cv) {
      setTagline(cv.tagline ?? "");
      setBio(cv.bio ?? "");
      setHeroPhoto(cv.hero_photo_url ?? "");
      setLocation(cv.location ?? "");
      setCtaLabel(cv.cta_label ?? "");
      setCtaType(cv.cta_type ?? "email");
      setCtaDest(cv.cta_destination ?? "");
      setAccent(normalizeCvAccent(cv.accent_color));
      setFont(cv.font_choice ?? "system");
      setWallpaper(getCvWallpaper(cv.wallpaper_preset).id);
      setDensity(cv.density === "compact" ? "compact" : "comfortable");
      setTemplateId(getTemplate(cv.template_id).id);
    }

    // Ensure every section type exists (older accounts only had 3).
    await supabase.from("cv_sections").upsert(
      ALL_SECTIONS.map((type, i) => ({ user_id: user.id, type, position: i })),
      { onConflict: "user_id,type", ignoreDuplicates: true }
    );

    const { data: secs } = await supabase
      .from("cv_sections")
      .select("id, type, position, visible, custom_title")
      .eq("user_id", user.id)
      .order("position");
    setSections((secs ?? []) as CvSection[]);

    const { data: its } = await supabase
      .from("cv_items")
      .select("id, section_id, data, position, visible")
      .eq("user_id", user.id)
      .order("position");
    setItems((its ?? []) as CvItem[]);

    // Contact is a single item; hydrate the form from it if present.
    const contactSec = (secs ?? []).find((x) => x.type === "contact");
    if (contactSec) {
      const c = (its ?? []).find((i) => i.section_id === contactSec.id);
      if (c) setContact(c.data as ContactData);
    }

    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sectionOf = (type: string) => sections.find((s) => s.type === type);
  const itemsOf = (type: string) => {
    const sec = sectionOf(type);
    if (!sec) return [];
    return items
      .filter((i) => i.section_id === sec.id)
      .sort((a, b) => a.position - b.position);
  };

  // ---- saving ----
  async function saveCv(patch: Record<string, unknown>) {
    if (!userId) return;
    const { error } = await supabase
      .from("cv_profiles")
      .upsert({ user_id: userId, ...patch });
    if (error) notify("Couldn't save — please try again.");
  }

  async function saveAbout() {
    await saveCv({
      tagline: tagline.trim() || null,
      bio: bio.trim() || null,
      location: location.trim() || null,
      cta_label: ctaLabel.trim() || null,
      cta_type: ctaLabel.trim() ? ctaType : null,
      cta_destination: ctaDest.trim() || null,
    });
    notify("About saved");
  }

  async function uploadHeroPhoto(file: File) {
    if (!userId) return;
    if (file.size > 8 * 1024 * 1024) {
      notify("Choose an image under 8 MB.");
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    // Storage RLS requires the FIRST folder to be the user id.
    const path = `${userId}/cv-hero-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600" });
    if (error) {
      notify("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await saveCv({ hero_photo_url: data.publicUrl });
    setHeroPhoto(data.publicUrl);
    setUploading(false);
    notify("Photo updated");
  }

  async function removeHeroPhoto() {
    await saveCv({ hero_photo_url: null });
    setHeroPhoto("");
    notify("Photo removed");
  }

  async function saveDesign(patch: Record<string, string>) {
    if (patch.accent_color) setAccent(patch.accent_color);
    if (patch.font_choice) setFont(patch.font_choice);
    if (patch.wallpaper_preset) setWallpaper(patch.wallpaper_preset);
    if (patch.template_id) setTemplateId(patch.template_id);
    await saveCv(patch);
  }

  // ---- generic item CRUD ----
  async function addItem(type: string, data: Record<string, unknown>) {
    if (!userId) return;
    const sec = sectionOf(type);
    if (!sec) return;
    const existing = itemsOf(type);
    const { data: row, error } = await supabase
      .from("cv_items")
      .insert({
        section_id: sec.id,
        user_id: userId,
        data,
        position: existing.length,
      })
      .select()
      .single();
    if (error || !row) {
      notify("Couldn't add that — please try again.");
      return;
    }
    setItems((cur) => [...cur, row as CvItem]);
    notify("Added");
  }

  async function deleteItem(id: string) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    const { error } = await supabase.from("cv_items").delete().eq("id", id);
    if (error) {
      setItems(prev);
      notify("Couldn't delete — please try again.");
      return;
    }
    notify("Deleted");
  }

  async function toggleItem(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const next = !target.visible;
    const prev = items;
    setItems((cur) =>
      cur.map((i) => (i.id === id ? { ...i, visible: next } : i))
    );
    const { error } = await supabase
      .from("cv_items")
      .update({ visible: next })
      .eq("id", id);
    if (error) {
      setItems(prev);
      notify("Couldn't update — please try again.");
    }
  }

  async function moveItem(type: string, idx: number, dir: -1 | 1) {
    const list = itemsOf(type);
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const reordered = [...list];
    [reordered[idx], reordered[j]] = [reordered[j], reordered[idx]];
    setItems((cur) =>
      cur.map((i) => {
        const at = reordered.findIndex((r) => r.id === i.id);
        return at === -1 ? i : { ...i, position: at };
      })
    );
    await Promise.all(
      reordered.map((it, i) =>
        supabase.from("cv_items").update({ position: i }).eq("id", it.id)
      )
    );
  }

  // ---- experience form ----
  async function submitExperience() {
    if (!expDraft.role.trim() || !expDraft.company.trim()) {
      notify("Role and company are required.");
      return;
    }
    await addItem("experience", {
      ...expDraft,
      role: expDraft.role.trim(),
      company: expDraft.company.trim(),
      end_date: expDraft.current ? "" : expDraft.end_date ?? "",
    });
    setExpDraft({ role: "", company: "" });
    setShowExpForm(false);
  }

  // ---- project form ----
  async function uploadProjectImage(file: File) {
    if (!userId) return;
    if (file.size > 8 * 1024 * 1024) {
      notify("Choose an image under 8 MB.");
      return;
    }
    setUploadingProj(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/cv-project-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600" });
    if (error) {
      notify("Upload failed: " + error.message);
      setUploadingProj(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setProjDraft((d) => ({ ...d, cover_url: data.publicUrl }));
    setUploadingProj(false);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    setProjDraft((d) => ({ ...d, tags: [...(d.tags ?? []), t] }));
    setTagInput("");
  }

  async function submitProject() {
    if (!projDraft.title.trim()) {
      notify("Give the project a title.");
      return;
    }
    await addItem("projects", { ...projDraft, title: projDraft.title.trim() });
    setProjDraft({ title: "" });
    setTagInput("");
    setShowProjForm(false);
  }

  // ---- education ----
  async function submitEducation() {
    if (!eduDraft.institution.trim()) {
      notify("Institution is required.");
      return;
    }
    await addItem("education", {
      ...eduDraft,
      institution: eduDraft.institution.trim(),
      end_date: eduDraft.current ? "" : eduDraft.end_date ?? "",
    });
    setEduDraft({ institution: "" });
    setShowEduForm(false);
  }

  // ---- skills ----
  async function submitSkill() {
    if (!skillDraft.name.trim()) return;
    await addItem("skills", { ...skillDraft, name: skillDraft.name.trim() });
    setSkillDraft({ name: "", level: skillDraft.level });
  }

  // ---- certifications ----
  async function submitCert() {
    if (!certDraft.title.trim()) {
      notify("Give the certification a title.");
      return;
    }
    await addItem("certifications", {
      ...certDraft,
      title: certDraft.title.trim(),
    });
    setCertDraft({ title: "" });
    setShowCertForm(false);
  }

  // ---- contact (single item, upserted) ----
  async function saveContact() {
    if (!userId) return;
    const sec = sectionOf("contact");
    if (!sec) return;
    const existing = itemsOf("contact")[0];
    if (existing) {
      const { error } = await supabase
        .from("cv_items")
        .update({ data: contact })
        .eq("id", existing.id);
      if (error) {
        notify("Couldn't save contact — please try again.");
        return;
      }
      setItems((cur) =>
        cur.map((i) =>
          i.id === existing.id ? { ...i, data: contact as Record<string, unknown> } : i
        )
      );
    } else {
      const { data: row, error } = await supabase
        .from("cv_items")
        .insert({ section_id: sec.id, user_id: userId, data: contact, position: 0 })
        .select()
        .single();
      if (error || !row) {
        notify("Couldn't save contact — please try again.");
        return;
      }
      setItems((cur) => [...cur, row as CvItem]);
    }
    notify("Contact saved");
  }

  // ---- derived ----
  const experience = itemsOf("experience");
  const projects = itemsOf("projects");
  const education = itemsOf("education");
  const skills = itemsOf("skills");
  const certs = itemsOf("certifications");
  const pvExperience = experience.filter((i) => i.visible);
  const pvProjects = projects.filter((i) => i.visible);
  const wp = getCvWallpaper(wallpaper);
  const fontFamily = getCvFontFamily(font);

  const completeness = Math.round(
    ([
      Boolean(heroPhoto),
      Boolean(tagline.trim()),
      Boolean(bio.trim()),
      experience.length > 0,
      projects.length > 0,
      skills.length > 0,
      Object.values(contact).some(Boolean),
    ].filter(Boolean).length /
      7) *
      100
  );

  return (
    <div className="db">
      <header className="db-topbar">
        <BrandLink className="db-brand" />
        <div className="db-topbar-actions">
          {/* Reaching this component means the CV product is active —
              app/cv/dashboard/page.tsx redirects to onboarding otherwise. */}
          <ProductSwitcher current="cv" hasCv />
          <ThemeToggle />
          <a className="btn ghost small" href={`/cv/${username}`} target="_blank">
            View CV
          </a>
        </div>
      </header>

      <nav className="db-subnav" aria-label="Portfolio sections">
        <a href="#cv-about">About</a>
        <a href="#cv-experience">Experience</a>
        <a href="#cv-projects">Projects</a>
        <a href="#cv-skills">Skills</a>
        <a href="#cv-education">Education</a>
        <a href="#cv-certs">Certs</a>
        <a href="#cv-contact">Contact</a>
        <a href="#cv-design">Design</a>
      </nav>

      <div className="db-layout">
        <main className="db-main">
          {!loaded ? (
            <div className="db-skeleton">
              <div className="sk sk-hero" />
              <div className="sk sk-card" />
              <div className="sk sk-card" />
            </div>
          ) : (
            <>
              {/* ---- hero stats ---- */}
              <section className="db-hero">
                <div className="db-hero-avatar">
                  {heroPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroPhoto} alt="" />
                  ) : (
                    <span>{(displayName || username)[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="db-hero-meta">
                  <h1>{displayName || username}</h1>
                  <p className="db-hero-handle">/cv/{username}</p>
                  {tagline && <p className="db-hero-bio">{tagline}</p>}
                </div>
                <div className="db-stats">
                  <div className="db-stat">
                    <strong>{experience.length}</strong>
                    <span>roles</span>
                  </div>
                  <div className="db-stat">
                    <strong>{projects.length}</strong>
                    <span>projects</span>
                  </div>
                  <div className="db-stat">
                    <strong>{completeness}%</strong>
                    <span>complete</span>
                  </div>
                </div>
              </section>

              {/* ---- ABOUT ---- */}
              <section className="card db-card" id="cv-about">
                <div className="db-card-head">
                  <p className="db-eyebrow">{SECTION_META.about.label}</p>
                  <h2>Your introduction</h2>
                </div>

                <div className="upload-row">
                  <div className="upload-preview avatar-preview">
                    {heroPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroPhoto} alt="Hero" />
                    ) : (
                      <span>{(displayName || username)[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="upload-meta">
                    <div className="db-upload-title">Photo</div>
                    <div className="hint">Shown at the top of your CV.</div>
                    <div className="db-upload-actions">
                      <button
                        className="btn small"
                        onClick={() => photoInput.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? "Uploading…" : "Upload photo"}
                      </button>
                      {heroPhoto && (
                        <button
                          className="btn danger small"
                          onClick={removeHeroPhoto}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      ref={photoInput}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadHeroPhoto(f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                <div className="field" style={{ marginTop: 18 }}>
                  <label htmlFor="cv-tagline">Tagline</label>
                  <input
                    id="cv-tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Product Designer · Dhaka"
                  />
                </div>
                <div className="field">
                  <label htmlFor="cv-bio">Bio</label>
                  <textarea
                    id="cv-bio"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A few lines about what you do and what you're looking for."
                  />
                </div>
                <div className="field">
                  <label htmlFor="cv-location">Location (optional)</label>
                  <input
                    id="cv-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Dhaka, Bangladesh"
                  />
                </div>

                <p className="db-design-label">Call to action</p>
                <div className="db-addlink-grid">
                  <div className="field">
                    <label htmlFor="cta-label">Button label</label>
                    <input
                      id="cta-label"
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      placeholder="Hire me"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="cta-type">Action</label>
                    <select
                      id="cta-type"
                      value={ctaType}
                      onChange={(e) => setCtaType(e.target.value)}
                    >
                      <option value="email">Email me</option>
                      <option value="link">Open a link</option>
                      <option value="scroll">Scroll to contact</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="cta-dest">
                      {ctaType === "email"
                        ? "Email address"
                        : ctaType === "link"
                        ? "URL"
                        : "Not needed"}
                    </label>
                    <input
                      id="cta-dest"
                      value={ctaDest}
                      onChange={(e) => setCtaDest(e.target.value)}
                      disabled={ctaType === "scroll"}
                      placeholder={
                        ctaType === "email"
                          ? "you@example.com"
                          : "https://calendly.com/you"
                      }
                    />
                  </div>
                </div>

                <button className="btn small" onClick={saveAbout}>
                  Save about
                </button>
              </section>

              {/* ---- EXPERIENCE ---- */}
              <section className="card db-card" id="cv-experience">
                <div className="db-card-head db-card-head-row">
                  <div>
                    <p className="db-eyebrow">{SECTION_META.experience.label}</p>
                    <h2>Where you've worked</h2>
                  </div>
                  <button
                    className="btn small db-add-toggle"
                    onClick={() => setShowExpForm((v) => !v)}
                    aria-expanded={showExpForm}
                  >
                    {showExpForm ? "Cancel" : "+ Add role"}
                  </button>
                </div>

                <div className={`db-addlink ${showExpForm ? "open" : ""}`}>
                  <div className="db-addlink-grid">
                    <div className="field">
                      <label htmlFor="exp-role">Role *</label>
                      <input
                        id="exp-role"
                        value={expDraft.role}
                        onChange={(e) =>
                          setExpDraft({ ...expDraft, role: e.target.value })
                        }
                        placeholder="Senior Designer"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="exp-company">Company *</label>
                      <input
                        id="exp-company"
                        value={expDraft.company}
                        onChange={(e) =>
                          setExpDraft({ ...expDraft, company: e.target.value })
                        }
                        placeholder="Acme Co"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="exp-location">Location</label>
                      <input
                        id="exp-location"
                        value={expDraft.location ?? ""}
                        onChange={(e) =>
                          setExpDraft({ ...expDraft, location: e.target.value })
                        }
                        placeholder="Remote"
                      />
                    </div>
                  </div>
                  <div className="db-addlink-grid">
                    <div className="field">
                      <label htmlFor="exp-start">Start</label>
                      <input
                        id="exp-start"
                        type="month"
                        value={expDraft.start_date ?? ""}
                        onChange={(e) =>
                          setExpDraft({ ...expDraft, start_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="exp-end">End</label>
                      <input
                        id="exp-end"
                        type="month"
                        value={expDraft.end_date ?? ""}
                        disabled={expDraft.current}
                        onChange={(e) =>
                          setExpDraft({ ...expDraft, end_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="exp-current">Currently here</label>
                      <button
                        id="exp-current"
                        className={`db-toggle ${expDraft.current ? "on" : ""}`}
                        role="switch"
                        aria-checked={Boolean(expDraft.current)}
                        onClick={() =>
                          setExpDraft({
                            ...expDraft,
                            current: !expDraft.current,
                          })
                        }
                      >
                        <span className="db-toggle-thumb" />
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="exp-desc">What you did</label>
                    <textarea
                      id="exp-desc"
                      rows={3}
                      value={expDraft.description ?? ""}
                      onChange={(e) =>
                        setExpDraft({ ...expDraft, description: e.target.value })
                      }
                      placeholder="Led the redesign of the checkout flow, cutting drop-off by 18%."
                    />
                  </div>
                  <button className="btn small" onClick={submitExperience}>
                    Save role
                  </button>
                </div>

                {experience.length === 0 && (
                  <div className="db-empty">
                    <div className="db-empty-icon" aria-hidden="true">✦</div>
                    <p>No roles yet.</p>
                    <p className="hint">
                      For example: <em>Senior Designer at Acme Co, 2021 — Present</em>
                    </p>
                  </div>
                )}

                <div className="db-links">
                  {experience.map((item, i) => {
                    const d = item.data as unknown as ExperienceData;
                    return (
                      <div
                        className={`db-link ${item.visible ? "" : "off"}`}
                        key={item.id}
                      >
                        <div className="db-link-meta">
                          <div className="db-link-title">
                            {d.role} · {d.company}
                          </div>
                          <div className="db-link-url">
                            {formatDateRange(d.start_date, d.end_date, d.current) ||
                              "No dates"}
                            {d.location ? ` · ${d.location}` : ""}
                          </div>
                        </div>
                        <div className="db-link-actions">
                          <button
                            className="icon-btn"
                            aria-label="Move up"
                            disabled={i === 0}
                            onClick={() => moveItem("experience", i, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="icon-btn"
                            aria-label="Move down"
                            disabled={i === experience.length - 1}
                            onClick={() => moveItem("experience", i, 1)}
                          >
                            ↓
                          </button>
                          <button
                            className={`db-toggle ${item.visible ? "on" : ""}`}
                            role="switch"
                            aria-checked={item.visible}
                            aria-label={item.visible ? "Hide" : "Show"}
                            onClick={() => toggleItem(item.id)}
                          >
                            <span className="db-toggle-thumb" />
                          </button>
                          <button
                            className="icon-btn danger"
                            aria-label="Delete"
                            onClick={() => deleteItem(item.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ---- PROJECTS ---- */}
              <section className="card db-card" id="cv-projects">
                <div className="db-card-head db-card-head-row">
                  <div>
                    <p className="db-eyebrow">{SECTION_META.projects.label}</p>
                    <h2>Work worth showing</h2>
                  </div>
                  <button
                    className="btn small db-add-toggle"
                    onClick={() => setShowProjForm((v) => !v)}
                    aria-expanded={showProjForm}
                  >
                    {showProjForm ? "Cancel" : "+ Add project"}
                  </button>
                </div>

                <div className={`db-addlink ${showProjForm ? "open" : ""}`}>
                  <div className="field">
                    <label htmlFor="proj-title">Title *</label>
                    <input
                      id="proj-title"
                      value={projDraft.title}
                      onChange={(e) =>
                        setProjDraft({ ...projDraft, title: e.target.value })
                      }
                      placeholder="Shongjog — link-in-bio platform"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="proj-desc">Description</label>
                    <textarea
                      id="proj-desc"
                      rows={3}
                      value={projDraft.description ?? ""}
                      onChange={(e) =>
                        setProjDraft({ ...projDraft, description: e.target.value })
                      }
                      placeholder="What it is, what you did, why it mattered."
                    />
                  </div>
                  <div className="db-addlink-grid">
                    <div className="field">
                      <label htmlFor="proj-demo">Live demo URL</label>
                      <input
                        id="proj-demo"
                        value={projDraft.demo_url ?? ""}
                        onChange={(e) =>
                          setProjDraft({ ...projDraft, demo_url: e.target.value })
                        }
                        placeholder="https://…"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="proj-repo">Repo / case study</label>
                      <input
                        id="proj-repo"
                        value={projDraft.repo_url ?? ""}
                        onChange={(e) =>
                          setProjDraft({ ...projDraft, repo_url: e.target.value })
                        }
                        placeholder="https://github.com/…"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="proj-tag">Tech tags</label>
                      <input
                        id="proj-tag"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Next.js  ⏎"
                      />
                    </div>
                  </div>

                  {(projDraft.tags?.length ?? 0) > 0 && (
                    <div className="cv-tags">
                      {projDraft.tags!.map((t, i) => (
                        <button
                          key={`${t}-${i}`}
                          className="cv-tag"
                          onClick={() =>
                            setProjDraft((d) => ({
                              ...d,
                              tags: d.tags!.filter((_, j) => j !== i),
                            }))
                          }
                          aria-label={`Remove ${t}`}
                        >
                          {t} ✕
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="db-upload-actions" style={{ marginTop: 10 }}>
                    <button
                      className="btn ghost small"
                      onClick={() => projImgInput.current?.click()}
                      disabled={uploadingProj}
                    >
                      {uploadingProj
                        ? "Uploading…"
                        : projDraft.cover_url
                        ? "Change image"
                        : "Add cover image"}
                    </button>
                    {projDraft.cover_url && (
                      <button
                        className="btn danger small"
                        onClick={() =>
                          setProjDraft((d) => ({ ...d, cover_url: undefined }))
                        }
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                  <input
                    ref={projImgInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadProjectImage(f);
                      e.target.value = "";
                    }}
                  />

                  <button
                    className="btn small"
                    style={{ marginTop: 12 }}
                    onClick={submitProject}
                  >
                    Save project
                  </button>
                </div>

                {projects.length === 0 && (
                  <div className="db-empty">
                    <div className="db-empty-icon" aria-hidden="true">✦</div>
                    <p>No projects yet.</p>
                    <p className="hint">
                      Add one with an image and a live link — this is the section
                      people actually look at.
                    </p>
                  </div>
                )}

                <div className="db-links">
                  {projects.map((item, i) => {
                    const d = item.data as unknown as ProjectData;
                    return (
                      <div
                        className={`db-link ${item.visible ? "" : "off"}`}
                        key={item.id}
                      >
                        <span className="db-link-badge cv-proj-thumb">
                          {d.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={d.cover_url} alt="" />
                          ) : (
                            "▦"
                          )}
                        </span>
                        <div className="db-link-meta">
                          <div className="db-link-title">{d.title}</div>
                          <div className="db-link-url">
                            {(d.tags ?? []).join(" · ") ||
                              d.demo_url ||
                              "No links yet"}
                          </div>
                        </div>
                        <div className="db-link-actions">
                          <button
                            className="icon-btn"
                            aria-label="Move up"
                            disabled={i === 0}
                            onClick={() => moveItem("projects", i, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="icon-btn"
                            aria-label="Move down"
                            disabled={i === projects.length - 1}
                            onClick={() => moveItem("projects", i, 1)}
                          >
                            ↓
                          </button>
                          <button
                            className={`db-toggle ${item.visible ? "on" : ""}`}
                            role="switch"
                            aria-checked={item.visible}
                            aria-label={item.visible ? "Hide" : "Show"}
                            onClick={() => toggleItem(item.id)}
                          >
                            <span className="db-toggle-thumb" />
                          </button>
                          <button
                            className="icon-btn danger"
                            aria-label="Delete"
                            onClick={() => deleteItem(item.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ---- SKILLS ---- */}
              <section className="card db-card" id="cv-skills">
                <div className="db-card-head">
                  <p className="db-eyebrow">Skills</p>
                  <h2>What you're good at</h2>
                </div>
                <div className="db-addlink-grid">
                  <div className="field">
                    <label htmlFor="sk-name">Skill</label>
                    <input
                      id="sk-name"
                      value={skillDraft.name}
                      onChange={(e) =>
                        setSkillDraft({ ...skillDraft, name: e.target.value })
                      }
                      onKeyDown={(e) => e.key === "Enter" && submitSkill()}
                      placeholder="PyTorch  ⏎"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sk-level">Level</label>
                    <select
                      id="sk-level"
                      value={skillDraft.level ?? 3}
                      onChange={(e) =>
                        setSkillDraft({
                          ...skillDraft,
                          level: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                        })
                      }
                    >
                      <option value={1}>1 · Beginner</option>
                      <option value={2}>2 · Basic</option>
                      <option value={3}>3 · Solid</option>
                      <option value={4}>4 · Advanced</option>
                      <option value={5}>5 · Expert</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="sk-cat">Category (optional)</label>
                    <input
                      id="sk-cat"
                      value={skillDraft.category ?? ""}
                      onChange={(e) =>
                        setSkillDraft({ ...skillDraft, category: e.target.value })
                      }
                      placeholder="Technical"
                    />
                  </div>
                </div>
                <button className="btn small" onClick={submitSkill}>
                  Add skill
                </button>

                {skills.length > 0 && (
                  <div className="cv-tags" style={{ marginTop: 14 }}>
                    {skills.map((it) => {
                      const d = it.data as unknown as SkillData;
                      return (
                        <button
                          key={it.id}
                          className="cv-tag"
                          onClick={() => deleteItem(it.id)}
                          title="Click to remove"
                        >
                          {d.name}
                          {d.level ? ` · ${d.level}/5` : ""} ✕
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ---- EDUCATION ---- */}
              <section className="card db-card" id="cv-education">
                <div className="db-card-head db-card-head-row">
                  <div>
                    <p className="db-eyebrow">Education</p>
                    <h2>Where you studied</h2>
                  </div>
                  <button
                    className="btn small db-add-toggle"
                    onClick={() => setShowEduForm((v) => !v)}
                    aria-expanded={showEduForm}
                  >
                    {showEduForm ? "Cancel" : "+ Add education"}
                  </button>
                </div>

                <div className={`db-addlink ${showEduForm ? "open" : ""}`}>
                  <div className="db-addlink-grid">
                    <div className="field">
                      <label htmlFor="edu-inst">Institution *</label>
                      <input
                        id="edu-inst"
                        value={eduDraft.institution}
                        onChange={(e) =>
                          setEduDraft({ ...eduDraft, institution: e.target.value })
                        }
                        placeholder="North South University"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="edu-degree">Degree</label>
                      <input
                        id="edu-degree"
                        value={eduDraft.degree ?? ""}
                        onChange={(e) =>
                          setEduDraft({ ...eduDraft, degree: e.target.value })
                        }
                        placeholder="BSc"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="edu-field">Field</label>
                      <input
                        id="edu-field"
                        value={eduDraft.field ?? ""}
                        onChange={(e) =>
                          setEduDraft({ ...eduDraft, field: e.target.value })
                        }
                        placeholder="Computer Science"
                      />
                    </div>
                  </div>
                  <div className="db-addlink-grid">
                    <div className="field">
                      <label htmlFor="edu-start">Start</label>
                      <input
                        id="edu-start"
                        type="month"
                        value={eduDraft.start_date ?? ""}
                        onChange={(e) =>
                          setEduDraft({ ...eduDraft, start_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="edu-end">End</label>
                      <input
                        id="edu-end"
                        type="month"
                        value={eduDraft.end_date ?? ""}
                        disabled={eduDraft.current}
                        onChange={(e) =>
                          setEduDraft({ ...eduDraft, end_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="edu-current">Currently studying</label>
                      <button
                        id="edu-current"
                        className={`db-toggle ${eduDraft.current ? "on" : ""}`}
                        role="switch"
                        aria-checked={Boolean(eduDraft.current)}
                        onClick={() =>
                          setEduDraft({ ...eduDraft, current: !eduDraft.current })
                        }
                      >
                        <span className="db-toggle-thumb" />
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="edu-gpa">GPA (optional)</label>
                    <input
                      id="edu-gpa"
                      value={eduDraft.gpa ?? ""}
                      onChange={(e) =>
                        setEduDraft({ ...eduDraft, gpa: e.target.value })
                      }
                      placeholder="3.8 / 4.0"
                    />
                  </div>
                  <button className="btn small" onClick={submitEducation}>
                    Save education
                  </button>
                </div>

                {education.length === 0 && (
                  <div className="db-empty">
                    <div className="db-empty-icon" aria-hidden="true">✦</div>
                    <p>No education yet.</p>
                    <p className="hint">
                      For example: <em>BSc — Computer Science, NSU, 2022 — Present</em>
                    </p>
                  </div>
                )}

                <div className="db-links">
                  {education.map((item, i) => {
                    const d = item.data as unknown as EducationData;
                    return (
                      <div
                        className={`db-link ${item.visible ? "" : "off"}`}
                        key={item.id}
                      >
                        <div className="db-link-meta">
                          <div className="db-link-title">
                            {[d.degree, d.field].filter(Boolean).join(" — ") ||
                              d.institution}
                          </div>
                          <div className="db-link-url">
                            {d.institution} ·{" "}
                            {formatDateRange(d.start_date, d.end_date, d.current) ||
                              "No dates"}
                          </div>
                        </div>
                        <div className="db-link-actions">
                          <button
                            className="icon-btn"
                            aria-label="Move up"
                            disabled={i === 0}
                            onClick={() => moveItem("education", i, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="icon-btn"
                            aria-label="Move down"
                            disabled={i === education.length - 1}
                            onClick={() => moveItem("education", i, 1)}
                          >
                            ↓
                          </button>
                          <button
                            className={`db-toggle ${item.visible ? "on" : ""}`}
                            role="switch"
                            aria-checked={item.visible}
                            onClick={() => toggleItem(item.id)}
                          >
                            <span className="db-toggle-thumb" />
                          </button>
                          <button
                            className="icon-btn danger"
                            aria-label="Delete"
                            onClick={() => deleteItem(item.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ---- CERTIFICATIONS ---- */}
              <section className="card db-card" id="cv-certs">
                <div className="db-card-head db-card-head-row">
                  <div>
                    <p className="db-eyebrow">Certifications</p>
                    <h2>Credentials</h2>
                  </div>
                  <button
                    className="btn small db-add-toggle"
                    onClick={() => setShowCertForm((v) => !v)}
                    aria-expanded={showCertForm}
                  >
                    {showCertForm ? "Cancel" : "+ Add certification"}
                  </button>
                </div>

                <div className={`db-addlink ${showCertForm ? "open" : ""}`}>
                  <div className="db-addlink-grid">
                    <div className="field">
                      <label htmlFor="cert-title">Title *</label>
                      <input
                        id="cert-title"
                        value={certDraft.title}
                        onChange={(e) =>
                          setCertDraft({ ...certDraft, title: e.target.value })
                        }
                        placeholder="AWS Solutions Architect"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="cert-issuer">Issuer</label>
                      <input
                        id="cert-issuer"
                        value={certDraft.issuer ?? ""}
                        onChange={(e) =>
                          setCertDraft({ ...certDraft, issuer: e.target.value })
                        }
                        placeholder="Amazon"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="cert-date">Date</label>
                      <input
                        id="cert-date"
                        type="month"
                        value={certDraft.date ?? ""}
                        onChange={(e) =>
                          setCertDraft({ ...certDraft, date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="cert-url">Credential URL (optional)</label>
                    <input
                      id="cert-url"
                      value={certDraft.credential_url ?? ""}
                      onChange={(e) =>
                        setCertDraft({
                          ...certDraft,
                          credential_url: e.target.value,
                        })
                      }
                      placeholder="https://…"
                    />
                  </div>
                  <button className="btn small" onClick={submitCert}>
                    Save certification
                  </button>
                </div>

                <div className="db-links">
                  {certs.map((item, i) => {
                    const d = item.data as unknown as CertificationData;
                    return (
                      <div
                        className={`db-link ${item.visible ? "" : "off"}`}
                        key={item.id}
                      >
                        <div className="db-link-meta">
                          <div className="db-link-title">{d.title}</div>
                          <div className="db-link-url">
                            {[d.issuer, d.date].filter(Boolean).join(" · ") ||
                              "No details"}
                          </div>
                        </div>
                        <div className="db-link-actions">
                          <button
                            className="icon-btn"
                            aria-label="Move up"
                            disabled={i === 0}
                            onClick={() => moveItem("certifications", i, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="icon-btn"
                            aria-label="Move down"
                            disabled={i === certs.length - 1}
                            onClick={() => moveItem("certifications", i, 1)}
                          >
                            ↓
                          </button>
                          <button
                            className={`db-toggle ${item.visible ? "on" : ""}`}
                            role="switch"
                            aria-checked={item.visible}
                            onClick={() => toggleItem(item.id)}
                          >
                            <span className="db-toggle-thumb" />
                          </button>
                          <button
                            className="icon-btn danger"
                            aria-label="Delete"
                            onClick={() => deleteItem(item.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ---- CONTACT ---- */}
              <section className="card db-card" id="cv-contact">
                <div className="db-card-head">
                  <p className="db-eyebrow">Contact</p>
                  <h2>How people reach you</h2>
                </div>
                <div className="db-addlink-grid">
                  <div className="field">
                    <label htmlFor="ct-email">Email</label>
                    <input
                      id="ct-email"
                      value={contact.email ?? ""}
                      onChange={(e) =>
                        setContact({ ...contact, email: e.target.value })
                      }
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="ct-phone">Phone (optional)</label>
                    <input
                      id="ct-phone"
                      value={contact.phone ?? ""}
                      onChange={(e) =>
                        setContact({ ...contact, phone: e.target.value })
                      }
                      placeholder="+8801…"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="ct-web">Website</label>
                    <input
                      id="ct-web"
                      value={contact.website ?? ""}
                      onChange={(e) =>
                        setContact({ ...contact, website: e.target.value })
                      }
                      placeholder="https://…"
                    />
                  </div>
                </div>
                <div className="db-addlink-grid">
                  <div className="field">
                    <label htmlFor="ct-li">LinkedIn</label>
                    <input
                      id="ct-li"
                      value={contact.linkedin ?? ""}
                      onChange={(e) =>
                        setContact({ ...contact, linkedin: e.target.value })
                      }
                      placeholder="https://linkedin.com/in/…"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="ct-gh">GitHub</label>
                    <input
                      id="ct-gh"
                      value={contact.github ?? ""}
                      onChange={(e) =>
                        setContact({ ...contact, github: e.target.value })
                      }
                      placeholder="https://github.com/…"
                    />
                  </div>
                  <div className="field" />
                </div>
                <button className="btn small" onClick={saveContact}>
                  Save contact
                </button>
              </section>

              {/* ---- DESIGN (Phase A: templates, not loose parts) ---- */}
              <section className="card db-card" id="cv-design">
                <div className="db-card-head">
                  <p className="db-eyebrow">Design</p>
                  <h2>Pick a template</h2>
                </div>
                <p className="hint" style={{ marginBottom: 14 }}>
                  Each template is a complete design — typography, colour and
                  layout chosen to work together. Your content never changes.
                </p>

                <div className="tpl-grid">
                  {CV_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      className={`tpl-card ${templateId === t.id ? "selected" : ""}`}
                      onClick={() => saveDesign({ template_id: t.id })}
                      aria-pressed={templateId === t.id}
                    >
                      <span
                        className="tpl-thumb"
                        style={{
                          backgroundColor: t.tokens.bg,
                          backgroundImage: t.tokens.bgImage,
                        }}
                      >
                        <span
                          className="tpl-thumb-title"
                          style={{
                            color: t.tokens.text,
                            fontFamily: `'${t.fonts.display}', ${
                              t.fonts.display === "Playfair Display"
                                ? "serif"
                                : "sans-serif"
                            }`,
                          }}
                        >
                          Aa
                        </span>
                        <span
                          className="tpl-thumb-bar"
                          style={{ background: t.tokens.accent }}
                        />
                        <span
                          className="tpl-thumb-line"
                          style={{ background: t.tokens.line }}
                        />
                        <span
                          className="tpl-thumb-line short"
                          style={{ background: t.tokens.line }}
                        />
                      </span>
                      <span className="tpl-meta">
                        <b>{t.label}</b>
                        <small>{t.blurb}</small>
                      </span>
                    </button>
                  ))}
                </div>

                <p className="db-design-label">Accent override</p>
                <p className="hint" style={{ marginTop: -4, marginBottom: 10 }}>
                  Optional — leave as the template default unless you have a
                  brand colour.
                </p>
                <div className="db-accents">
                  {CV_ACCENT_OVERRIDES.map((c) => (
                    <button
                      key={c}
                      className={`db-accent ${accent === c ? "selected" : ""}`}
                      style={{ background: c }}
                      aria-label={`Accent ${c}`}
                      onClick={() => saveDesign({ accent_color: c })}
                    />
                  ))}
                </div>

                <p className="db-design-label">Layout density</p>
                <div className="db-fonts">
                  {(["comfortable", "compact"] as const).map((d) => (
                    <button
                      key={d}
                      className={`db-font ${density === d ? "selected" : ""}`}
                      onClick={() => {
                        setDensity(d);
                        saveCv({ density: d });
                      }}
                    >
                      {d === "comfortable" ? "Comfortable" : "Compact"}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>

        {/* ---- LIVE PREVIEW ---- */}
        <aside className="db-preview" aria-label="Live preview of your CV">
          <p className="db-eyebrow db-preview-label">Live preview</p>
          <div
            className="cvp-frame"
            style={
              {
                "--cv-accent": accent,
                backgroundColor: wp.color,
                backgroundImage: wp.image,
                ...(fontFamily ? { fontFamily } : {}),
              } as unknown as React.CSSProperties
            }
          >
            <div className={`cvp-body ${wallpaper === "ivory" ? "light" : ""}`}>
              {heroPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="cvp-photo" src={heroPhoto} alt="" />
              ) : (
                <div className="cvp-photo cvp-photo-ph">
                  {(displayName || username)[0]?.toUpperCase()}
                </div>
              )}
              <div className="cvp-name">{displayName || username}</div>
              {tagline && <div className="cvp-tagline">{tagline}</div>}
              {ctaLabel && <div className="cvp-cta">{ctaLabel}</div>}

              {pvExperience.length > 0 && (
                <>
                  <div className="cvp-heading">Experience</div>
                  <div className="cvp-timeline">
                    {pvExperience.slice(0, 3).map((it) => {
                      const d = it.data as unknown as ExperienceData;
                      return (
                        <div className="cvp-tl-item" key={it.id}>
                          <div className="cvp-tl-role">{d.role}</div>
                          <div className="cvp-tl-meta">
                            {d.company}
                            {formatDateRange(d.start_date, d.end_date, d.current)
                              ? ` · ${formatDateRange(
                                  d.start_date,
                                  d.end_date,
                                  d.current
                                )}`
                              : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {pvProjects.length > 0 && (
                <>
                  <div className="cvp-heading">Projects</div>
                  <div className="cvp-projects">
                    {pvProjects.slice(0, 4).map((it) => {
                      const d = it.data as unknown as ProjectData;
                      return (
                        <div className="cvp-proj" key={it.id}>
                          {d.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={d.cover_url} alt="" />
                          ) : (
                            <span className="cvp-proj-ph">▦</span>
                          )}
                          <span className="cvp-proj-title">{d.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {pvExperience.length === 0 && pvProjects.length === 0 && (
                <div className="cvp-hint">
                  Your experience and projects appear here
                </div>
              )}

              <div className="cvp-mark">
                সংযোগ · <b>shongjog</b>/cv/{username}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {toast && (
        <div className="db-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
