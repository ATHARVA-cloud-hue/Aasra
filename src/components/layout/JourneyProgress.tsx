import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { STAGES, stageIndex } from "@/lib/journey";

/*
  A strip showing the five steps, with the current one marked. Every
  step stays clickable so nobody is ever stuck on a page.
*/
export async function JourneyProgress({ current }: { current: string }) {
  const t = await getTranslations();
  const currentIndex = stageIndex(current);

  return (
    <nav aria-label={t("common.progress")}>
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
                {t(`stages.${stage.key}.label`)}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
