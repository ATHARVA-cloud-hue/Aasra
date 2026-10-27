import type { ReactNode } from "react";

/*
  Keeps content at a comfortable reading width with side padding.
  "narrow" is for one-question-per-screen pages; "wide" for the landing page.
*/
export function Container({
  children,
  width = "wide",
  className = "",
}: {
  children: ReactNode;
  width?: "narrow" | "wide";
  className?: string;
}) {
  const max = width === "narrow" ? "max-w-xl" : "max-w-5xl";
  return <div className={`mx-auto w-full px-5 sm:px-8 ${max} ${className}`}>{children}</div>;
}
