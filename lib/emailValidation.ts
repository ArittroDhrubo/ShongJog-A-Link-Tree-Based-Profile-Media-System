// Practical pre-send email validation. The definitive "does this mailbox
// exist" check is the verification link itself — these guards catch the
// realistic bad cases (malformed, disposable, obvious typos) before we
// spend a send on them.

// Known throwaway / disposable domains — the main way people dodge
// verification. Not exhaustive, but covers the common ones.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "guerrillamail.info",
  "temp-mail.org", "tempmail.com", "throwawaymail.com", "yopmail.com",
  "getnada.com", "trashmail.com", "sharklasers.com", "grr.la", "spam4.me",
  "dispostable.com", "maildrop.cc", "fakeinbox.com", "tempinbox.com",
  "mohmal.com", "emailondeck.com", "mintemail.com", "mailnesia.com",
  "tempr.email", "burnermail.io", "33mail.com", "spamgourmet.com",
  "mailcatch.com", "trbvm.com", "einrot.com", "tempmailo.com", "moakt.com",
]);

// Common typos of popular providers → the intended domain.
const TYPO_MAP: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.con": "gmail.com", "gmaill.com": "gmail.com", "gmail.cm": "gmail.com",
  "gnail.com": "gmail.com", "gmail.comm": "gmail.com", "gmailcom": "gmail.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com",
  "yahoo.co": "yahoo.com", "yhaoo.com": "yahoo.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com", "hotmal.com": "hotmail.com",
  "outlook.con": "outlook.com", "outlok.com": "outlook.com",
  "outook.com": "outlook.com", "icloud.con": "icloud.com",
};

export type EmailCheck =
  | { ok: true; email: string }
  | { ok: false; message: string; suggestion?: string };

export function validateEmail(raw: string): EmailCheck {
  const email = raw.trim().toLowerCase();

  if (!email) return { ok: false, message: "Enter your email address." };

  // Strict-enough RFC-lite format check.
  const re = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
  if (!re.test(email)) {
    return { ok: false, message: "That email address isn't formatted correctly." };
  }

  const domain = email.split("@")[1];

  // No consecutive dots, no leading/trailing dot in domain.
  if (domain.includes("..") || domain.startsWith(".") || domain.endsWith(".")) {
    return { ok: false, message: "That email address isn't formatted correctly." };
  }

  // The TLD should be at least two letters.
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return { ok: false, message: "That email domain doesn't look valid." };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      message:
        "Temporary or disposable email addresses aren't allowed. Please use a permanent email you can access.",
    };
  }

  if (TYPO_MAP[domain]) {
    const fixed = `${email.split("@")[0]}@${TYPO_MAP[domain]}`;
    return {
      ok: false,
      message: `Did you mean ${fixed}?`,
      suggestion: fixed,
    };
  }

  return { ok: true, email };
}
