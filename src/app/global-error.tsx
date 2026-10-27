"use client";

/*
  Last line of defence: used only if the root layout itself fails.
  It replaces the whole page, so it needs its own <html> and <body>
  and uses plain inline styles (the normal stylesheet may not load).
*/
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf7f2",
          color: "#2d2d2a",
          fontFamily: "Georgia, serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 400 }}>Something didn&apos;t load properly</h1>
          <p style={{ fontFamily: "system-ui, sans-serif", color: "#55554f" }}>
            Your progress is safe. Please try again in a moment.
          </p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: 24,
              padding: "14px 28px",
              fontSize: "1rem",
              borderRadius: 16,
              border: "none",
              background: "#4f7358",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
