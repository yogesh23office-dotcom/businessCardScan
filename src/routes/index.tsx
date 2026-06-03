import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scan Card · CardSync AI" },
      { name: "description", content: "Capture business cards with AI-powered OCR." },
      { property: "og:title", content: "Scan a card · CardSync AI" },
      { property: "og:description", content: "AI extracts contact details from any business card in seconds." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/scan", replace: true });
  },
});
