import { createFileRoute } from "@tanstack/react-router";
import { StatusPage } from "@/pages/StatusPage";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [{ title: "API Status · CardSync AI" }],
  }),
  component: StatusPage,
});
