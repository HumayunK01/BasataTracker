import { Check, Copy, Eye, EyeOff, FolderInput, MoreVertical, Pencil, Trash2, ChevronRight } from "lucide-react";
import { ServiceLogo } from "./ServiceLogo";
import { SelectCheckbox } from "./SelectCheckbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Credential, CredentialFolder } from "@/hooks/useCredentials";

interface CredentialCardItemProps {
  credential: Credential;
  selected: boolean;
  revealed: boolean;
  copied: boolean;
  otherFolders: CredentialFolder[];
  onToggleSelect: () => void;
  onToggleReveal: () => void;
  onCopyLogin: () => void;
  onCopyCredential: () => void;
  onMove: (folderId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CredentialCardItem({
  credential: c,
  selected,
  revealed,
  copied,
  otherFolders,
  onToggleSelect,
  onToggleReveal,
  onCopyLogin,
  onCopyCredential,
  onMove,
  onEdit,
  onDelete,
}: CredentialCardItemProps) {
  const website = c.website?.trim();

  return (
    <div
      className={cn(
        "group rounded-none border bg-card overflow-hidden transition-colors",
        selected ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30",
      )}
    >
      <div className="flex items-start gap-3 p-3.5">
        <SelectCheckbox
          ariaLabel={`Select ${c.service}`}
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 shrink-0"
        />
        <ServiceLogo service={c.service} website={c.website} className="size-9 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate leading-tight">{c.service}</p>
          {website && <p className="text-xs text-muted-foreground truncate mt-0.5">{website}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 -mr-2 -mt-1 shrink-0">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 font-sans">
            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm" onClick={onCopyCredential}>
              <Copy className="size-3.5" /> Copy
            </button>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-default outline-none focus:bg-accent data-[state=open]:bg-accent">
                <FolderInput className="size-3.5" /> Move to
                <ChevronRight className="size-3.5 ml-auto" />
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-40 font-sans p-1">
                  {otherFolders.length === 0 ? (
                    <span className="block px-2 py-1.5 text-xs text-muted-foreground">No other folders</span>
                  ) : (
                    otherFolders.map((f) => (
                      <DropdownMenuItem
                        key={f.id}
                        className="text-sm"
                        onClick={() => onMove(f.id)}
                      >
                        {f.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm" onClick={onEdit}>
              <Pencil className="size-3.5" /> Edit
            </button>
            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm" onClick={onDelete}>
              <Trash2 className="size-3.5" /> Delete
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-3.5 pb-3.5 -mt-1 space-y-2">
        <Field label="Login" value={c.login_id} copied={copied} onCopy={onCopyLogin} />

        <Field
          label="Password"
          value={revealed ? c.password : "•".repeat(12)}
          mono
          reveal={revealed}
          onReveal={onToggleReveal}
          copied={copied}
          onCopy={onCopyCredential}
        />

        {c.notes && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2 mt-1 break-words">
            {c.notes}
          </p>
        )}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
  reveal?: boolean;
  copied: boolean;
  onCopy: () => void;
  onReveal?: () => void;
}

function Field({ label, value, mono, reveal, copied, onCopy, onReveal }: FieldProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("text-sm text-foreground/90 truncate", mono && "font-mono")} title={value}>{value}</p>
      </div>
      {reveal !== undefined && (
        <button
          type="button"
          onClick={onReveal}
          title={reveal ? "Hide password" : "Show password"}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
      <button
        type="button"
        onClick={onCopy}
        title={`Copy ${label}`}
        aria-label={`Copy ${label}`}
        className={cn(
          "shrink-0 press-scale transition-colors cursor-pointer",
          copied ? "text-emerald-500" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {copied ? <Check className="size-4 animate-fade-in" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
