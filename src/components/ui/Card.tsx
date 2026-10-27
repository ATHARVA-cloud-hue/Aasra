import type { ReactNode } from "react";

/* A soft, paper-like box used to group content. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-line bg-paper p-6 shadow-[0_1px_2px_rgba(45,45,42,0.04)] sm:p-8 ${className}`}>
      {children}
    </div>
  );
}
