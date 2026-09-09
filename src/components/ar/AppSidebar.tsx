import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion, type Easing } from "motion/react";
import {
  CalendarDays,
  LayoutDashboard,
  FileBarChart,
  Hash,
  X,
  BookOpen,
  Tags,
  Send,
  KeyRound,
  Users,
  FileCheck2,
  Building2,
  ChevronDown,
} from "lucide-react";
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
import { useIsAdmin } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { AppLogo } from "@/components/ar/AppLogo";
import { AppFavicon } from "@/components/ar/AppFavicon";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePreload";
import { APP_VERSION } from "@/lib/version";

const ease: Easing = [0.23, 1, 0.32, 1];

function buildGroups(isAdmin: boolean) {
  return [
    {
      label: "Dashboards",
      items: [
        { title: "Console", icon: LayoutDashboard, path: "/console" },
        { title: "Report", icon: FileBarChart, path: "/report" },
        { title: "Facilities", icon: Building2, path: "/facilities" },
        ...(isAdmin ? [{ title: "Team", icon: Users, path: "/team" }] : []),
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
    path: "/resources/cheat-sheet",
  },
  {
    title: "Test Patients & Labeling",
    icon: Tags,
    path: "/resources/test-patients",
  },
];

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const reduce = useReducedMotion();
  const isAdmin = useIsAdmin();
  const { variant } = useTheme();
  const isClassic = variant === "classic";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="flex flex-row items-center justify-between px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 py-3">
        <AppLogo className="h-12 object-contain group-data-[collapsible=icon]:hidden" />
        <AppFavicon
          alt="Basata.ai"
          className="size-7 object-contain hidden group-data-[collapsible=icon]:block mx-auto"
        />
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-foreground shrink-0 rounded-md hover:bg-white/10"
            onClick={() => setOpenMobile(false)}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent className={isClassic ? "py-2" : "py-3"}>
        {buildGroups(isAdmin).map((group) => (
          <div key={group.label} className={cn("group-data-[collapsible=icon]:mb-0", isClassic ? "mb-2" : "mb-1.5")}>
            {isClassic ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 group-data-[collapsible=icon]:hidden">
                <span className="size-1.5 bg-primary shrink-0" />
                <span className="font-mono text-2xs font-medium text-foreground uppercase tracking-[0.2em]">{group.label}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3.5 py-0.5 text-xs text-slate-600 dark:text-foreground font-normal group-data-[collapsible=icon]:hidden">
                <ChevronDown className="size-3 text-slate-500 dark:text-foreground/70 shrink-0" />
                <span>{group.label}</span>
              </div>
            )}

            <SidebarMenu className="px-2 group-data-[collapsible=icon]:px-1 space-y-0.5">
              {group.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path} className="relative">
                    {isClassic && active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary"
                        transition={reduce ? { duration: 0 } : { duration: 0.25, ease }}
                      />
                    )}
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        "relative z-10 h-9 text-xs font-medium [&>svg]:size-4 transition-colors",
                        isClassic
                          ? "rounded-md border border-transparent text-foreground data-[active=true]:!border-primary/40 data-[active=true]:!bg-primary/10 data-[active=true]:!text-primary data-[active=true]:[&>svg]:text-primary"
                          : "rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-foreground dark:hover:bg-[#283344] dark:hover:text-foreground data-[active=true]:!bg-[#dbeafe] data-[active=true]:!text-blue-600 data-[active=true]:[&>svg]:!text-blue-600 data-[active=true]:border-transparent dark:data-[active=true]:border dark:data-[active=true]:border-white/15 dark:data-[active=true]:!bg-[#384152] dark:data-[active=true]:!text-white dark:data-[active=true]:shadow-sm dark:data-[active=true]:[&>svg]:!text-white",
                        "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:[&>svg]:size-5",
                      )}
                    >
                      <Link
                        to={item.path}
                        onClick={() => isMobile && setOpenMobile(false)}
                        onMouseEnter={() => prefetchRoute(item.path)}
                        onFocus={() => prefetchRoute(item.path)}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>
        ))}

        <div className={cn("group-data-[collapsible=icon]:mb-0", isClassic ? "mb-2" : "mb-1.5")}>
          {isClassic ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 group-data-[collapsible=icon]:hidden">
              <span className="size-1.5 bg-primary shrink-0" />
              <span className="font-mono text-2xs font-medium text-foreground uppercase tracking-[0.2em]">Resources</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-0.5 text-xs text-slate-600 dark:text-foreground font-normal group-data-[collapsible=icon]:hidden">
              <ChevronDown className="size-3 text-slate-500 dark:text-foreground/70 shrink-0" />
              <span>Resources</span>
            </div>
          )}

          <SidebarMenu className="px-2 group-data-[collapsible=icon]:px-1 space-y-0.5">
            {externalLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <SidebarMenuItem key={link.path} className="relative">
                  {isClassic && active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary"
                      transition={reduce ? { duration: 0 } : { duration: 0.25, ease }}
                    />
                  )}
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={link.title}
                    className={cn(
                      "relative z-10 h-9 text-xs font-medium [&>svg]:size-4 transition-colors",
                      isClassic
                        ? "rounded-md border border-transparent text-foreground data-[active=true]:!border-primary/40 data-[active=true]:!bg-primary/10 data-[active=true]:!text-primary data-[active=true]:[&>svg]:text-primary"
                        : "rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-foreground dark:hover:bg-[#283344] dark:hover:text-foreground data-[active=true]:!bg-[#dbeafe] data-[active=true]:!text-blue-600 data-[active=true]:[&>svg]:!text-blue-600 data-[active=true]:border-transparent dark:data-[active=true]:border dark:data-[active=true]:border-white/15 dark:data-[active=true]:!bg-[#384152] dark:data-[active=true]:!text-white dark:data-[active=true]:shadow-sm dark:data-[active=true]:[&>svg]:!text-white",
                      "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:[&>svg]:size-5",
                    )}
                  >
                    <Link
                      to={link.path}
                      onClick={() => isMobile && setOpenMobile(false)}
                      onMouseEnter={() => prefetchRoute(link.path)}
                      onFocus={() => prefetchRoute(link.path)}
                    >
                      <link.icon />
                      <span className="flex-1 truncate">{link.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter className={isClassic ? undefined : "border-t border-border h-8 p-0 flex items-center justify-center"}>
        {isClassic ? (
          <>
            <SidebarSeparator />
            <div className="text-center pb-1 group-data-[collapsible=icon]:hidden">
              <p className="font-mono text-2xs text-foreground tracking-[0.2em]">{APP_VERSION}</p>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground font-normal select-none text-center group-data-[collapsible=icon]:hidden">
            Version: {APP_VERSION}
          </p>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
