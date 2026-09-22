// Same-origin logo proxy. Production CSP (img-src 'self') and COEP
// (require-corp) block cross-origin images, so we fetch the facility logo
// server-side and return it from our own origin (same pattern as /api/favicon).
// The upstream URL is admin-supplied, so it's validated hard against SSRF:
// https/http only, no private/loopback/link-local hosts (checked again after
// redirects), image content-type only, and a response-size cap.
import dns from "node:dns/promises";
import authorized from "./_auth.js";

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
  if (
    a === "::1" ||
    a === "::" ||
    a.startsWith("fe80:") ||
    a.startsWith("fc") ||
    a.startsWith("fd") ||
    a.startsWith("2001:db8:")
  ) {
    return true;
  }
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped && PRIVATE_V4.some((re) => re.test(mapped[1]))) return true;
  return PRIVATE_V4.some((re) => re.test(a));
}

async function isBlockedHost(host) {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".lan")
  ) {
    return true;
  }
  if (isPrivateIp(h)) return true;
  try {
    const addresses = await dns.lookup(h, { all: true });
    if (!addresses || addresses.length === 0) return true;
    return addresses.some((entry) => isPrivateIp(entry.address));
  } catch {
    return true; // unresolvable host — refuse
  }
}

export default async function handler(req, res) {
  if (!(await authorized(req))) {
    res.status(401).end();
    return;
  }
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

  const MAX_HOPS = 3;
  const MAX_SIZE = 2 * 1024 * 1024;
  let currentUrl = url;
  let r;

  try {
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      if (await isBlockedHost(currentUrl.hostname)) {
        res.status(400).end();
        return;
      }
      r = await fetch(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });

      if (r.status >= 300 && r.status < 400 && r.headers.has("location")) {
        const next = new URL(r.headers.get("location"), currentUrl);
        if (next.protocol !== "https:" && next.protocol !== "http:") {
          res.status(400).end();
          return;
        }
        currentUrl = next;
        continue;
      }
      break;
    }

    if (!r || !r.ok) {
      res.status(r ? r.status : 502).end();
      return;
    }

    const type = r.headers.get("content-type") || "";
    if (!type.startsWith("image/")) {
      res.status(400).end();
      return;
    }

    const contentLength = parseInt(r.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_SIZE) {
      res.status(502).end();
      return;
    }

    const chunks = [];
    let bytes = 0;
    for await (const chunk of r.body) {
      bytes += chunk.byteLength;
      if (bytes > MAX_SIZE) {
        res.status(502).end();
        return;
      }
      chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);

    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.status(200).end(buf);
  } catch {
    res.status(502).end();
  }
}