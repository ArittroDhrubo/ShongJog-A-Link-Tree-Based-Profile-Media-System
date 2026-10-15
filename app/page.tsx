"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLink from "@/components/BrandLink";
import ThemeToggle from "@/components/ThemeToggle";

// Rotating DEMO profiles (fake sample users — not real accounts)
const DEMOS = [
  { name: "maya_arts", bio: "Painter · Dhaka 🎨", theme: "t-sunset", initial: "M" },
  { name: "tanvir.dev", bio: "Building cool things 💻", theme: "t-ocean", initial: "T" },
  { name: "rafi_music", bio: "New single out now 🎵", theme: "t-berry", initial: "R" },
];

export default function Home() {
  const router = useRouter();
  const [wanted, setWanted] = useState("");
  const [demo, setDemo] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDemo((d) => (d + 1) % DEMOS.length), 2800);
    return () => clearInterval(id);
  }, []);

  function claim() {
    const clean = wanted.toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
    router.push(clean ? `/login?mode=signup&username=${clean}` : "/login?mode=signup");
  }

  const d = DEMOS[demo];

  return (
    <main className="lp">
      {/* ============ TOP BAR ============ */}
      <header className="lp-topbar">
        <BrandLink className="lp-brand" />
        <div className="lp-topbar-actions">
          <ThemeToggle />
          <Link href="/login?mode=signup" className="lp-register-btn">
            Register
          </Link>
          <Link href="/login" className="lp-login-btn">
            Log in
          </Link>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <h1>
              Everything
              <br />
              you are. In one
              <br />
              simple link.
            </h1>
            <p className="lp-sub">
              One page for your Facebook, Instagram, WhatsApp, Discord, X,
              LinkedIn, email and anything else. Free forever.
            </p>

            {/* working claim bar */}
            <div className="lp-claim">
              <span className="lp-claim-prefix">shongjog/</span>
              <input
                value={wanted}
                onChange={(e) => setWanted(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && claim()}
                placeholder="yourname"
                aria-label="Choose your username"
              />
              <button className="lp-claim-btn" onClick={claim}>
                Claim it
              </button>
            </div>
            <p className="lp-login-line">
              Already have a page? <Link href="/login">Log in</Link>
            </p>

            {/* One username, two products — the new-user discovery point. */}
            <div className="lp-products">
              <div className="lp-product">
                <span className="lp-product-ico" aria-hidden="true">🔗</span>
                <b>Link Page</b>
                <small>One page for all your links</small>
              </div>
              <div className="lp-product">
                <span className="lp-product-ico" aria-hidden="true">📄</span>
                <b>Portfolio</b>
                <small>Your CV, experience &amp; projects</small>
              </div>
            </div>
            <p className="lp-products-note">
              One username. Both are free — set up either, or both.
            </p>
          </div>

          {/* animated rotating demo card */}
          <div className="lp-hero-visual" aria-hidden="true">
            <div key={demo} className={`lp-demo ${d.theme}`}>
              <div className="lp-demo-avatar">{d.initial}</div>
              <div className="lp-demo-name">{d.name}</div>
              <div className="lp-demo-bio">{d.bio}</div>
              <div className="lp-demo-socials">
                <span /><span /><span /><span /><span />
              </div>
              <div className="lp-demo-card" />
              <div className="lp-demo-card" />
              <div className="lp-demo-card short" />
            </div>
            <div className="lp-chip lp-chip-1">🔗 one link, everywhere</div>
            <div className="lp-chip lp-chip-2">✨ yours in 30 seconds</div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="lp-features">
        <h2>Set up in three easy steps</h2>
        <div className="lp-feature-grid">
          <div className="lp-feature">
            <div className="lp-feature-emoji">🪪</div>
            <h3>Claim your name</h3>
            <p>
              Pick a username and instantly get your own page at
              shongjog/yourname.
            </p>
          </div>
          <div className="lp-feature">
            <div className="lp-feature-emoji">🎛️</div>
            <h3>Add your links</h3>
            <p>
              Facebook, Instagram, WhatsApp, Discord, X, LinkedIn, email — plus
              any custom link you want.
            </p>
          </div>
          <div className="lp-feature">
            <div className="lp-feature-emoji">🚀</div>
            <h3>Share everywhere</h3>
            <p>
              Put your one link in every bio. Upload your photo and background
              to make it truly yours.
            </p>
          </div>
        </div>
        <Link className="lp-final-cta" href="/login?mode=signup">
          Get started — it&apos;s free
        </Link>
      </section>
    </main>
  );
}
