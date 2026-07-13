import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion, type Easing } from "motion/react";
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

const ease: Easing = [0.23, 1, 0.32, 1];

export function PageHeader({ subtitle, title, actions, now }: PageHeaderProps) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const date = now ?? new Date();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/70 shrink-0">
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2">

        {/* Left: hamburger + date/title */}
        <div className="flex items-center gap-2 min-w-0 -ml-2">
          <SidebarTrigger className="shrink-0 size-10 md:size-8 [&>svg]:h-5 [&>svg]:w-5" />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate leading-tight">
              {formatHeaderDate(date)}
            </p>
            {(title || subtitle) && (
              title ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.15, ease }}
                    className="text-base md:text-sm font-medium truncate leading-tight mt-0.5 font-heading"
                  >
                    {title}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="text-base md:text-sm font-medium truncate leading-tight mt-0.5 font-heading">
                  {subtitle}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right: page actions + theme toggle */}
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          <div className="hidden md:flex items-center gap-1.5 ml-3 mr-1 pl-3 border-l border-border">
            <AppFavicon alt="Phoenix Heart" className="size-5 object-contain" />
            <span className="text-sm font-semibold text-foreground font-heading">
              Phoenix Heart
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 md:size-9 text-foreground hover:text-foreground/80 hover:bg-accent press-scale"
            onClick={toggle}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            <span className="relative flex items-center justify-center size-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.2, ease }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {theme === "dark" ? <Sun className="size-6" /> : <Moon className="size-6" />}
                </motion.span>
              </AnimatePresence>
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
