// Same-origin favicon proxy. The app's CSP (img-src 'self') and COEP
// (require-corp) block cross-origin images, so we fetch the favicon server-side
// and return it from our own origin. This also keeps the upstream host off the
// client and avoids leaking the request to a third party from the browser.
// Auth-gated via ?t=<supabase access token> — see ./_auth.js.
import authorized from "./_auth.js";

export default async function handler(req, res) {
  if (!(await authorized(req))) {
    res.status(401).end();
    return;
  }
  const domain = req.query.domain;
  // Only allow a plain hostname (no scheme/path) to avoid SSRF via the upstream URL.
  if (typeof domain !== "string" || !/^[a-z0-9.-]+$/i.test(domain) || domain.length > 253) {
    res.status(400).end();
    return;
  }
  try {
    const upstream = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    const r = await fetch(upstream, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) {
      res.status(r.status).end();
      return;
    }
    const MAX_FAVICON_SIZE = 512 * 1024;
    const contentLength = parseInt(r.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_FAVICON_SIZE) {
      res.status(502).end();
      return;
    }
    const chunks = [];
    let bytes = 0;
    for await (const chunk of r.body) {
      bytes += chunk.byteLength;
      if (bytes > MAX_FAVICON_SIZE) {
        res.status(502).end();
        return;
      }
      chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);
    res.setHeader("Content-Type", r.headers.get("content-type") || "image/x-icon");
    // private: the response was auth-gated, so never let a shared cache
    // serve it to another user. Browsers may still cache it.
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.status(200).end(buf);
  } catch {
    res.status(502).end();
  }
}
