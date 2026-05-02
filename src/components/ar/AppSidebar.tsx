import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, LayoutDashboard, Settings, FileBarChart, LogOut, Hash, X } from "lucide-react";
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
  const { signOut, user } = useAuth();

  const go = (path: string) => {
    navigate(path);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">

      {/* Mobile header — logo + close */}
      {isMobile && (
        <SidebarHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border">
          <AppLogo className="h-8 object-contain" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => setOpenMobile(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </SidebarHeader>
      )}

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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname === "/settings"}
              onClick={() => go("/settings")}
              tooltip="Settings"
              className={isMobile ? "h-12 text-base" : ""}
            >
              <Settings className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Sign out"
              className={`text-muted-foreground hover:text-destructive ${isMobile ? "h-12 text-base" : ""}`}
            >
              <LogOut className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
