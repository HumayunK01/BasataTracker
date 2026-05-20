import { useAuth } from "@/hooks/useAuth";
import Skeleton from "react-loading-skeleton";
import LoginPage from "@/pages/Login";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Skeleton width={160} height={32} borderRadius={6} />
          <Skeleton width={112} height={16} borderRadius={6} />
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <>{children}</>;
}
