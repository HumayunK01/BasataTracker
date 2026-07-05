import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase, getUserId } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import { logAuditEvent } from "@/hooks/useAuditLog";

const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  key: z.string()
    .min(1, "Key required")
    .max(64, "Key too long")
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, or underscores"),
  label: z.string().min(1, "Label required").max(100, "Label too long"),
  short: z.string().min(1, "Short name required").max(10, "Short name must be 10 characters or fewer"),
  position: z.number().int().nonnegative(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

function formatZodError(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Validation error";
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function useCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["categories", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Category[]> => {
      const user_id = await getUserId();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user_id)
        .order("position", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];
      return z.array(CategorySchema).parse(data);
    },
  });
}

export function useAddCategory() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 20, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (cat: Omit<Category, "id">) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const validated = CategorySchema.omit({ id: true, user_id: true, created_at: true, updated_at: true }).parse(cat);
      const user_id = await getUserId();
      const { error } = await supabase.from("categories").insert({ ...validated, user_id });
      if (error) throw error;
      await logAuditEvent("category_created", { key: validated.key });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: (e: unknown) => toast.error(formatZodError(e)),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 20, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ key, updates }: { key: string; updates: Partial<Omit<Category, "key" | "id">> }) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const UpdateSchema = CategorySchema
        .omit({ id: true, key: true, user_id: true, created_at: true, updated_at: true })
        .partial();
      const validated = UpdateSchema.parse(updates);
      const user_id = await getUserId();
      const { error } = await supabase
        .from("categories")
        .update(validated)
        .eq("key", key)
        .eq("user_id", user_id);
      if (error) throw error;
      await logAuditEvent("category_updated", { key });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: (e: unknown) => toast.error(formatZodError(e)),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (key: string) => {
      if (!checkLimit()) throw new Error("Too many deletes. Please wait a moment.");
      const user_id = await getUserId();
      await logAuditEvent("category_deleted", { key });
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("key", key)
        .eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: (e: unknown) => toast.error(formatZodError(e)),
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 30, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (cats: Category[]) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const user_id = await getUserId();
      const updates = cats.map((c, i) => {
        const validated = CategorySchema.omit({ id: true, user_id: true, created_at: true, updated_at: true }).parse({
          key: c.key,
          label: c.label,
          short: c.short,
          position: i,
        });
        return { ...validated, user_id };
      });
      const { error } = await supabase
        .from("categories")
        .upsert(updates, { onConflict: "user_id,key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: (e: unknown) => toast.error(formatZodError(e)),
  });
}
