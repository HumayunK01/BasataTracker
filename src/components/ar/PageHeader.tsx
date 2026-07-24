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
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 min-h-12">
        <div className="flex items-center gap-3 min-w-0 -ml-2">
          <SidebarTrigger className="shrink-0 size-9 md:size-8 [&>svg]:h-[18px] [&>svg]:w-[18px]" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground truncate leading-tight">
              {formatHeaderDate(date)}
            </p>
            {(title || subtitle) && (
              <h1 className="text-sm font-semibold text-foreground truncate leading-tight mt-0.5">
                {title ?? subtitle}
              </h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
          <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-border/50">
            <AppFavicon alt="Phoenix Heart" className="size-4 object-contain" />
            <span className="text-[11px] font-medium tracking-wide text-foreground uppercase">PHOENIX HEART</span>
          </div>
        </div>
      </div>
    </header>
  );
}
