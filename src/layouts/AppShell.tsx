import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, useRouteContext, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { AuthGate } from "@/components/auth/AuthGate";
import { syncConnectionModeWithNetwork } from "@/lib/connectionMode";
import { isAuthEnabled } from "@/lib/authConfig";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { NetworkOfflineBanner } from "@/components/layout/NetworkOfflineBanner";
import { ConfirmModalProvider } from "@/components/ui/confirm-modal";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { countPendingZohoSync, maybeAutoSyncToZohoWhenOnline } from "@/lib/autoZohoSync";
import { loadUserSettings } from "@/lib/settingsStorage";
import { useForceLightMode } from "@/hooks/useForceLightMode";
export function AppShell() {
  const { queryClient } = useRouteContext({ from: "__root__" });
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isAuthRoute = pathname.startsWith("/auth");
  const authRequired = isAuthEnabled;

  useForceLightMode(isAuthRoute);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const routesToPreload = ["/scan", "/contacts", "/queue", "/settings"];
    routesToPreload.forEach((path) => {
      router.preloadRoute({ to: path }).catch(() => undefined);
    });

    if ("serviceWorker" in navigator) {
      if (import.meta.env.DEV) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
          .then(() => caches.keys())
          .then((names) => Promise.all(names.map((name) => caches.delete(name))))
          .catch(() => undefined);
      } else {
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      }
    }

    const processAutoZohoSync = async () => {
      if (!navigator.onLine) return;

      const prefs = loadUserSettings();
      if (!prefs.autoSyncToZohoWhenOnline) return;

      try {
        const pending = await countPendingZohoSync();
        const totalPending = pending.queue + pending.contacts;
        if (totalPending === 0) return;

        const showToast = prefs.notificationsEnabled && prefs.queueNotificationsEnabled;
        if (showToast) {
          toast.info(`Syncing ${totalPending} contact(s) to Zoho CRM…`);
        }

        const summary = await maybeAutoSyncToZohoWhenOnline();
        if (!summary.ran) return;

        const synced = summary.queueSynced + summary.contactsSynced;
        const total = summary.queueTotal + summary.contactsTotal;
        if (synced > 0 && showToast) {
          toast.success(`Synced ${synced} of ${total} contact(s) to Zoho CRM.`);
        }

        window.dispatchEvent(new CustomEvent("cs-contacts-updated"));
        window.dispatchEvent(new CustomEvent("cs-queue-updated"));
      } catch {
        /* auto-sync is best-effort */
      }
    };

    const handleOnline = () => {
      syncConnectionModeWithNetwork();
      void processAutoZohoSync();
    };
    const handleOffline = () => {
      syncConnectionModeWithNetwork();
    };

    if (!navigator.onLine) {
      syncConnectionModeWithNetwork();
    } else {
      void processAutoZohoSync();
    }

    const handleConnectionModeChange = (e: Event) => {
      const mode = (e as CustomEvent<"online" | "offline">).detail;
      if (mode === "online" && navigator.onLine) {
        void processAutoZohoSync();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("cs-connection-mode-changed", handleConnectionModeChange);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("cs-connection-mode-changed", handleConnectionModeChange);
    };
  }, [router]);

  if (isAuthRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    );
  }

  const appContent = (
    <ConfirmModalProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <SidebarInset className="relative flex min-h-svh flex-1 flex-col bg-transparent">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-surface" />
            <div className="sticky top-0 z-40 shrink-0 border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
              <TopBar />
              <NetworkOfflineBanner />
            </div>
            <main className="min-h-0 flex-1 w-full max-w-full overflow-x-hidden overflow-y-auto">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
        <CookieConsentBanner />
      </SidebarProvider>
    </ConfirmModalProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {authRequired ? <AuthGate>{appContent}</AuthGate> : appContent}
    </QueryClientProvider>
  );
}
