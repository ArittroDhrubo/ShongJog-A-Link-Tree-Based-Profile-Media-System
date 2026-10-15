"use client";

import { useEffect, useRef, useState } from "react";
import type { ContactData } from "@/lib/cv";

// Recruiter-facing actions on a public CV. All client-side: printing uses
// the page's own @media print rules (one source of truth — no separate PDF
// template), and the QR/vCard are generated in-browser (zero backend cost).
export default function CvActions({
  name,
  tagline,
  location,
  contact,
  cvUrl,
  printHref,
}: {
  name: string;
  tagline: string | null;
  location: string | null;
  contact: ContactData;
  cvUrl: string;
  /** Phase B: the PDF lives on its own route now. */
  printHref?: string;
}) {
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const hasContact = Object.values(contact ?? {}).some(Boolean);

  // Close the QR dialog on Escape.
  useEffect(() => {
    if (!showQr) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQr(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showQr]);

  async function openQr() {
    setShowQr(true);
    if (qrDataUrl || qrError) return;
    try {
      // Loaded on demand so the library never ships to visitors who
      // don't open the QR panel.
      const QRCode = (await import("qrcode")).default;
      const url = await QRCode.toDataURL(cvUrl, {
        width: 640,
        margin: 2,
        color: { dark: "#0d1015", light: "#ffffff" },
      });
      setQrDataUrl(url);
    } catch {
      setQrError(true);
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${slug(name)}-cv-qr.png`;
    a.click();
  }

  // vCard 3.0 — the format Contacts apps on iOS/Android/macOS/Outlook read.
  function downloadVcard() {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${esc(name)}`,
      `N:${esc(name)};;;;`,
    ];
    if (tagline) lines.push(`TITLE:${esc(tagline)}`);
    if (contact.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(contact.email)}`);
    if (contact.phone) lines.push(`TEL;TYPE=CELL:${esc(contact.phone)}`);
    if (location) lines.push(`ADR;TYPE=HOME:;;${esc(location)};;;;`);
    lines.push(`URL:${esc(cvUrl)}`);
    if (contact.linkedin) lines.push(`URL;TYPE=LinkedIn:${esc(contact.linkedin)}`);
    if (contact.github) lines.push(`URL;TYPE=GitHub:${esc(contact.github)}`);
    if (contact.website) lines.push(`URL;TYPE=Website:${esc(contact.website)}`);
    lines.push("END:VCARD");

    const blob = new Blob([lines.join("\r\n")], {
      type: "text/vcard;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(name)}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="cvpg-actions" data-print-hide="true">
        {printHref ? (
          <a className="cvpg-action" href={printHref}>
            <IconDownload /> Download CV
          </a>
        ) : (
          <button className="cvpg-action" onClick={() => window.print()}>
            <IconDownload /> Download CV
          </button>
        )}
        <button className="cvpg-action" onClick={openQr}>
          <IconQr /> QR code
        </button>
        {hasContact && (
          <button className="cvpg-action" onClick={downloadVcard}>
            <IconCard /> Save contact
          </button>
        )}
      </div>

      {showQr && (
        <div
          className="cvpg-qr-backdrop"
          data-print-hide="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowQr(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="QR code for this CV"
        >
          <div className="cvpg-qr-card" ref={dialogRef}>
            <p className="cvpg-qr-title">Scan to open this CV</p>
            {qrError ? (
              <p className="cvpg-qr-fallback">
                Couldn&apos;t generate the QR code. The link is:
                <br />
                <span>{cvUrl}</span>
              </p>
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`QR code linking to ${cvUrl}`} />
            ) : (
              <div className="cvpg-qr-loading">Generating…</div>
            )}
            <p className="cvpg-qr-url">{cvUrl}</p>
            <div className="cvpg-qr-actions">
              {qrDataUrl && (
                <button className="cvpg-action" onClick={downloadQr}>
                  Download PNG
                </button>
              )}
              <button className="cvpg-action" onClick={() => setShowQr(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// vCard escaping: commas, semicolons, backslashes and newlines are special.
function esc(v: string) {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function slug(v: string) {
  return (
    v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "cv"
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function IconQr() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 17c.6-1.8 2-2.5 3-2.5s2.4.7 3 2.5M14 9h5M14 13h3" />
    </svg>
  );
}
