import { Link } from "@tanstack/react-router";
import { ArrowLeft, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl text-center">
        <div className="relative mx-auto mb-8 max-w-xl overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-violet-500/10 p-2 shadow-elevated">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-violet-500/15 blur-3xl" />
          <img
            src="/images/404-highlight.png"
            alt="Illustration of a business card being searched — page not found"
            className="relative z-10 w-full rounded-2xl object-cover"
            width={960}
            height={540}
            loading="eager"
          />
        </div>

        <p className="font-display text-8xl font-bold tracking-tighter text-transparent bg-gradient-to-br from-primary via-violet-500 to-primary bg-clip-text sm:text-9xl">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          This page isn&apos;t here
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          The link may be broken, or the page was moved. Head back to scan cards and manage your
          contacts.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="w-full rounded-xl bg-gradient-primary shadow-glow sm:w-auto">
            <Link to="/scan">
              <ScanLine className="mr-2 h-4 w-4" />
              Go to Scan
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-xl border-border/60 sm:w-auto">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
