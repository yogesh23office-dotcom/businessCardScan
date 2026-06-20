import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import appCss from "../global.css?url";
import { RootDocument } from "@/layouts/RootDocument";
import { RootLayout } from "@/layouts/RootLayout";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { RouteErrorPage } from "@/pages/RouteErrorPage";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CardSync AI — AI Business Card Scanner" },
      {
        name: "description",
        content:
          "AI-powered offline-first business card scanner with intelligent queueing for enterprise networking.",
      },
      { name: "author", content: "CardSync AI" },
      { property: "og:title", content: "CardSync AI" },
      {
        property: "og:description",
        content: "AI-powered offline-first lead capture for enterprise networking events.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
});
