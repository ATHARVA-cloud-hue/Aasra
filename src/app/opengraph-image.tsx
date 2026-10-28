import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

/*
  THE LINK PREVIEW.

  What somebody sees when this app is shared into WhatsApp, a Slack
  channel or a group chat. That matters more than usual here: the link
  is often passed between relatives at the worst moment of their year,
  and a preview that looks like a half-finished side project is a
  reason not to trust it with a dead parent's bank details.

  So: the cream background and the sage leaf from the app itself, the
  name, the tagline, and the "not a law firm" line. Nothing clever.

  Rendered rather than shipped as a file so the tagline comes from the
  dictionaries. The locale comes from the cookie, which means a link
  shared by somebody reading in Hindi previews in Hindi.

  NO CUSTOM FONT IS LOADED, deliberately. next/og would need the actual
  font binary fetched at render time, and a failed fetch means no
  preview image at all. The built-in face is plain, which suits this.
  One consequence: Devanagari, Gujarati and Nastaliq may not render in
  the built-in face, so if a locale's preview comes out blank, that is
  why, and the fix is to load the matching Noto font here.
*/

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const t = await getTranslations("app");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          // Matches --color-cream.
          background: "#faf7f2",
          padding: "80px",
        }}
      >
        {/* The leaf, drawn inline: next/og cannot fetch an external file. */}
        <svg width="96" height="96" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="15" fill="#e1eae2" />
          <path
            d="M10 22c0-7 5-12 13-12 0 8-5 13-12 13"
            fill="none"
            stroke="#4f7358"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M10 22l7-7" stroke="#4f7358" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        <div
          style={{
            marginTop: "40px",
            fontSize: "76px",
            // Matches --color-ink.
            color: "#2d2d2a",
          }}
        >
          {t("name")}
        </div>

        <div
          style={{
            marginTop: "24px",
            fontSize: "40px",
            // Matches --color-ink-soft.
            color: "#55554f",
            // next/og needs an explicit width to wrap at.
            maxWidth: "900px",
            lineHeight: 1.35,
          }}
        >
          {t("tagline")}
        </div>

        <div
          style={{
            marginTop: "48px",
            fontSize: "26px",
            // Matches --color-sage-800.
            color: "#304836",
          }}
        >
          {t("notALawFirmShort")}
        </div>
      </div>
    ),
    size,
  );
}
