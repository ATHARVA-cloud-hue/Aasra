import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LAST_INTAKE_HREF, nextStage, stageFor } from "@/lib/journey";
import { StepPage } from "@/components/layout/StepPage";
import { Card } from "@/components/ui/Card";
import { DocumentReader } from "@/components/documents/DocumentReader";

/*
  DOCUMENT UPLOAD.

  A family photographs a document and Gemini reads it on the server,
  filling in the details so they do not have to be typed. If the AI key
  is missing the uploader still works and shows sample data, so this
  step never blocks anything.
*/

const STAGE = "/documents";

/** Keys under documents.helpful, in the order a family reads them. */
const HELPFUL = ["death", "id", "bank", "insurance", "property", "will"];

export default async function DocumentsPage() {
  const t = await getTranslations();
  const stage = stageFor(STAGE);
  const next = nextStage(STAGE);

  return (
    <StepPage
      stage={STAGE}
      title={t(`stages.${stage.key}.title`)}
      intro={t(`stages.${stage.key}.intro`)}
      back={{ href: LAST_INTAKE_HREF, label: t("documents.backToQuestions") }}
      next={next ? { href: next.href, label: t("common.continue") } : undefined}
      footnote={t("documents.footnote")}
    >
      <Card>
        <DocumentReader />

        <h2 className="mt-8 text-xl">{t("documents.helpfulTitle")}</h2>
        <ul className="mt-4 space-y-3">
          {HELPFUL.map((item) => (
            <li key={item} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-400"
              />
              <span>
                <span className="text-ink">{t(`documents.helpful.${item}.name`)}</span>{" "}
                <span className="text-ink-soft">{t(`documents.helpful.${item}.note`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </StepPage>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t(`stages.${stageFor(STAGE).key}.title`) };
}
