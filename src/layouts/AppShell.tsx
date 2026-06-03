import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, useRouteContext, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { syncConnectionModeWithNetwork } from "@/lib/connectionMode";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Toaster } from "@/components/ui/sonner";
import { getQueueItems } from "@/lib/indexeddb";
import { syncAllQueueItemsToZoho } from "@/lib/contactStorage";
export function AppShell() {
  const { queryClient } = useRouteContext({ from: "__root__" });
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const routesToPreload = ["/scan", "/contacts", "/queue", "/settings"];
    routesToPreload.forEach((path) => {
      router.preloadRoute({ to: path }).catch((err) => {
        console.warn(`[Preload] Failed to preload route ${path}:`, err);
      });
    });

    if ("serviceWorker" in navigator) {
      if (import.meta.env.DEV) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
          .then(() => caches.keys())
          .then((names) => Promise.all(names.map((name) => caches.delete(name))))
          .then(() => console.log("[SW] Dev mode: unregistered service workers and cleared caches"))
          .catch((err) => console.warn("[SW] Dev cleanup warning:", err));
      } else {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("[SW] Registered successfully with scope:", reg.scope))
          .catch((err) => console.error("[SW] Registration failed:", err));
      }
    }

    const processOfflineQueue = async () => {
      if (!navigator.onLine) return;

      try {
        const queue = await getQueueItems();
        const unsynced = queue.filter(
          (item) => item.status === "pending" || item.status === "retrying",
        );
        if (unsynced.length === 0) return;

        toast.info(`Saving ${unsynced.length} queued contact(s) on this device…`);
        const { synced, total } = await syncAllQueueItemsToZoho();
        if (synced > 0) {
          toast.success(`Saved ${synced} of ${total} contact(s) on this device.`);
        }
        window.dispatchEvent(new CustomEvent("cs-contacts-updated"));
        window.dispatchEvent(new CustomEvent("cs-queue-updated"));
      } catch (queueErr) {
        console.error("Failed to read/process IndexedDB queue:", queueErr);
      }
    };

    const handleOnline = () => {
      syncConnectionModeWithNetwork();
      processOfflineQueue();
    };
    const handleOffline = () => {
      syncConnectionModeWithNetwork();
    };

    if (!navigator.onLine) {
      syncConnectionModeWithNetwork();
    } else {
      processOfflineQueue();
    }

    const handleConnectionModeChange = (e: Event) => {
      const mode = (e as CustomEvent<"online" | "offline">).detail;
      if (mode === "online" && navigator.onLine) {
        processOfflineQueue();
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

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <SidebarInset className="relative flex min-h-svh flex-1 flex-col bg-transparent">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-surface" />
            <div className="sticky top-0 z-40 shrink-0 border-b border-border/40 bg-background/95  backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
              <TopBar />
            </div>
            <main className="min-h-0 flex-1 w-full max-w-full overflow-x-hidden overflow-y-auto">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
        <Toaster position="top-right" />
      </SidebarProvider>
    </QueryClientProvider>
  );
}
