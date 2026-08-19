import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AppBoundary } from "../nova/AppBoundary";

// A stale build/chunk reference makes the dynamic import reject and blanks the
// page. Retry once, then force a hard reload to pick up the fresh bundle.
const NovaApp = lazy(async () => {
  try {
    return await import("../nova/App");
  } catch {
    try {
      return await import("../nova/App");
    } catch (err) {
      if (typeof window !== "undefined") window.location.reload();
      throw err;
    }
  }
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NOVA Studio — Pro Video Editor & Effects Library" },
      {
        name: "description",
        content:
          "NOVA Studio is a browser video editor with a Filmora-grade effects panel: live looping previews, 220+ presets, LUTs, transitions and a multi-track timeline.",
      },
      { property: "og:title", content: "NOVA Studio — Pro Video Editor & Effects Library" },
      {
        property: "og:description",
        content:
          "Edit in the browser with live video preset previews, LUTs, transitions and a multi-track timeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#111621] text-sm text-zinc-500">
          Loading NOVA Studio…
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#111621] text-sm text-zinc-500">
            Loading NOVA Studio…
          </div>
        }
      >
        <NovaApp />
      </Suspense>
    </ClientOnly>
  );
}
