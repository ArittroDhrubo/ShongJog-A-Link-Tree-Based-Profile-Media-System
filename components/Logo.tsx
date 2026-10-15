// Shongjog logo mark: two interlocking rounded links forming a connected
// knot — "সংযোগ" means connection. currentColor so it inherits each
// placement's brand color and adapts to light/dark automatically.
export default function Logo({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M11 8.5a6.5 6.5 0 0 0 0 13h3.2a3 3 0 0 0 0-6H12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 23.5a6.5 6.5 0 0 0 0-13h-3.2a3 3 0 0 0 0 6H20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}
