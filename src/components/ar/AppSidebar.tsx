import { useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion, type Easing } from "motion/react";
import { CalendarDays, LayoutDashboard, FileBarChart, Hash, X, Settings, Sun, Moon, LogOut, BookOpen, Tags, ExternalLink, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useProfile } from "@/hooks/useProfile";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppLogo } from "@/components/ar/AppLogo";
import { AppFavicon } from "@/components/ar/AppFavicon";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePreload";

const ease: Easing = [0.23, 1, 0.32, 1];

const groups = [
      {
        label: "Dashboards",
        items: [
          { title: "Console", icon: LayoutDashboard, path: "/" },
          { title: "Report", icon: FileBarChart, path: "/report" },
        ],
      },
      {
        label: "Documents",
        items: [
          { title: "Counter", icon: Hash, path: "/counter" },
          { title: "Daily Log", icon: CalendarDays, path: "/log" },
          { title: "Tracker", icon: Send, path: "/tracker" },
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
  const { data: profile } = useProfile();
  const reduce = useReducedMotion();

  const go = (path: string) => {
    navigate(path);
    if (isMobile) setOpenMobile(false);
  };

  const email = user?.email ?? "";
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email;
  const initials = (() => {
    const f = profile?.first_name?.[0] ?? "";
    const l = profile?.last_name?.[0] ?? "";
    return ((f + l) || email[0] || "?").toUpperCase();
  })();


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        <AppLogo className="h-12 object-contain group-data-[collapsible=icon]:hidden" />
        <AppFavicon
          alt="Basata.ai"
          className="size-7 object-contain hidden group-data-[collapsible=icon]:block mx-auto"
        />
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="size-10 text-muted-foreground shrink-0 rounded-none"
            onClick={() => setOpenMobile(false)}
          >
            <X className="size-5" />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent className="py-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-2 group-data-[collapsible=icon]:mb-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:overflow-hidden">
              <span className="size-1.5 bg-primary shrink-0" />
              <span className="font-mono text-2xs font-medium text-muted-foreground uppercase tracking-[0.2em]">{group.label}</span>
            </div>

            <SidebarMenu className="px-2 group-data-[collapsible=icon]:px-1 space-y-0.5">
              {group.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path} className="relative">
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary"
                        transition={reduce ? { duration: 0 } : { duration: 0.25, ease }}
                      />
                    )}
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      onClick={() => go(item.path)}
                      onMouseEnter={() => prefetchRoute(item.path)}
                      onFocus={() => prefetchRoute(item.path)}
                      className={cn(
                        "relative z-10 rounded-none border border-transparent h-9 text-xs font-mono uppercase tracking-wide [&>svg]:size-4",
                        "data-[active=true]:!border-primary/40 data-[active=true]:!bg-primary/10 data-[active=true]:!text-primary",
                        "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:[&>svg]:size-5",
                      )}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>
        ))}

        <div className="mb-2 group-data-[collapsible=icon]:mb-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:overflow-hidden">
            <span className="size-1.5 bg-primary shrink-0" />
            <span className="font-mono text-2xs font-medium text-muted-foreground uppercase tracking-[0.2em]">Resources</span>
          </div>

          <SidebarMenu className="px-2 group-data-[collapsible=icon]:px-1 space-y-0.5">
            {externalLinks.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  tooltip={link.title}
                  className="relative z-10 rounded-none border border-transparent h-9 text-xs font-mono uppercase tracking-wide [&>svg]:size-4 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:[&>svg]:size-5"
                >
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    <link.icon />
                    <span className="flex-1 truncate">{link.title}</span>
                    <ExternalLink className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="grid size-8 place-items-center rounded-none bg-primary/15 text-primary text-xs font-mono font-semibold shrink-0">
            {initials}
          </div>
          <p className="text-xs font-mono truncate text-muted-foreground group-data-[collapsible=icon]:hidden">{name}</p>
        </div>
        <div className="flex items-center gap-1 px-2 pb-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-0">
          <Button
            variant="ghost"
            size="icon"
            className="flex-1 size-9 text-foreground hover:text-foreground/80 rounded-none border border-sidebar-border group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:size-8"
            onClick={() => { navigate("/settings"); setOpenMobile(false); }}
            title="Settings"
          >
            <Settings className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="flex-1 size-9 text-foreground hover:text-foreground/80 rounded-none border border-sidebar-border group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:size-8"
            onClick={toggle}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex-1 size-9 text-foreground hover:text-destructive rounded-none border border-sidebar-border group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:size-8"
                title="Sign out"
              >
                <LogOut className="size-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll need to sign in again to access your tracker.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => { signOut(); setOpenMobile(false); }}
                >
                  Sign out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="text-center pb-1 group-data-[collapsible=icon]:hidden">
          <p className="font-mono text-2xs text-muted-foreground/50 tracking-[0.2em]">v1.2.1</p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
