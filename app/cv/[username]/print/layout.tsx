import type { ReactNode } from "react";

// The print route deliberately escapes the CV nav shell — a PDF has no
// navigation. This layout overrides the parent so /print renders bare.
export default function PrintLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
