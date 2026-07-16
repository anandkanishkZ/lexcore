"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { captureClientError } from "@/lib/error-tracking";

/**
 * Catches any uncaught render-time error anywhere under the root layout
 * (a single page/route segment crashing) and shows a real fallback instead
 * of a blank white screen — nothing filled this role before. See
 * global-error.tsx for the layout-itself-crashed case this can't catch.
 */
export default function ErrorPage({
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-7 w-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500">
          This page hit an unexpected error. It&apos;s been logged — try again, or head back to the dashboard.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => unstable_retry()}
            className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-medium text-white hover:bg-[#a3853a] transition"
          >
            Try again
          </button>
          <Link
            href="/admin"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
