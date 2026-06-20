import { Outlet, useNavigate } from "@tanstack/react-router";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";

import { authClient } from "@/auth";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/layouts/AppShell";

export function RootLayout() {
  const navigate = useNavigate();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      defaultTheme="light"
      navigate={(href) => {
        navigate({ to: href });
      }}
      credentials={{ forgotPassword: true }}
    >
      <AppShell />
      <Toaster position="top-right" />
    </NeonAuthUIProvider>
  );
}
