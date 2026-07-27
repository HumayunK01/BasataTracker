import { Sun, Moon, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import { useUpdateDailyGoal } from "@/hooks/useProfile";
import { toast } from "sonner";

interface PreferencesCardProps {
  dailyGoal: number | null;
}

export function PreferencesCard({ dailyGoal }: PreferencesCardProps) {
  const { theme, toggle } = useTheme();
  const [goal, setGoal] = useState(dailyGoal ?? 50);
  const updateGoal = useUpdateDailyGoal();

  const handleSaveGoal = () => {
    const v = Math.max(0, Math.min(9999, goal || 0));
    updateGoal.mutate(v, {
      onSuccess: () => toast.success("Daily goal updated"),
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="divide-y divide-border/50">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between px-5 py-4 gap-3 xs:gap-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="size-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Daily Goal</p>
              <p className="text-xs text-foreground mt-0.5">Target document count shown on the console</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 xs:ml-4">
            <Input
              type="number"
              min={0}
              max={9999}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="w-20 h-9 text-sm tabular-nums text-center"
            />
            <Button
              size="sm"
              className="h-9"
              onClick={handleSaveGoal}
              disabled={updateGoal.isPending}
            >
              {updateGoal.isPending && <Loader2 className="size-3.5 mr-1 animate-spin" />}
              Set
            </Button>
          </div>
        </div>

        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between px-5 py-4 gap-3 xs:gap-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              {theme === "dark" ? <Sun className="size-4.5 text-warning" /> : <Moon className="size-4.5 text-warning" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Appearance</p>
              <p className="text-xs text-foreground mt-0.5">Switch between dark and light mode</p>
            </div>
          </div>
          <div className="shrink-0 xs:ml-4">
            <Button
              variant="outline"
              size="sm"
              className="h-9 min-w-24"
              onClick={toggle}
            >
              {theme === "dark" ? <Sun className="size-4 mr-1.5" /> : <Moon className="size-4 mr-1.5" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
