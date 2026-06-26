import { UserCircle2, Settings, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { authClient } from "@/auth";
import { isAuthEnabled } from "@/lib/authConfig";
import { clearAuthTokenCache } from "@/lib/authSession";
import { invalidateContactsDirectory } from "@/lib/contactsDirectory";
import { getQueueItems } from "@/lib/indexeddb";
import { seedOfflineSampleContact } from "@/lib/contactStorage";
import { isIndexedDbStorage } from "@/lib/storageConfig";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CONNECTION_MODE_CHANGED,
  getConnectionMode,
  syncConnectionModeWithNetwork,
  type ConnectionMode,
} from "@/lib/connectionMode";

export function TopBar() {
  const [connectionMode, setConnectionModeState] = useState<ConnectionMode>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const { fullName: profileName, initials: profileInitials } = useUserSettings();
  const { data: authSession } = authClient.useSession();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const displayName =
    profileName ||
    authSession?.user?.name?.trim() ||
    authSession?.user?.email?.trim() ||
    "Account";

  const avatarInitials =
    profileInitials ||
    authSession?.user?.name?.trim()?.slice(0, 2).toUpperCase() ||
    authSession?.user?.email?.trim()?.slice(0, 2).toUpperCase() ||
    "??";

  const handleSignOut = async () => {
    clearAuthTokenCache();
    invalidateContactsDirectory();
    if (isAuthEnabled) {
      await authClient.signOut();
      navigate({ to: "/auth/$pathname", params: { pathname: "sign-in" } });
      return;
    }
    navigate({ to: "/scan" });
  };

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isContacts = pathname.startsWith("/contacts");

  const contactsQuery = useRouterState({
    select: (s) => {
      if (!s.location.pathname.startsWith("/contacts")) return "";
      return new URLSearchParams(s.location.search).get("q") ?? "";
    },
  });

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
    if (isIndexedDbStorage()) return;
    const result = await seedOfflineSampleContact();
    if (result.seeded) {
      window.dispatchEvent(new CustomEvent("cs-contacts-updated"));
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    updatePendingCount();
    document.documentElement.classList.remove("dark");

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

  const headerSearch = (className: string, placeholder?: string) => (
    <HeaderSearch
      className={className}
      placeholder={placeholder}
      urlQuery={isContacts ? contactsQuery : ""}
    />
  );

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

      <div className="flex min-w-0 flex-1 px-1 sm:px-2 md:justify-start">
        {headerSearch(
          cn(
            "w-full max-w-full",
            isContacts ? "md:max-w-md" : "md:max-w-sm lg:max-w-md",
          ),
          isMobile ? "Search contacts…" : undefined,
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
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
              {avatarInitials}
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
              <span className="truncate">{displayName}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
              <Settings className="mr-2 h-4 w-4" />
              Preferences
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleSignOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
