import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/SettingsPage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · CardSync AI" },
      {
        name: "description",
        content: "Profile, integrations, notification and appearance preferences.",
      },
      { property: "og:title", content: "Settings · CardSync AI" },
      { property: "og:description", content: "Manage your CardSync workspace preferences." },
    ],
  }),
  component: SettingsPage,
});
