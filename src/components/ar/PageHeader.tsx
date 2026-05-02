import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { AppLogo } from "@/components/ar/AppLogo";
import { useTheme } from "@/hooks/useTheme";
import { formatHeaderDate } from "@/types/log";

interface PageHeaderProps {
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  now?: Date;
}

export function PageHeader({ subtitle, actions, now }: PageHeaderProps) {
  const { theme, toggle } = useTheme();
  const date = now ?? new Date();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        {/* Left: trigger + logo + date */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <SidebarTrigger className="shrink-0" />
          <div className="flex items-center gap-3 min-w-0">
            <AppLogo className="h-7 sm:h-9 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{formatHeaderDate(date)}</p>
              {subtitle && <div className="text-[11px] sm:text-xs font-medium truncate">{subtitle}</div>}
            </div>
          </div>
        </div>

        {/* Right: actions + theme toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggle}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
