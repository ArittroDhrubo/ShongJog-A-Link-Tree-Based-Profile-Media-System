"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// The one element present in BOTH dashboards, in the same position.
// It's the switcher for people who have both products AND the discovery
// point for people who don't — inactive products are always listed, so
// navigation itself is the announcement.
export default function ProductSwitcher({
  current,
  hasCv,
}: {
  current: "links" | "cv";
  hasCv: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = current === "links" ? "Link Page" : "Portfolio";

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <div className="psw" ref={wrapRef}>
      <button
        className="psw-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {current === "links" ? <IconLink /> : <IconDoc />}
        <span>{label}</span>
        <svg
          className={`psw-caret ${open ? "up" : ""}`}
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="psw-menu" role="menu">
          <button
            className={`psw-item ${current === "links" ? "active" : ""}`}
            role="menuitem"
            onClick={() => go("/dashboard")}
          >
            <IconLink />
            <span className="psw-item-text">
              <b>Link Page</b>
              <small>All your links, one page</small>
            </span>
            {current === "links" && <span className="psw-check">✓</span>}
          </button>

          <button
            className={`psw-item ${current === "cv" ? "active" : ""}`}
            role="menuitem"
            onClick={() => go(hasCv ? "/cv/dashboard" : "/cv/onboarding")}
          >
            <IconDoc />
            <span className="psw-item-text">
              <b>Portfolio</b>
              <small>{hasCv ? "Your CV and projects" : "Not set up yet"}</small>
            </span>
            {current === "cv" ? (
              <span className="psw-check">✓</span>
            ) : !hasCv ? (
              <span className="psw-new">Set up</span>
            ) : null}
          </button>
        </div>
      )}
    </div>
  );
}

function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l1.93-1.93a5 5 0 0 0-7.07-7.07L10.5 5.5M14 11a5 5 0 0 0-7.07 0L5 12.93a5 5 0 0 0 7.07 7.07L13.5 18.5" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}
