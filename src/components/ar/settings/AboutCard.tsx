import { AppLogo } from "@/components/ar/AppLogo";
import { Button } from "@/components/ui/button";
import { Info, ShieldCheck, Download, Database } from "lucide-react";

interface AboutCardProps {
  categoriesCount: number;
  logsCount: number;
  onExport: () => void;
  exportDisabled: boolean;
}

export function AboutCard({ categoriesCount, logsCount, onExport, exportDisabled }: AboutCardProps) {
  return (
    <div className="bg-card/70 backdrop-blur-md border border-border/60 rounded-xl p-5 sm:p-6 space-y-4 hover:shadow-md hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-info/20 transition-all duration-300">
          <Info className="size-4 text-info group-hover:rotate-6 transition-transform" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/95 font-[system-ui]">About</h2>
      </div>
      <div className="space-y-4 font-[system-ui]">
        <AppLogo className="h-7 sm:h-8 object-contain group-hover:scale-102 transition-transform duration-300 origin-left" />
        
        <div className="space-y-2 bg-muted/20 border border-border/40 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Version</span>
            <span className="font-mono bg-background/80 border border-border/60 text-foreground/95 px-2 py-0.5 rounded text-[10px]">1.1.1</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Categories</span>
            <span className="font-mono bg-background/80 border border-border/60 text-foreground/95 px-2 py-0.5 rounded text-[10px]">{categoriesCount} active</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Days logged</span>
            <span className="font-mono bg-background/80 border border-border/60 text-foreground/95 px-2 py-0.5 rounded text-[10px]">{logsCount} days</span>
          </div>
        </div>

        {/* Custom RLS Security Alert Tip */}
        <div className="flex gap-2.5 bg-success/10 border border-success/20 rounded-xl p-3 text-xs leading-normal hover:bg-success/15 transition-colors duration-200">
          <Database className="size-4 text-success shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5">
            <p className="font-bold text-success-foreground">Secure Isolation Active</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Basata uses Row Level Security (RLS) scoped strictly to your account. Your doc counts are completely private and sync securely across devices.
            </p>
          </div>
        </div>

        <Button 
          size="sm" 
          variant="outline" 
          className="w-full border-border/60 hover:bg-muted/80 hover:border-foreground/20 transition-all duration-200 shadow-sm" 
          onClick={onExport} 
          disabled={exportDisabled}
        >
          <Download className="size-3.5 mr-1.5 group-hover:translate-y-0.5 transition-transform" /> Export JSON
        </Button>
      </div>
    </div>
  );
}
