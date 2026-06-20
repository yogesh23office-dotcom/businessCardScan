import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPage } from "@/pages/AuthPage";
import { authClient } from "@/auth";
import { clearAuthTokenCache } from "@/lib/authSession";

export const Route = createFileRoute("/auth/$pathname")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      {
        title:
          params.pathname === "sign-up"
            ? "Create account · CardSync AI"
            : params.pathname === "forgot-password"
              ? "Reset password · CardSync AI"
              : "Sign in · CardSync AI",
      },
    ],
  }),
  beforeLoad: async ({ params }) => {
    if (params.pathname === "sign-out") {
      clearAuthTokenCache();
      await authClient.signOut();
      throw redirect({ to: "/auth/$pathname", params: { pathname: "sign-in" }, replace: true });
    }

    if (params.pathname === "reset-password") {
      throw redirect({ to: "/auth/$pathname", params: { pathname: "forgot-password" }, replace: true });
    }
  },
  component: AuthRoute,
});

function AuthRoute() {
  const { pathname } = Route.useParams();
  return <AuthPage pathname={pathname} />;
}
