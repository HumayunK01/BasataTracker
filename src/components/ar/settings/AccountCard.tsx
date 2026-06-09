import { User, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AccountCardProps {
  email?: string;
  createdAt?: string;
  lastSignIn?: string;
}

export function AccountCard({ email, createdAt, lastSignIn }: AccountCardProps) {
  return (
    <div className="col-span-2 sm:col-span-1 bg-card/70 backdrop-blur-md border border-border/60 rounded-xl p-5 sm:p-6 space-y-4 hover:shadow-md hover:shadow-primary/5 hover:border-primary/30 transition-[border-color,box-shadow] duration-200 group">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors duration-200">
          <User className="size-4 text-primary" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/95 font-[system-ui]">Account</h2>
      </div>
      <div className="space-y-3 font-[system-ui]">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Email address</p>
          <p className="text-sm font-semibold truncate bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
            {email || "Not logged in"}
          </p>
        </div>
        
        <Separator className="bg-border/40" />
        
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Associate Member since</p>
          <p className="text-sm font-medium text-foreground/90" suppressHydrationWarning>
            {createdAt
              ? new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : "—"}
          </p>
        </div>
        
        <Separator className="bg-border/40" />
        
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Active Session Last Sign In</p>
          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-primary/70 shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-foreground/80" suppressHydrationWarning>
              {lastSignIn
                ? new Date(lastSignIn).toLocaleString("en-US", { 
                    month: "short", 
                    day: "numeric", 
                    year: "numeric", 
                    hour: "numeric", 
                    minute: "2-digit",
                    hour12: true
                  })
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
