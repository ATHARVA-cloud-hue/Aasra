import Link from "next/link";
import { STAGES, stageIndex } from "@/lib/journey";

/*
  A quiet strip showing the five stages of the journey, with the
  current one marked. Every stage stays clickable so nobody ever
  feels trapped on a page.
*/
export function JourneyProgress({ current }: { current: string }) {
  const currentIndex = stageIndex(current);

  return (
    <nav aria-label="Your progress">
      <ol className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm">
        {STAGES.map((stage, i) => {
          const isCurrent = i === currentIndex;
          const isDone = currentIndex > -1 && i < currentIndex;

          return (
            <li key={stage.href} className="flex items-center gap-1">
              {i > 0 && (
                <span aria-hidden="true" className="px-1 text-line">
                  /
                </span>
              )}
              <Link
                href={stage.href}
                aria-current={isCurrent ? "step" : undefined}
                className={`rounded-full px-2.5 py-1 transition-colors duration-300 hover:bg-sage-50 hover:text-sage-800 ${
                  isCurrent
                    ? "bg-sage-100 font-medium text-sage-800"
                    : isDone
                      ? "text-ink-soft"
                      : "text-ink-muted"
                }`}
              >
                {stage.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
