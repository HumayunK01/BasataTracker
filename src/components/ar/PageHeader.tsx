import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings, Sun, Moon, LogOut, User, Search, Palette } from "lucide-react";
import { WhatsNewButton } from "@/components/ar/whats-new";
import { formatHeaderDate } from "@/types/log";

interface PageHeaderProps {
  subtitle?: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  now?: Date;
}

export function PageHeader({ subtitle, title, actions, now }: PageHeaderProps) {
  const date = now ?? new Date();
  const navigate = useNavigate();
  const { theme, toggle, variant, toggleVariant } = useTheme();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const [showSignOut, setShowSignOut] = useState(false);

  const email = user?.email ?? "";
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email;

  return (
    <>
    <header className="sticky top-0 z-10 h-14 border-b border-border bg-sidebar shrink-0">
      <div className="h-full px-2 sm:px-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <SidebarTrigger className="shrink-0 size-8 text-foreground hover:text-foreground/80 hover:bg-slate-100 dark:hover:bg-[#384152]/60 rounded-md [&_svg]:!size-5" />
          {variant === "classic" ? (
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
          ) : (
            title && (
              <div className="sm:hidden min-w-0">
                <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
              </div>
            )
          )}
        </div>

        {/* Search bar for Modern theme */}
        {variant === "modern" && (
          <div className="flex-1 max-w-xl mx-2 sm:mx-6 relative hidden sm:block">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-white hover:bg-slate-50/50 focus:bg-white dark:bg-[#384152]/70 dark:hover:bg-[#384152] dark:focus:bg-[#384152] text-sm text-foreground placeholder:text-muted-foreground rounded-lg pl-4 pr-10 py-1.5 border border-slate-200 dark:border-white/15 focus:border-blue-500/50 dark:focus:border-white/35 outline-none transition-colors"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-500 dark:text-foreground pointer-events-none" />
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {actions}
          <span className="hidden md:inline-block text-sm font-bold text-foreground mr-2 select-none tracking-tight">
            Phoenix Heart
          </span>
          <WhatsNewButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-foreground hover:text-foreground/80 hover:bg-slate-100 dark:hover:bg-[#384152]/60 rounded-md [&_svg]:!size-5"
                title={name}
                aria-label="Profile"
              >
                <User />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">{name}</span>
                  <span className="text-xs text-muted-foreground">{email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => setShowSignOut(true)}
              >
                <LogOut className="size-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Variant Switcher Button (Modern vs Legacy) */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-foreground hover:text-foreground/80 hover:bg-slate-100 dark:hover:bg-[#384152]/60 rounded-md [&_svg]:!size-5"
            onClick={toggleVariant}
            title={variant === "classic" ? "Switch to Legacy Theme" : "Switch to Modern Theme"}
            aria-label="Switch between Modern and Legacy themes"
          >
            <Palette className="size-4" />
          </Button>

          {/* Dark / Light Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-foreground hover:text-foreground/80 hover:bg-slate-100 dark:hover:bg-[#384152]/60 rounded-md [&_svg]:!size-5"
            onClick={toggle}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-foreground hover:text-foreground/80 hover:bg-slate-100 dark:hover:bg-[#384152]/60 rounded-md [&_svg]:!size-5"
            onClick={() => navigate("/settings")}
            title="Settings"
            aria-label="Settings"
          >
            <Settings />
          </Button>
        </div>
      </div>
    </header>
      <AlertDialog open={showSignOut} onOpenChange={setShowSignOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to access your tracker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => signOut()}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
