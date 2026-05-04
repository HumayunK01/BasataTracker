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
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
      <div className="px-2 sm:px-2 py-2.5 sm:py-4 flex items-center justify-between">

        {/* Left: hamburger + date */}
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger className="shrink-0 h-9 w-9" />
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
        <div className="flex items-center gap-0 shrink-0">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground hover:text-foreground/80"
            onClick={() => navigate("/settings")}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground hover:text-foreground/80"
            onClick={toggle}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark"
              ? <Sun className="h-5 w-5" />
              : <Moon className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground hover:text-destructive"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
