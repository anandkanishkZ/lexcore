"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { captureClientError } from "@/lib/error-tracking";

/**
 * Catches an error in the root layout itself — something error.tsx can't
 * do, since it renders *inside* that layout. Must define its own <html>/
 * <body>, since it fully replaces the root layout when active. Deliberately
 * plain inline styles, not Tailwind classes: this can render when the
 * layout that would normally pull in global.css has itself failed.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    captureClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            padding: "24px",
          }}
        >
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: "0 0 8px" }}>
              Lexcore hit an unexpected error
            </h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px", lineHeight: 1.5 }}>
              It&apos;s been logged. Please try reloading the page.
            </p>
            <button
              onClick={() => unstable_retry()}
              style={{
                background: "#b8983f",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
