import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ar/PageHeader";
import { Input } from "@/components/ui/input";
import Skeleton from "react-loading-skeleton";
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

function formatJoined(iso: string) { return format(new Date(iso), "MMM d, yyyy"); }
function formatLastSeen(iso: string) { return formatDistanceToNow(new Date(iso), { addSuffix: true }); }

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

      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="w-full space-y-4">

          {/* Search + summary */}
          <div className="flex flex-col xs:flex-row xs:items-center gap-2 sm:gap-3">
            <div className="relative w-full xs:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 bg-card border-border"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="xs:ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-4" />
              <span>{isLoading ? "Loading…" : `${users.length} total user${users.length !== 1 ? "s" : ""}`}</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">
              Failed to load users: {(error as Error).message}
            </p>
          )}

          {/* Table */}
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-border/40 bg-muted/[0.04]">
              <h2 className="text-sm font-semibold font-heading">All Users</h2>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-sm min-w-[320px] [&_th]:border-r [&_th]:border-border [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border/40 [&_td:last-child]:border-r-0">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-foreground font-heading">Name</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-foreground hidden sm:table-cell font-heading">Email</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-foreground hidden sm:table-cell font-heading">Account ID</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-foreground hidden md:table-cell font-heading">Joined</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-foreground hidden lg:table-cell font-heading">Last sign in</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/40 last:border-0">
                        <td className="px-4 py-3"><Skeleton width={128} height={16} borderRadius={4} /></td>
                        <td className="px-4 py-3 hidden sm:table-cell"><Skeleton width={192} height={16} borderRadius={4} /></td>
                        <td className="px-4 py-3 hidden sm:table-cell"><Skeleton width={96} height={16} borderRadius={4} /></td>
                        <td className="px-4 py-3 hidden md:table-cell"><Skeleton width={112} height={16} borderRadius={4} /></td>
                        <td className="px-4 py-3 hidden lg:table-cell"><Skeleton width={128} height={16} borderRadius={4} /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Users className="size-10 opacity-20" />
                          <p className="text-sm">{search ? "No users match your search." : "No users found."}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user) => {
                      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
                      return (
                        <tr key={user.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
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
                            {formatJoined(user.created_at)}
                          </td>
                          <td suppressHydrationWarning className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                            {user.last_sign_in_at
                              ? formatLastSeen(user.last_sign_in_at)
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
        </div>
      </main>
    </>
  );
}
