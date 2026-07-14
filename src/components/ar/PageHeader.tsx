import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppFavicon } from "@/components/ar/AppFavicon";
import { formatHeaderDate } from "@/types/log";

interface PageHeaderProps {
  subtitle?: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  now?: Date;
}

export function PageHeader({ subtitle, title, actions, now }: PageHeaderProps) {
  const date = now ?? new Date();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 glass shrink-0">
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        {/* Left: hamburger + technical date/title */}
        <div className="flex items-center gap-2 min-w-0 -ml-2">
          <SidebarTrigger className="shrink-0 size-10 md:size-8 [&>svg]:h-5 [&>svg]:w-5" />
          <div className="min-w-0">
            <p className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground truncate leading-tight">
              {formatHeaderDate(date)}
            </p>
            {(title || subtitle) && (
              <h1 className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-foreground truncate leading-tight mt-0.5">
                {title ?? subtitle}
              </h1>
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
        </div>
      </div>
    </header>
  );
}
