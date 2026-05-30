import React from "react";
import { ChevronRight } from "lucide-react";
import type { DocType } from "@/lib/cheatsheet-data";

/** Renders an arrow-separated workflow chain as pill segments. */
export function Workflow({ chain }: { chain: string }) {
  const parts = chain.split("→").flatMap((p) => {
    const t = p.trim();
    return t ? [t] : [];
  });
  
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5 font-[system-ui]">
      {parts.map((part, i) => (
        <span key={part} className="flex items-center gap-1">
          <span className="text-xs font-semibold bg-muted text-foreground/80 rounded-md border border-border/40 px-2.5 py-1">
            {part}
          </span>
          {i < parts.length - 1 && (
            <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />
          )}
        </span>
      ))}
    </div>
  );
}

export function SectionCard({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div 
      id={id} 
      className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl p-4 sm:p-5 space-y-4 scroll-mt-20 hover:border-primary/10 transition-all duration-300 font-[system-ui]"
    >
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/90">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function DocTypeCard({ doc }: { doc: DocType }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/[0.04] p-3.5 sm:p-4 space-y-2.5 hover:bg-muted/[0.08] hover:border-border/60 transition-colors font-[system-ui]">
      <span className="text-sm font-semibold uppercase tracking-wide text-foreground/90">{doc.name}</span>
      
      {doc.indicators && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground/75">Indicators:</span> {doc.indicators}
        </p>
      )}
      
      {doc.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground/75">Description:</span> {doc.description}
        </p>
      )}
      
      {doc.workflows.map((wf) => (
        <Workflow key={wf} chain={wf} />
      ))}
      
      {doc.notes && (
        <div className="text-xs text-muted-foreground leading-relaxed mt-1">{doc.notes}</div>
      )}
      
      {doc.types && (
        <p className="text-xs text-muted-foreground/75 italic">
          <span className="font-semibold not-italic">Types:</span> {doc.types}
        </p>
      )}
    </div>
  );
}
