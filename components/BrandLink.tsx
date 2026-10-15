import Link from "next/link";
import Logo from "./Logo";

// The brand mark, clickable everywhere — the app's consistent way home.
export default function BrandLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`brand-link ${className}`.trim()}
      aria-label="Shongjog — back to home"
    >
      <Logo size={20} className="brand-logo" />
      <span>সংযোগ · SHONGJOG</span>
    </Link>
  );
}
