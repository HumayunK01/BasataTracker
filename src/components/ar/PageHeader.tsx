import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Settings, LogOut } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { formatHeaderDate } from "@/types/log";

interface PageHeaderProps {
  subtitle?: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  now?: Date;
}

export function PageHeader({ subtitle, title, actions, now }: PageHeaderProps) {
  const { theme, toggle } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const date = now ?? new Date();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card shrink-0">
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2">

        {/* Left: hamburger + date/title */}
        <div className="flex items-center gap-2 min-w-0 -ml-2">
          <SidebarTrigger className="shrink-0 size-11 md:size-9 [&>svg]:h-7 [&>svg]:w-7" />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate leading-tight">
              {formatHeaderDate(date)}
            </p>
            {(title || subtitle) && (
              <div className="text-base md:text-sm font-medium truncate leading-tight mt-0.5">
                {title ?? subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Right: actions + settings + sign out + theme toggle (hidden on mobile, shown on desktop) */}
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          <span className="hidden md:inline text-sm font-medium text-foreground">
            Pheonix Heart
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex size-10 text-foreground hover:text-foreground/80"
            onClick={() => navigate("/settings")}
            title="Settings"
          >
            <Settings className="size-9" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="flex size-11 md:size-10 text-foreground hover:text-foreground/80"
            onClick={toggle}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark"
              ? <Sun className="size-8 md:size-9" />
              : <Moon className="size-8 md:size-9" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex size-10 text-foreground hover:text-destructive"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="size-9" />
          </Button>
        </div>
      </div>
    </header>
  );
}
