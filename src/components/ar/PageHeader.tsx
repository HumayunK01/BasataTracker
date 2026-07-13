import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { AppFavicon } from "@/components/ar/AppFavicon";
import { formatHeaderDate } from "@/types/log";

interface PageHeaderProps {
  subtitle?: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  now?: Date;
}

export function PageHeader({ subtitle, title, actions, now }: PageHeaderProps) {
  const { theme, toggle } = useTheme();
  const date = now ?? new Date();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shrink-0">
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        {/* Left: hamburger + technical date/title */}
        <div className="flex items-center gap-2 min-w-0 -ml-2">
          <SidebarTrigger className="shrink-0 size-10 md:size-8 [&>svg]:h-5 [&>svg]:w-5" />
          <div className="min-w-0">
            <p className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground truncate leading-tight">
              {formatHeaderDate(date)}
            </p>
            {(title || subtitle) && (
              <div className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-foreground truncate leading-tight mt-0.5">
                {title ?? subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Right: page actions + brand + theme toggle */}
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          <div className="hidden md:flex items-center gap-1.5 ml-3 mr-1 pl-3 border-l border-border">
            <AppFavicon alt="Phoenix Heart" className="size-5 object-contain" />
            <span className="font-mono text-2xs uppercase tracking-[0.2em] text-muted-foreground">PHOENIX HEART</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 md:size-9 text-foreground hover:text-foreground/80 hover:bg-accent rounded-none"
            onClick={toggle}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
