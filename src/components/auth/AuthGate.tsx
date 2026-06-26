import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { authClient } from "@/auth";
import { syncProfileFromAuthUser } from "@/lib/authProfileSync";

function resolvePostAuthPath(): string {
  if (typeof window === "undefined") return "/scan";
  const redirectTo = new URLSearchParams(window.location.search).get("redirectTo");
  if (redirectTo?.startsWith("/") && !redirectTo.startsWith("/auth")) {
    return redirectTo;
  }
  return "/scan";
}

/** Blocks protected routes until Neon Auth session is resolved — prevents scan/login flicker. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      syncProfileFromAuthUser(session.user);
    }
  }, [session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (isPending || session?.user) return;

    const redirectTo = `${pathname}${searchStr}`;
    navigate({
      to: "/auth/$pathname",
      params: { pathname: "sign-in" },
      search: { redirectTo },
      replace: true,
    });
  }, [isPending, session?.user, pathname, searchStr, navigate]);

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading session" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return <>{children}</>;
}

export { resolvePostAuthPath };
