// Same-origin logo proxy. Production CSP (img-src 'self') and COEP
// (require-corp) block cross-origin images, so we fetch the facility logo
// server-side and return it from our own origin (same pattern as /api/favicon).
// The upstream URL is admin-supplied, so it's validated hard against SSRF:
// https/http only, no private/loopback/link-local hosts (checked again after
// redirects), image content-type only, and a response-size cap.
import dns from "node:dns/promises";

const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^224\./,
  /^240\./,
  /^255\./,
];

function isPrivateIp(address) {
  const a = address.toLowerCase();
  if (a === "::1" || a.startsWith("fe80:") || a.startsWith("fc") || a.startsWith("fd")) return true;
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped && PRIVATE_V4.some((re) => re.test(mapped[1]))) return true;
  return PRIVATE_V4.some((re) => re.test(a));
}

async function isBlockedHost(host) {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".lan")) return true;
  try {
    const { address } = await dns.lookup(h, { family: 4 });
    return isPrivateIp(address);
  } catch {
    return true; // unresolvable host — refuse
  }
}

export default async function handler(req, res) {
  const raw = req.query.url;
  if (typeof raw !== "string" || raw.length > 2048) {
    res.status(400).end();
    return;
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    res.status(400).end();
    return;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    res.status(400).end();
    return;
  }
  if (await isBlockedHost(url.hostname)) {
    res.status(400).end();
    return;
  }

  try {
    const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10000) });
    // fetch follows redirects, so re-check the final host (redirect SSRF guard).
    if (await isBlockedHost(new URL(r.url).hostname)) {
      res.status(400).end();
      return;
    }
    if (!r.ok) {
      res.status(r.status).end();
      return;
    }
    const type = r.headers.get("content-type") || "";
    if (!type.startsWith("image/")) {
      res.status(400).end();
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    // ponytail: hard cap — logos are small; a bigger upstream is wrong data.
    if (buf.byteLength > 2 * 1024 * 1024) {
      res.status(502).end();
      return;
    }
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).end(buf);
  } catch {
    res.status(502).end();
  }
}