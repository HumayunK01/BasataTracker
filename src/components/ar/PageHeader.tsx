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
      <div className="px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2">

        {/* Left: hamburger + logo + date */}
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger className="shrink-0 h-9 w-9" />
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <AppLogo className="h-7 sm:h-8 object-contain shrink-0" />
            <div className="min-w-0 hidden xs:block">
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {formatHeaderDate(date)}
              </p>
              {subtitle && (
                <div className="text-xs font-medium truncate leading-tight mt-0.5">
                  {subtitle}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: actions + theme toggle */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={toggle}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark"
              ? <Sun className="h-4 w-4" />
              : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
