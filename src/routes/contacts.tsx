import { createFileRoute } from "@tanstack/react-router";
import { ContactsPage } from "@/pages/ContactsPage";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts · CardSync AI" },
      {
        name: "description",
        content: "Search, filter and manage every contact captured across events and devices.",
      },
      { property: "og:title", content: "Contacts · CardSync AI" },
      {
        property: "og:description",
        content: "Your full lead database, filtered by sync state and channel.",
      },
    ],
  }),
  component: ContactsPage,
});
