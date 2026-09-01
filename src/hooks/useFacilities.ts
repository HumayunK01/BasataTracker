import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import { logAuditEvent } from "@/hooks/useAuditLog";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Facility = Tables<"facilities">;

const FacilitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name too long"),
  fax_number: z.string().trim().min(1, "Fax number is required").max(50, "Fax number too long"),
  logo_url: z
    .string()
    .trim()
    .max(2000, "Logo URL too long")
    .regex(/^https?:\/\//i, "Logo must be a valid http(s) URL")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500, "Address too long").optional().or(z.literal("")),
  verified: z.boolean().optional(),
});

export type FacilityInput = z.infer<typeof FacilitySchema>;

const KEEP_UPPER = new Set(
  "N S E W NE NW SE SW US PO USA II III IV DC AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  ),
);

// Normalizes pasted/typed addresses on save: joins lines with ", ", fixes
// letter-digit paste glue ("Center9201" → "Center 9201"), and title-cases every
// word — "9201 W THOMS RD" → "9201 W Thoms Rd" — keeping state/directional
// abbrevs uppercase. ponytail: heuristic word casing, not full USPS parsing;
// swap in an address-validation API if it ever misfires on real addresses.
export function formatAddress(raw: string): string {
  let s = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim().replace(/,+$/, ""))
    .filter(Boolean)
    .join(", ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
  s = s.replace(/(\p{L})(?=\d)/gu, "$1 ");
  s = s.replace(/\p{L}+/gu, (w) => {
    if (KEEP_UPPER.has(w.toUpperCase())) return w.toUpperCase();
    let t = w[0].toUpperCase() + w.slice(1).toLowerCase();
    if (t.length > 2 && t.startsWith("Mc")) t = "Mc" + t[2].toUpperCase() + t.slice(3);
    return t;
  });
  return s.trim();
}

function cleanLogo(input: FacilityInput) {
  return {
    ...input,
    logo_url: input.logo_url ? input.logo_url : null,
    address: input.address ? formatAddress(input.address) || null : null,
  };
}

export function useFacilities() {
  const { user } = useAuth();
  return useQuery<Facility[]>({
    queryKey: ["facilities"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReorderFacilities() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 20, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const { error } = await supabase.from("facilities").upsert(updates, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpsertFacility() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (input: { row: Facility | null; values: FacilityInput }) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const validated = FacilitySchema.parse(input.values);
      if (input.row) {
        const { error } = await supabase
          .from("facilities")
          .update(cleanLogo(validated))
          .eq("id", input.row.id);
        if (error) throw error;
        await logAuditEvent("facility_updated", { name: validated.name, facility_id: input.row.id });
      } else {
        const insert: TablesInsert<"facilities"> = cleanLogo(validated);
        const { data, error } = await supabase.from("facilities").insert(insert).select().single();
        if (error) throw error;
        await logAuditEvent("facility_created", { name: validated.name, facility_id: data.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilities"] });
      toast.success("Facility saved");
    },
    onError: (e: Error) =>
      toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
  });
}

export function useDeleteFacility() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 5, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (row: Facility) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const { error } = await supabase.from("facilities").delete().eq("id", row.id);
      if (error) throw error;
      await logAuditEvent("facility_deleted", { name: row.name, facility_id: row.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilities"] });
      toast.success("Facility deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}