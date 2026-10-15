// Usernames that would collide with real routes. Kept in sync with the
// DB check constraint in supabase/phase1_products_and_reserved.sql —
// the constraint is the backstop; this gives users a friendly message
// instead of a raw database error.
export const RESERVED_USERNAMES = new Set([
  "cv", "links", "login", "logout", "signup", "register",
  "dashboard", "onboarding", "auth", "api", "admin", "settings",
  "about", "help", "support", "terms", "privacy", "pricing",
  "explore", "search", "new", "edit", "static", "_next", "assets",
]);

export function isReservedUsername(name: string): boolean {
  return RESERVED_USERNAMES.has(name.toLowerCase().trim());
}
