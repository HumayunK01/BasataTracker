import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Settings, LogOut } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { formatHeaderDate } from "@/types/log";

interface PageHeaderProps {
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  now?: Date;
}

export function PageHeader({ subtitle, actions, now }: PageHeaderProps) {
  const { theme, toggle } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const date = now ?? new Date();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card shrink-0">
      <div className="px-3 sm:px-4 py-1 sm:py-2 flex items-center justify-between gap-2">

        {/* Left: hamburger + date */}
        <div className="flex items-center gap-2 min-w-0 -ml-2">
          <SidebarTrigger className="shrink-0 h-8 w-8 [&>svg]:h-6 [&>svg]:w-6" />
          <div className="min-w-0">
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

        {/* Right: actions + settings + sign out + theme toggle */}
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground hover:text-foreground/80"
            onClick={() => navigate("/settings")}
            title="Settings"
          >
            <Settings className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground hover:text-foreground/80"
            onClick={toggle}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark"
              ? <Sun className="h-8 w-8" />
              : <Moon className="h-8 w-8" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground hover:text-destructive"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </header>
  );
}
