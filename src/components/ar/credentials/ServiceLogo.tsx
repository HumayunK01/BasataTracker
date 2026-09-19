import { useState } from "react";
import { useAccessToken } from "@/hooks/useAccessToken";

// ponytail: favicon is fetched via the same-origin /api/favicon proxy (which
// itself calls DuckDuckGo server-side), so the production CSP/COEP don't block it.
// The resolved domain is still sent to DuckDuckGo from the server.
function resolveDomain(service: string, website: string | null | undefined): string | null {
  const raw = (website ?? "").trim();
  if (raw) {
    try {
      const url = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
      if (url.hostname.includes(".")) return url.hostname;
    } catch {
      // fall through to guessing
    }
  }
  const guessed = service.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (guessed.length >= 2) return `${guessed}.com`;
  return null;
}

export function ServiceLogo({ service, website, className }: { service: string; website: string | null | undefined; className?: string }) {
  const [failed, setFailed] = useState(false);
  const domain = resolveDomain(service, website);
  const letter = service.trim().charAt(0).toUpperCase() || "?";
  const token = useAccessToken();

  // Derived (not useState) so the proxy URL updates when the async token
  // arrives or refreshes.
  const [stage, setStage] = useState<"proxy" | "direct">("proxy");
  const proxy = domain ? `/api/favicon?domain=${encodeURIComponent(domain)}${token ? `&t=${encodeURIComponent(token)}` : ""}` : null;
  const direct = domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : null;

  if (!domain || failed) {
    return (
      <span
        className={`grid place-items-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shrink-0 ${className ?? "size-6"}`}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  const src = stage === "proxy" && proxy ? proxy : direct!;
  // Try the same-origin proxy first (works in prod under CSP). If it's missing
  // (local vite has no serverless fn), unauthorized, or fails, fall back to the
  // direct URL (works in local dev, blocked in prod) before the letter tile.
  return (
    <img
      src={src}
      alt=""
      width={24}
      height={24}
      loading="lazy"
      onError={() => (stage === "proxy" ? setStage("direct") : setFailed(true))}
      className={`object-contain rounded-md shrink-0 ${className ?? "size-6"}`}
    />
  );
}
