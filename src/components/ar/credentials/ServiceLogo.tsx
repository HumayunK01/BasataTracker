import { useState } from "react";

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

  const proxy = `/api/favicon?domain=${encodeURIComponent(domain ?? "")}`;
  const direct = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  // Try the same-origin proxy first (works in prod under CSP). If it's missing
  // (local vite has no serverless fn) or fails, fall back to the direct URL
  // (works in local dev, blocked in prod) before giving up on the letter tile.
  const [src, setSrc] = useState(proxy);

  if (!domain || failed) {
    return (
      <span
        className={`grid place-items-center rounded-none bg-primary/15 text-primary text-xs font-semibold shrink-0 ${className ?? "size-6"}`}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={24}
      height={24}
      loading="lazy"
      onError={() => (src !== direct ? setSrc(direct) : setFailed(true))}
      className={`object-contain rounded-none shrink-0 ${className ?? "size-6"}`}
    />
  );
}
