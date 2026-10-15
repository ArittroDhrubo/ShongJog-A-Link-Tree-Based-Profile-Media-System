import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect logged-in-only pages.
  // NOTE: /cv/[username] is intentionally NOT protected — it's a public
  // page, like /[username]. Only the editor routes require a session.
  const path = request.nextUrl.pathname;
  const needsAuth =
    path.startsWith("/dashboard") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/cv/dashboard") ||
    path.startsWith("/cv/onboarding");

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

// Only run auth middleware where it matters: the protected pages.
// (Public profile pages and static assets skip the Supabase round-trip.)
// Keep this matcher in sync with `needsAuth` above.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/cv/dashboard/:path*",
    "/cv/onboarding/:path*",
  ],
};
