import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, LayoutDashboard, FileBarChart, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Counter", icon: Hash, path: "/counter" },
  { title: "Daily Log", icon: CalendarDays, path: "/log" },
  { title: "Report", icon: FileBarChart, path: "/report" },
];

export function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="md:hidden shrink-0 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-14 touch-manipulation transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <tab.icon className={cn("size-5", active && "drop-shadow-sm")} strokeWidth={active ? 2.5 : 2} />
              <span className={cn("text-xs leading-none", active ? "font-semibold" : "font-medium")}>
                {tab.title}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
