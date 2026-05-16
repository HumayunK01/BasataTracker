import { AppSidebar } from "@/components/ar/AppSidebar";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

export function AppLayout({ children }: { children: React.ReactNode }) {
  useSmoothScroll();
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
