import { Moon, Sun, UserCircle2, Settings, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { useCallback, useEffect, useState } from "react";
import { getQueueItems } from "@/lib/indexeddb";
import { seedOfflineSampleContact } from "@/lib/contactStorage";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import {
  CONNECTION_MODE_CHANGED,
  getConnectionMode,
  syncConnectionModeWithNetwork,
  type ConnectionMode,
} from "@/lib/connectionMode";

export function TopBar() {
  const [connectionMode, setConnectionModeState] = useState<ConnectionMode>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [dark, setDark] = useState(false);
  const { fullName: profileName, initials: profileInitials } = useUserSettings();
  const navigate = useNavigate();

  const isOnline = connectionMode === "online";

  const refreshConnectionMode = useCallback(() => {
    setConnectionModeState(getConnectionMode());
  }, []);

  const updatePendingCount = async () => {
    try {
      const items = await getQueueItems();
      const unsynced = items.filter((item) => item.status !== "synced");
      setPendingCount(unsynced.length);
    } catch (e) {
      console.error("[TopBar] Failed to read queue count:", e);
    }
  };

  const ensureOfflineSample = async () => {
    const result = await seedOfflineSampleContact();
    if (result.seeded) {
      window.dispatchEvent(new CustomEvent("cs-contacts-updated"));
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    updatePendingCount();
    const stored = localStorage.getItem("cs-dark") === "1";
    setDark(stored);
    document.documentElement.classList.toggle("dark", stored);

    syncConnectionModeWithNetwork();
    refreshConnectionMode();
    if (getConnectionMode() === "offline") {
      void ensureOfflineSample();
    }

    const handleNetworkOnline = () => {
      syncConnectionModeWithNetwork();
      refreshConnectionMode();
    };

    const handleNetworkOffline = () => {
      syncConnectionModeWithNetwork();
      refreshConnectionMode();
      void ensureOfflineSample();
    };

    const handleModeChanged = () => refreshConnectionMode();

    window.addEventListener("online", handleNetworkOnline);
    window.addEventListener("offline", handleNetworkOffline);
    window.addEventListener(CONNECTION_MODE_CHANGED, handleModeChanged);
    window.addEventListener("cs-queue-updated", updatePendingCount);

    return () => {
      window.removeEventListener("online", handleNetworkOnline);
      window.removeEventListener("offline", handleNetworkOffline);
      window.removeEventListener(CONNECTION_MODE_CHANGED, handleModeChanged);
      window.removeEventListener("cs-queue-updated", updatePendingCount);
    };
  }, [refreshConnectionMode]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("cs-dark", next ? "1" : "0");
  };

  return (
    <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 md:px-6">
      <div className="flex min-w-0 items-center justify-start">
        <SidebarTrigger
          icon="menu"
          className="-ml-1 h-9 w-9 rounded-xl border border-border/60 bg-card/60 md:hidden"
          aria-label="Open menu"
          title="Open menu"
        />
      </div>

      <div className="flex min-w-0 justify-center px-1 sm:px-2">
        <HeaderSearch className="w-full max-w-md" />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-xl border-border/60 bg-card/60"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-medium text-warning-foreground shadow-soft">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-warning/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
            </span>
            <span className="hidden min-[380px]:inline">{pendingCount} unsynced</span>
            <span className="min-[380px]:hidden">{pendingCount}</span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow"
              title={isOnline ? "Online" : "Offline"}
              aria-label={`Profile menu — ${isOnline ? "online" : "offline"}`}
            >
              {profileInitials}
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                  isOnline ? "bg-green-500" : "bg-red-500"
                }`}
                aria-hidden
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuLabel className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{profileName}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
