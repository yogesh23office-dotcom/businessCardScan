import { useEffect, useState } from "react";

import { AuthCredentialsForm } from "@/components/auth/AuthCredentialsForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AuthScannerPanel } from "@/components/auth/AuthScannerPanel";
import { NeuralVortexBackground } from "@/components/ui/interactive-neural-vortex-background";
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_PHONE, LEGAL_PAGE_URLS } from "@/constants/legalContent";
import { neonAuthConfigIssue } from "@/lib/authConfig";
import { checkNeonAuthHealth } from "@/lib/authHealth";
import { useForceLightMode } from "@/hooks/useForceLightMode";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

function normalizeMode(pathname: string): AuthMode {
  if (pathname === "sign-up") return "sign-up";
  if (pathname === "forgot-password") return "forgot-password";
  return "sign-in";
}

export function AuthPage({ pathname }: { pathname: string }) {
  const mode = normalizeMode(pathname);
  useForceLightMode(true);
  const [authHealthMessage, setAuthHealthMessage] = useState<string | null>(null);

  useEffect(() => {
    if (neonAuthConfigIssue) return;
    checkNeonAuthHealth().then((status) => {
      if (!status.ok) setAuthHealthMessage(status.detail);
    });
  }, []);

  return (
    <div className="light flex min-h-svh w-full max-w-[100vw] flex-col overflow-x-hidden bg-background lg:min-h-svh lg:flex-row">
      {/* Left — dark vortex + hero copy (desktop only) */}
      <section className="relative hidden min-h-[45svh] w-full min-w-0 items-center justify-center overflow-hidden bg-[#070b14] lg:flex lg:min-h-svh lg:w-[42%]">
        <NeuralVortexBackground contained />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_0%,#070b14_75%)]" />

        <div className="relative z-10 flex w-full min-w-0 max-w-lg items-center justify-center px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <AuthScannerPanel />
        </div>
      </section>

      {/* Right — form panel (full width on mobile) */}
      <section className="relative flex min-h-svh w-full min-w-0 flex-1 flex-col overflow-x-hidden bg-[#f4f7fb] lg:min-h-svh lg:w-[58%]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-surface opacity-50" />
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 max-w-[50%] translate-x-1/4 rounded-full bg-violet-300/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 max-w-[50%] rounded-full bg-cyan-300/10 blur-3xl" />

        <header className="relative z-10 flex shrink-0 justify-end px-5 py-4 sm:px-10 lg:px-14">
          <div className="text-right text-sm leading-relaxed">
            <p className="font-medium text-[#1e3a5f]">Need help?</p>
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="block font-medium text-primary transition-colors hover:text-primary/80"
            >
             {LEGAL_CONTACT_EMAIL}
            </a>
            <a
              href={`tel:${LEGAL_CONTACT_PHONE}`}
              className="block font-medium text-primary transition-colors hover:text-primary/80"
            >
             {LEGAL_CONTACT_PHONE}
            </a>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto px-5 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="w-full min-w-0 max-w-xl sm:max-w-2xl lg:max-w-2xl">
            {neonAuthConfigIssue ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {neonAuthConfigIssue}
              </div>
            ) : null}
            {authHealthMessage ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {authHealthMessage}
              </div>
            ) : null}
            {mode === "forgot-password" ? (
              <ForgotPasswordForm />
            ) : (
              <AuthCredentialsForm mode={mode} />
            )}
          </div>
        </div>

        <footer className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4 text-center text-md text-[#1e3a5f] sm:px-10 lg:px-14">
          <a
            href={LEGAL_PAGE_URLS.privacy}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Privacy Policy
          </a>
          <span aria-hidden className="text-border">
            ·
          </span>
          <a
            href={LEGAL_PAGE_URLS.terms}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Terms &amp; Conditions
          </a>
        </footer>
      </section>
    </div>
  );
}
