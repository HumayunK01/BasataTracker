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
});

export type FacilityInput = z.infer<typeof FacilitySchema>;

function cleanLogo(input: FacilityInput) {
  return { ...input, logo_url: input.logo_url ? input.logo_url : null };
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
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
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