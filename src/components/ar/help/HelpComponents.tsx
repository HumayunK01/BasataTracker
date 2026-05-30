import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text.replace(/\s*\(.*?\)/g, "").trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="ml-auto shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="size-3.5 text-success animate-fade-in" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

export function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl p-4 sm:p-5 space-y-4 hover:border-primary/10 transition-all duration-300 font-[system-ui]">
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/95">{title}</h2>
      </div>
      {children}
    </div>
  );
}

interface PatientRowProps {
  name: string;
  docType: string;
  dob: string;
  children: React.ReactNode;
}

export function PatientRow({ name, docType, dob, children }: PatientRowProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/[0.04] p-3.5 sm:p-4 space-y-2 hover:bg-muted/[0.08] transition-colors font-[system-ui]">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-sm font-semibold leading-snug text-foreground/90">{name}</span>
        <span className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full whitespace-nowrap">
          {docType}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">DOB: {dob}</span>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed mt-1">{children}</div>
    </div>
  );
}
