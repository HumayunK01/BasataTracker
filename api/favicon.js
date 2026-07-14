// Same-origin favicon proxy. The app's CSP (img-src 'self') and COEP
// (require-corp) block cross-origin images, so we fetch the favicon server-side
// and return it from our own origin. This also keeps the upstream host off the
// client and avoids leaking the request to a third party from the browser.
export default async function handler(req, res) {
  const domain = req.query.domain;
  // Only allow a plain hostname (no scheme/path) to avoid SSRF via the upstream URL.
  if (typeof domain !== "string" || !/^[a-z0-9.-]+$/i.test(domain) || domain.length > 253) {
    res.status(400).end();
    return;
  }
  try {
    const upstream = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    const r = await fetch(upstream);
    if (!r.ok) {
      res.status(r.status).end();
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", r.headers.get("content-type") || "image/x-icon");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).end(buf);
  } catch {
    res.status(502).end();
  }
}
