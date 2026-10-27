import type { ReactNode } from "react";

/*
  Gently fades content up into place when the page opens.
  `delay` (in milliseconds) lets items appear one after another.
  Pure CSS — no animation library needed. Devices set to
  "reduce motion" skip it automatically (see globals.css).
*/
export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={`animate-fade-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
