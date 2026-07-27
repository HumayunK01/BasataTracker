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
    <header className="sticky top-0 z-10 border-b border-border/60 bg-sidebar backdrop-blur-xl shrink-0">
      <div className="px-4 sm:px-6 py-2 flex items-center justify-between gap-2 min-h-11">
        <div className="flex items-center gap-3 min-w-0 -ml-2">
          <SidebarTrigger className="shrink-0 size-9 md:size-8 [&>svg]:h-[18px] [&>svg]:w-[18px]" />
          <div className="min-w-0">
            {title && (
              <>
                <h1 className="text-sm font-semibold text-foreground truncate leading-tight">{title}</h1>
                {subtitle && (
                  <p className="text-xs text-foreground/70 truncate leading-tight">{subtitle}</p>
                )}
              </>
            )}
            <p className="text-[10px] font-medium text-muted-foreground truncate leading-tight mt-px">
              {formatHeaderDate(date)}
            </p>
            {!title && subtitle && (
              <h1 className="text-sm font-semibold text-foreground truncate leading-tight">{subtitle}</h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
          <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-border/40">
            <AppFavicon alt="Phoenix Heart" className="size-3 object-contain" />
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground/70 uppercase">PHOENIX HEART</span>
          </div>
        </div>
      </div>
    </header>
  );
}
