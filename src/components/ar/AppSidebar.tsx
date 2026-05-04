import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, LayoutDashboard, FileBarChart, Hash, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,

} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ar/AppLogo";

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Daily Log", icon: CalendarDays, path: "/log" },
  { title: "Counter", icon: Hash, path: "/counter" },
  { title: "Report", icon: FileBarChart, path: "/report" },
];

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const go = (path: string) => {
    navigate(path);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">

      {/* Sidebar header — logo always visible, close button on mobile */}
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-3">
        <AppLogo className="h-10 object-contain group-data-[collapsible=icon]:hidden" />
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground shrink-0"
            onClick={() => setOpenMobile(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Mobile user info */}
        {isMobile && user?.email && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Signed in as</p>
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => go(item.path)}
                    tooltip={item.title}
                    className={isMobile ? "h-12 text-base" : ""}
                  >
                    <item.icon className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="text-center group-data-[collapsible=icon]:hidden">
          <p className="text-xs text-muted-foreground/50">Version 1.0.0</p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
