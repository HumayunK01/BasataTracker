import { useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion, type Easing } from "motion/react";
import { CalendarDays, LayoutDashboard, FileBarChart, Hash, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Counter", icon: Hash, path: "/counter" },
  { title: "Daily Log", icon: CalendarDays, path: "/log" },
  { title: "Tracker", icon: Send, path: "/tracker" },
  { title: "Report", icon: FileBarChart, path: "/report" },
];

const ease: Easing = [0.23, 1, 0.32, 1];

export function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

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
                "relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-12 touch-manipulation transition-colors press-scale",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="tab-active"
                  className="absolute inset-x-5 -bottom-px h-0.5 rounded-full bg-primary"
                  transition={reduce ? { duration: 0 } : { duration: 0.25, ease }}
                />
              )}
              <tab.icon className={cn("size-4 transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
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
