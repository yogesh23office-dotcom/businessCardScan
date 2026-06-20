import { Link, useRouterState } from "@tanstack/react-router";
import { AppLogo } from "@/components/brand/AppLogo";
import { sidebarItems } from "@/constants/sidebarItems";
import { NAV_SECTION_LABEL } from "@/constants/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = sidebarItems.filter((item) =>
  ["/scan", "/contacts", "/events", "/queue", "/settings"].includes(item.url),
);

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string) => {
    if (url === "/scan") {
      return path === "/scan" || path === "/" || path.startsWith("/review");
    }
    return path.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="px-3 pt-4">
        <Link to="/scan" className="flex items-center gap-2.5 px-2 py-1.5">
          <AppLogo size={collapsed ? "sm" : "md"} />
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-[15px] font-semibold tracking-tight">CardScan</div>
              <div className="text-[11px] text-muted-foreground">Scan · Detect · Extract</div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
            {NAV_SECTION_LABEL}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="h-10 rounded-[0.5rem] data-[active=true]:rounded-[0.5rem] data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-medium"
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && (
                          <span className="text-sm font-medium tracking-tight">{item.title}</span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
