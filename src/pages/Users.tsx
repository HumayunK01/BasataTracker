import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ar/PageHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

async function fetchUsers(): Promise<AuthUser[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("list-users", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data.users as AuthUser[];
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageHeader title="Users" />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>{isLoading ? "Loading…" : `${users.length} total user${users.length !== 1 ? "s" : ""}`}</span>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">
            Failed to load users: {(error as Error).message}
          </p>
        )}

        {/* Table */}
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Account ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Last sign in</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="size-48" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-32" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    {search ? "No users match your search." : "No users found."}
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
                  return (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          {fullName
                            ? <span className="font-medium">{fullName}</span>
                            : <span className="text-muted-foreground italic text-xs">No name</span>}
                          <span className="text-xs text-muted-foreground truncate max-w-[180px] sm:hidden">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground truncate max-w-[200px]">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {user.id.slice(0, 8)}…
                        </span>
                      </td>
                      <td suppressHydrationWarning className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </td>
                      <td suppressHydrationWarning className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {user.last_sign_in_at
                          ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                          : <span className="italic">Never</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
