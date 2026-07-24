import { Check, Copy, Eye, EyeOff, FolderInput, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Credential, CredentialFolder } from "@/hooks/useCredentials";

interface CredentialCardItemProps {
  credential: Credential;
  selected: boolean;
  revealed: boolean;
  copiedLogin: boolean;
  copiedPassword: boolean;
  copiedFull: boolean;
  otherFolders: CredentialFolder[];
  onToggleSelect: () => void;
  onToggleReveal: () => void;
  onCopyLogin: () => void;
  onCopyPassword: () => void;
  onCopyFull: () => void;
  onMove: (folderId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CredentialCardItem({
  credential: c,
  selected,
  revealed,
  copiedLogin,
  copiedPassword,
  copiedFull,
  otherFolders,
  onToggleSelect,
  onToggleReveal,
  onCopyLogin,
  onCopyPassword,
  onCopyFull,
  onMove,
  onEdit,
  onDelete,
}: CredentialCardItemProps) {
  const website = c.website?.trim();

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card overflow-hidden transition-colors",
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
          {website && <p className="text-xs text-foreground truncate mt-0.5">{website}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 -mr-2 -mt-1 shrink-0">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 font-sans p-1">
            <DropdownMenuItem className="text-sm gap-2 cursor-pointer" onClick={onCopyFull}>
              <Copy className="size-3.5" /> Copy all
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-sm gap-2 cursor-pointer">
                <FolderInput className="size-3.5" /> Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-40 font-sans p-1">
                  {otherFolders.length === 0 ? (
                    <span className="block px-2 py-1.5 text-xs text-foreground">No other folders</span>
                  ) : (
                    otherFolders.map((f) => (
                      <DropdownMenuItem
                        key={f.id}
                        className="text-sm cursor-pointer"
                        onClick={() => onMove(f.id)}
                      >
                        {f.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-sm gap-2 cursor-pointer" onClick={onEdit}>
              <Pencil className="size-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm gap-2 text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10" onClick={onDelete}>
              <Trash2 className="size-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-3.5 pb-3.5 -mt-1 space-y-2">
        <Field label="Login" value={c.login_id} copied={copiedLogin} onCopy={onCopyLogin} />

        <Field
          label="Password"
          value={revealed ? c.password : "•".repeat(12)}
          mono
          reveal={revealed}
          onReveal={onToggleReveal}
          copied={copiedPassword}
          onCopy={onCopyPassword}
        />

        {c.notes && (
          <p className="text-xs text-foreground leading-relaxed border-t border-border pt-2 mt-1 break-words">
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">{label}</p>
        <p className={cn("text-sm text-foreground/90 truncate", mono && "font-mono")} title={value}>{value}</p>
      </div>
      {reveal !== undefined && (
        <button
          type="button"
          onClick={onReveal}
          title={reveal ? "Hide password" : "Show password"}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="shrink-0 text-foreground hover:text-foreground transition-colors cursor-pointer"
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
          copied ? "text-success" : "text-foreground hover:text-foreground",
        )}
      >
        {copied ? <Check className="size-4 animate-fade-in" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
