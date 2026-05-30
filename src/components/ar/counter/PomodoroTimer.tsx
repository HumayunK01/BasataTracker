import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Clock, Coffee, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type TimerMode = "focus" | "short" | "long";

const MODE_CONFIGS = {
  focus: { label: "Focus Sprint", minutes: 25, color: "text-primary border-primary bg-primary/5", icon: Sparkles },
  short: { label: "Short Break", minutes: 5, color: "text-success border-success bg-success/5", icon: Coffee },
  long: { label: "Long Break", minutes: 15, color: "text-info border-info bg-info/5", icon: Clock },
};

function playChime() {
  try {
    const isChimeEnabled = localStorage.getItem("basata_timer_chime") !== "false";
    if (!isChimeEnabled) return;

    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Play a lovely high-quality synth bell sound
    const now = ctx.currentTime;
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Harmonic overlay tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(783.99, now + 0.08); // G5
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    gain2.gain.setValueAtTime(0.12, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn("Audio Context chime failed", e);
  }
}

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(MODE_CONFIGS.focus.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = MODE_CONFIGS[mode];
  const totalSeconds = config.minutes * 60;
  const progressPct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const handleToggle = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setSecondsLeft(config.minutes * 60);
  };

  const handleModeChange = (newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setSecondsLeft(MODE_CONFIGS[newMode].minutes * 60);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const ModeIcon = config.icon;

  return (
    <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-2xl p-5 hover:border-primary/10 transition-all duration-300 flex flex-col justify-between h-full min-h-[220px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${config.color} shrink-0`}>
            <ModeIcon className="size-4 animate-pulse" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            {config.label}
          </span>
        </div>
        
        {/* Sprint mode selector */}
        <div className="flex bg-muted/40 border border-border/40 p-0.5 rounded-lg text-[10px] font-semibold">
          {(["focus", "short", "long"] as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-2 py-1 rounded-md transition-all uppercase tracking-wide ${
                mode === m 
                  ? "bg-card text-foreground border border-border/40 shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "focus" ? "Sprint" : m === "short" ? "Short" : "Long"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 py-3 my-auto">
        {/* Circular Progress Ring Container */}
        <div className="relative size-24 flex items-center justify-center shrink-0">
          <svg className="absolute inset-0 size-full rotate-[-90deg]">
            <circle
              cx="48"
              cy="48"
              r="44"
              className="stroke-muted/30"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="48"
              cy="48"
              r="44"
              className="stroke-primary transition-all duration-300"
              strokeWidth="4"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 - (2 * Math.PI * 44 * progressPct) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="text-2xl font-semibold font-mono tabular-nums leading-none tracking-tight">
            {formatTime(secondsLeft)}
          </div>
        </div>

        {/* Buttons Controls */}
        <div className="flex flex-col gap-2.5">
          <Button
            size="icon"
            onClick={handleToggle}
            className={`size-10 rounded-full shadow-md active:scale-95 transition-all ${
              isActive 
                ? "bg-warning hover:bg-warning/90 text-warning-foreground" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            {isActive ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            className="size-10 rounded-full border-border/60 hover:bg-muted/80 active:scale-95 transition-all text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>
      
      <div className="text-[10px] text-center text-muted-foreground/60 font-medium">
        {isActive ? "Ticking focus sprint blocks…" : "Focus sprint idle — click play to begin"}
      </div>
    </div>
  );
}
