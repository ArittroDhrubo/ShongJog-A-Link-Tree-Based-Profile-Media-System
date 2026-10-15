"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// The single interruptive moment in the whole discovery design: shown once
// to existing users who don't have the CV product, dismissible forever.
// Everything else (the switcher) is passive and always available.
export default function CvAnnounceBanner({ userId }: { userId: string }) {
  const router = useRouter();
  const [gone, setGone] = useState(false);

  async function markSeen() {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ seen_cv_announcement: true })
      .eq("id", userId);
  }

  async function dismiss() {
    setGone(true);
    await markSeen();
  }

  async function tryIt() {
    await markSeen();
    router.push("/cv/onboarding");
  }

  if (gone) return null;

  return (
    <div className="cvann" role="status">
      <span className="cvann-badge">New</span>
      <p>
        Build a <b>professional portfolio</b> with the same account — your
        experience, projects, and a downloadable CV.
      </p>
      <div className="cvann-actions">
        <button className="btn small" onClick={tryIt}>
          Try it
        </button>
        <button
          className="cvann-x"
          onClick={dismiss}
          aria-label="Dismiss this announcement"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
