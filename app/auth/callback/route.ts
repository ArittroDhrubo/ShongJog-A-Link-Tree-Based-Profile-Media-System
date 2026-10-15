import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isReservedUsername } from "@/lib/reservedUsernames";

// Google redirects here after OAuth. The user's intent (login vs signup)
// travels via short-lived cookies set just before the OAuth redirect —
// query params on redirectTo are unreliable with Supabase's allow list.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();
  const intent = cookieStore.get("auth_intent")?.value ?? null;
  const claimed = cookieStore.get("auth_claim")?.value ?? null;

  // Every exit path clears the intent cookies so they can't leak
  // into a future, unrelated sign-in.
  const redirect = (path: string) => {
    const res = NextResponse.redirect(`${origin}${path}`);
    res.cookies.set("auth_intent", "", { maxAge: 0, path: "/" });
    res.cookies.set("auth_claim", "", { maxAge: 0, path: "/" });
    return res;
  };

  if (!code) return redirect("/login");

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return redirect("/login?error=oauth");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login?error=oauth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const isRegistered = !!profile?.onboarding_completed;

  // ---- user clicked LOGIN ----
  if (intent === "login") {
    if (isRegistered) return redirect("/dashboard");
    // No completed registration -> block the login entirely.
    await supabase.auth.signOut();
    return redirect("/login?error=no_account&mode=signup");
  }

  // ---- user clicked REGISTER (claim username) ----
  if (intent === "signup") {
    if (isRegistered) {
      await supabase.auth.signOut();
      return redirect("/login?error=already_registered&mode=login");
    }
    // Apply the claimed username if it's valid and still free.
    if (claimed && profile) {
      const clean = decodeURIComponent(claimed).toLowerCase().trim();
      if (
        /^[a-z0-9_]{3,30}$/.test(clean) &&
        !isReservedUsername(clean) &&
        clean !== profile.username
      ) {
        const { data: taken } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", clean)
          .maybeSingle();
        if (!taken) {
          await supabase
            .from("profiles")
            .update({ username: clean, display_name: clean })
            .eq("id", user.id);
        }
      }
    }
    return redirect("/onboarding");
  }

  // ---- no intent cookie (direct visit, expired cookie) ----
  return redirect(isRegistered ? "/dashboard" : "/onboarding");
}
