import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/types/log";
import { toast } from "sonner";

export interface Category {
  id?: string;
  key: string;
  label: string;
  short: string;
  position: number;
}

const KEY = ["categories"] as const;

const DEFAULT_CATEGORIES: Category[] = CATEGORIES.map((c, i) => ({
  key: c.key,
  label: c.label,
  short: c.short,
  position: i,
}));

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export function useCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return DEFAULT_CATEGORIES;
      return data as Category[];
    },
  });
}

export function useAddCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: Omit<Category, "id">) => {
      const user_id = await getUserId();
      const { error } = await supabase.from("categories").insert({ ...cat, user_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, updates }: { key: string; updates: Partial<Omit<Category, "key" | "id">> }) => {
      const user_id = await getUserId();
      const { error } = await supabase
        .from("categories")
        .update(updates)
        .eq("key", key)
        .eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const user_id = await getUserId();
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("key", key)
        .eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cats: Category[]) => {
      const user_id = await getUserId();
      const updates = cats.map((c, i) => ({
        key: c.key,
        label: c.label,
        short: c.short,
        position: i,
        user_id,
      }));
      const { error } = await supabase
        .from("categories")
        .upsert(updates, { onConflict: "user_id,key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSeedDefaultCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const user_id = await getUserId();
      const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id }));
      const { error } = await supabase
        .from("categories")
        .upsert(rows, { onConflict: "user_id,key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
