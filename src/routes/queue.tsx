import { createFileRoute } from "@tanstack/react-router";
import { QueuePage } from "@/pages/QueuePage";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "Queue Center · CardSync AI" },
      {
        name: "description",
        content: "Browser queue → local PostgreSQL → Zoho CRM sync pipeline.",
      },
    ],
  }),
  component: QueuePage,
});
