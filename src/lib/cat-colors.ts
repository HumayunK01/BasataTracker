export const CAT_COLORS = [
  "hsl(155 55% 62%)",   // green
  "hsl(214 70% 68%)",   // blue
  "hsl(38 88% 60%)",    // amber
  "hsl(340 75% 65%)",   // pink
  "hsl(280 70% 68%)",   // purple
  "hsl(20 85% 60%)",    // orange
  "hsl(190 70% 58%)",   // teal
  "hsl(60 70% 58%)",    // yellow
  "hsl(0 72% 65%)",     // red
  "hsl(168 60% 55%)",   // mint
  "hsl(240 65% 70%)",   // indigo
  "hsl(300 55% 65%)",   // magenta
  "hsl(25 90% 55%)",    // deep orange
  "hsl(174 55% 55%)",   // cyan
  "hsl(80 60% 55%)",    // lime
  "hsl(320 60% 62%)",   // rose
];

// Returns a stable color for a given category key so the same
// category always gets the same color regardless of list order.
function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function colorForKey(key: string): string {
  return CAT_COLORS[hashKey(key) % CAT_COLORS.length];
}
