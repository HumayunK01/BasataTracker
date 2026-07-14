import { useState } from "react";

// ponytail: favicon is fetched from DuckDuckGo's public service, which means the
// resolved domain is sent to them. Fine for a personal vault; if that ever matters,
// swap to a self-hosted favicon proxy or a bundled icon set.
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
      src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
      alt=""
      width={24}
      height={24}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-contain rounded-none shrink-0 ${className ?? "size-6"}`}
    />
  );
}
