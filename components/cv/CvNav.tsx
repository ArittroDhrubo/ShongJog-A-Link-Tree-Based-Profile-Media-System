"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavItem = { href: string; label: string };

// Persistent nav across every portfolio page. Collapses to a full-screen
// menu on mobile — the pattern the multi-page architecture needs so a
// visitor always knows where they are and what else exists.
export default function CvNav({
  username,
  displayName,
  items,
}: {
  username: string;
  displayName: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu on route change and on Escape.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const base = `/cv/${username}`;
  const initial = (displayName || username).trim()[0]?.toUpperCase() ?? "?";

  function isActive(href: string) {
    if (href === base) return pathname === base;
    return pathname.startsWith(href);
  }

  return (
    <>
      <header className="cvnav" data-print-hide="true">
        <Link href={base} className="cvnav-mark" aria-label={`${displayName} — home`}>
          <span className="cvnav-mark-badge">{initial}</span>
          <span className="cvnav-mark-name">{displayName}</span>
        </Link>

        <nav className="cvnav-links" aria-label="Portfolio sections">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`cvnav-link ${isActive(it.href) ? "active" : ""}`}
              aria-current={isActive(it.href) ? "page" : undefined}
            >
              {it.label}
            </Link>
          ))}
        </nav>

        <button
          className="cvnav-burger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <span className={`cvnav-burger-bar ${open ? "a" : ""}`} />
          <span className={`cvnav-burger-bar ${open ? "b" : ""}`} />
        </button>
      </header>

      {open && (
        <div className="cvnav-sheet" data-print-hide="true">
          <nav aria-label="Portfolio sections">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`cvnav-sheet-link ${isActive(it.href) ? "active" : ""}`}
              >
                {it.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
