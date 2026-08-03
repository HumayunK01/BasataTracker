import { useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion, type Easing } from "motion/react";
import { CalendarDays, LayoutDashboard, FileBarChart, Hash, X, BookOpen, Tags, ExternalLink, Send, KeyRound, Users, FileCheck2 } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { AppLogo } from "@/components/ar/AppLogo";
import { AppFavicon } from "@/components/ar/AppFavicon";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePreload";
import { APP_VERSION } from "@/lib/version";

const ease: Easing = [0.23, 1, 0.32, 1];

const TEAM_VIEWER_ID = "eaa58c9a-a0b8-4c00-9399-0e16fe8600ee";

function buildGroups(userId?: string) {
  return [
    {
      label: "Dashboards",
      items: [
        { title: "Console", icon: LayoutDashboard, path: "/console" },
        { title: "Report", icon: FileBarChart, path: "/report" },
        ...(userId === TEAM_VIEWER_ID ? [{ title: "Team", icon: Users, path: "/team" }] : []),
      ],
    },
    {
      label: "Documents",
      items: [
        { title: "Daily Log", icon: CalendarDays, path: "/log" },
        { title: "Counter", icon: Hash, path: "/counter" },
        { title: "Tracker", icon: Send, path: "/tracker" },
        { title: "Faxed Back", icon: FileCheck2, path: "/faxed-back" },
        { title: "Vault", icon: KeyRound, path: "/vault" },
      ],
    },
  ];
}

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
  const reduce = useReducedMotion();
  const { user } = useAuth();

  const go = (path: string) => {
    navigate(path);
    if (isMobile) setOpenMobile(false);
  };

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
            className="size-10 text-foreground shrink-0 rounded-md"
            onClick={() => setOpenMobile(false)}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent className="py-2">
        {buildGroups(user?.id).map((group) => (
          <div key={group.label} className="mb-2 group-data-[collapsible=icon]:mb-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:overflow-hidden">
              <span className="size-1.5 bg-primary shrink-0" />
              <span className="font-mono text-2xs font-medium text-foreground uppercase tracking-[0.2em]">{group.label}</span>
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
                        "relative z-10 rounded-md border border-transparent h-9 text-xs font-medium [&>svg]:size-4",
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
            <span className="font-mono text-2xs font-medium text-foreground uppercase tracking-[0.2em]">Resources</span>
          </div>

          <SidebarMenu className="px-2 group-data-[collapsible=icon]:px-1 space-y-0.5">
            {externalLinks.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  tooltip={link.title}
                  className="relative z-10 rounded-md border border-transparent h-9 text-xs font-medium [&>svg]:size-4 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:[&>svg]:size-5"
                >
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    <link.icon />
                    <span className="flex-1 truncate">{link.title}</span>
                    <ExternalLink className="size-4 shrink-0 text-foreground group-data-[collapsible=icon]:hidden" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="text-center pb-1 group-data-[collapsible=icon]:hidden">
          <p className="font-mono text-2xs text-foreground tracking-[0.2em]">{APP_VERSION}</p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
