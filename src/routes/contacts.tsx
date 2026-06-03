import { createFileRoute } from "@tanstack/react-router";
import { ContactsPage } from "@/pages/ContactsPage";
import { z } from "zod";

const contactsSearchSchema = z.object({
  q: z.string().optional().catch(""),
});

export const Route = createFileRoute("/contacts")({
  validateSearch: contactsSearchSchema,
  head: () => ({
    meta: [
      { title: "Contact directory · CardSync AI" },
      {
        name: "description",
        content: "Search, filter, and manage every lead saved on this device.",
      },
      { property: "og:title", content: "Contact directory · CardSync AI" },
      {
        property: "og:description",
        content: "Your complete lead library, organised by status and channel.",
      },
    ],
  }),
  component: ContactsPage,
});
