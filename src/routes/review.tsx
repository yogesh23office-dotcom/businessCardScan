import { createFileRoute } from "@tanstack/react-router";
import { ReviewPage } from "@/pages/ReviewPage";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review extracted details · CardSync AI" },
      {
        name: "description",
        content: "Review OCR extracted business card details before saving.",
      },
    ],
  }),
  component: ReviewPage,
});
