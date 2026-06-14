import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, LayoutDashboard, FileBarChart, Hash, X, ChevronDown, Settings, Sun, Moon, LogOut, Users, BookOpen, Tags, ExternalLink, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ar/AppLogo";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Dashboards",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/" },
      { title: "Report", icon: FileBarChart, path: "/report" },
      { title: "Users", icon: Users, path: "/users" },
    ],
  },
  {
    label: "Documents",
    items: [
      { title: "Counter", icon: Hash, path: "/counter" },
      { title: "Daily Log", icon: CalendarDays, path: "/log" },
      { title: "Fax Tracker", icon: Send, path: "/fax-tracker" },
    ],
  },
];

const externalLinks = [
  {
    title: "Phoenix Heart Cheat Sheet",
    icon: BookOpen,
    href: "https://docs.google.com/document/d/1y7xmLogt9vMhUKO-ADUEtZgqXp39q9Ts_V8TTiKlgUg/edit?tab=t.0",
  },
  {
    title: "Test Patients & Labeling",
    icon: Tags,
    href: "https://docs.google.com/document/d/1C0aKOgsXKyU0XzDUB2oPnxaW0QUhUDSppSiL81JEvr8/edit?pli=1&tab=t.0",
  },
];

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  const go = (path: string) => {
    navigate(path);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">

      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        <AppLogo className="h-12 object-contain group-data-[collapsible=icon]:hidden" />
        <img
          src="/favicon.png"
          alt="Basata.ai"
          className="size-7 object-contain hidden group-data-[collapsible=icon]:block mx-auto"
        />
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-muted-foreground shrink-0"
            onClick={() => setOpenMobile(false)}
          >
            <X className="size-6" />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent className="py-2">
        {isMobile && user?.email && (
          <div className="px-4 py-2 border-b border-border mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Signed in as</p>
            <p className="text-base font-medium truncate">{user.email}</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label} className="mb-1 group-data-[collapsible=icon]:mb-0">
            {/* Group label */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:overflow-hidden">
              <ChevronDown className="size-4 md:size-3.5 text-foreground shrink-0" />
              <span className="text-sm md:text-xs font-bold text-foreground uppercase tracking-wide font-[system-ui]">{group.label}</span>
            </div>

            {/* Nav items */}
            <ul className="space-y-0.5 px-2 group-data-[collapsible=icon]:px-1">
              {group.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => go(item.path)}
                      title={item.title}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-base transition-colors",
                        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:mx-auto",
                        active
                          ? "bg-sidebar-accent font-medium"
                          : "text-foreground hover:bg-sidebar-accent/60",
                      )}
                      style={active ? { color: "hsl(var(--sidebar-primary))" } : undefined}
                    >
                      <item.icon className="size-5 md:size-4 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden truncate font-[system-ui]">{item.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="mb-1 group-data-[collapsible=icon]:mb-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:overflow-hidden">
            <ChevronDown className="size-4 md:size-3.5 text-foreground shrink-0" />
            <span className="text-sm md:text-xs font-bold text-foreground uppercase tracking-wide font-[system-ui]">Resources</span>
          </div>

          <ul className="space-y-0.5 px-2 group-data-[collapsible=icon]:px-1">
            {externalLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.title}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-base transition-colors",
                    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:mx-auto",
                    "text-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  <link.icon className="size-5 md:size-4 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden truncate font-[system-ui] flex-1">{link.title}</span>
                  <ExternalLink className="size-4 md:size-3 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        {isMobile && (
          <ul className="space-y-0.5 px-2 py-1">
            <li>
              <button
                onClick={() => { navigate("/settings"); setOpenMobile(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-base transition-colors text-foreground hover:bg-sidebar-accent/60"
              >
                <Settings className="size-5 shrink-0" />
                <span className="font-[system-ui]">Settings</span>
              </button>
            </li>
            <li>
              <button
                onClick={toggle}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-base transition-colors text-foreground hover:bg-sidebar-accent/60"
              >
                {theme === "dark"
                  ? <Sun className="size-5 shrink-0" />
                  : <Moon className="size-5 shrink-0" />}
                <span className="font-[system-ui]">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
            </li>
            <li>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-base transition-colors text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-5 shrink-0" />
                <span className="font-[system-ui]">Sign out</span>
              </button>
            </li>
          </ul>
        )}
        <div className="text-center group-data-[collapsible=icon]:hidden pb-1">
          <p className="text-xs text-muted-foreground/50">Version 1.2.0</p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
