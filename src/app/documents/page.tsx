import { LAST_INTAKE_HREF, nextStage, stageFor } from "@/lib/journey";
import { StepPage } from "@/components/layout/StepPage";
import { Card } from "@/components/ui/Card";
import { DocumentReader } from "@/components/documents/DocumentReader";

/*
  DOCUMENT UPLOAD (Stage 4 in the README).

  A family photographs a document and Gemini reads it on the server,
  filling in the details so they do not have to type them. If the AI
  key is missing the uploader still works and shows sample data, so
  this step never blocks the journey.
*/

const STAGE = "/documents";

const helpful = [
  { name: "The death certificate", note: "The one document almost every bank will ask for." },
  { name: "Their Aadhaar or PAN card", note: "Helps us match accounts to the right person." },
  { name: "A bank passbook or statement", note: "Even an old one tells us where to look." },
  { name: "Any insurance policy", note: "The policy number is the useful part." },
  { name: "Property papers", note: "Only if property is involved." },
  { name: "Their will", note: "Most families do not have one. That is normal." },
];

export default function DocumentsPage() {
  const stage = stageFor(STAGE);
  const next = nextStage(STAGE);

  return (
    <StepPage
      stage={STAGE}
      title={stage.title}
      intro={stage.intro}
      back={{ href: LAST_INTAKE_HREF, label: "Back to the questions" }}
      next={next ? { href: next.href, label: "Continue" } : undefined}
      footnote="You can skip this step entirely and come back later. Nothing here blocks the rest of the journey."
    >
      <Card>
        <DocumentReader />

        <h2 className="mt-8 text-xl">What helps most, if you have it</h2>
        <ul className="mt-4 space-y-3">
          {helpful.map((item) => (
            <li key={item.name} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-400" />
              <span>
                <span className="text-ink">{item.name}</span>{" "}
                <span className="text-ink-soft">— {item.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </StepPage>
  );
}

export const metadata = { title: `${stageFor(STAGE).title} — gentle help with paperwork` };
