import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { formatHeaderDate } from "@/types/log";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Settings, Sun, Moon, LogOut, User } from "lucide-react";

interface PageHeaderProps {
  subtitle?: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  now?: Date;
}

export function PageHeader({ subtitle, title, actions, now }: PageHeaderProps) {
  const date = now ?? new Date();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const [showSignOut, setShowSignOut] = useState(false);

  const email = user?.email ?? "";
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email;

  return (
    <>
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
            <span className="text-xs font-semibold tracking-wider text-white">Phoenix Heart</span>
          </div>
          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 md:size-8 text-foreground hover:text-foreground/80 rounded-md [&_svg]:!size-[18px] md:[&_svg]:!size-5"
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
            <Button
              variant="ghost"
              size="icon"
              className="size-9 md:size-8 text-foreground hover:text-foreground/80 rounded-md [&_svg]:!size-[18px] md:[&_svg]:!size-5"
              onClick={toggle}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 md:size-8 text-foreground hover:text-foreground/80 rounded-md [&_svg]:!size-[18px] md:[&_svg]:!size-5"
              onClick={() => navigate("/settings")}
              title="Settings"
              aria-label="Settings"
            >
              <Settings />
            </Button>
          </div>
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
