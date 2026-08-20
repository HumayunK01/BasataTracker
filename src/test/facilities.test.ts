/**
 * Facilities schema verification.
 *
 * Mirrors the Zod schema + logo-cleaning in src/hooks/useFacilities.ts (kept
 * byte-identical; the source file isn't importable in tests because it pulls
 * in the supabase client). Same tripwire convention as security-claims.test.ts.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// Mirrors src/hooks/useFacilities.ts:14-23
const FacilitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name too long"),
  fax_number: z.string().trim().min(1, "Fax number is required").max(50, "Fax number too long"),
  logo_url: z
    .string()
    .trim()
    .max(2000, "Logo URL too long")
    .regex(/^https?:\/\//i, "Logo must be a valid http(s) URL")
    .optional()
    .or(z.literal("")),
});

// Mirrors src/hooks/useFacilities.ts:26-28
function cleanLogo(input: z.infer<typeof FacilitySchema>) {
  return { ...input, logo_url: input.logo_url ? input.logo_url : null };
}

// Mirrors src/pages/Facilities.tsx:48-59
function formatFax(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

// Mirrors src/pages/Facilities.tsx:62-70
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

describe("Facilities fax number formatting", () => {
  it("formats a plain 10-digit number", () => {
    expect(formatFax("6239306060")).toBe("(623) 930-6060");
  });

  it("formats a number with existing punctuation", () => {
    expect(formatFax("623-930-6060")).toBe("(623) 930-6060");
  });

  it("formats an 11-digit number with country code", () => {
    expect(formatFax("16239306060")).toBe("(623) 930-6060");
  });

  it("leaves non-10/11-digit numbers untouched", () => {
    expect(formatFax("ext. 2101")).toBe("ext. 2101");
  });

  it("copies a 10-digit number in E.164 form", () => {
    expect(toE164("(623) 930-6060")).toBe("+16239306060");
  });

  it("copies an 11-digit number in E.164 form", () => {
    expect(toE164("1623-930-6060")).toBe("+16239306060");
  });

  it("leaves non-10/11-digit numbers untouched when copying", () => {
    expect(toE164("ext. 2101")).toBe("ext. 2101");
  });
});

describe("Facilities input validation", () => {
  it("rejects a missing name", () => {
    const r = FacilitySchema.safeParse({ name: " ", fax_number: "555-0100", logo_url: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a missing fax number", () => {
    const r = FacilitySchema.safeParse({ name: "Phoenix Heart", fax_number: "", logo_url: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a javascript: logo URL", () => {
    const r = FacilitySchema.safeParse({ name: "Phoenix Heart", fax_number: "555-0100", logo_url: "javascript:alert(1)" });
    expect(r.success).toBe(false);
  });

  it("accepts a valid facility and normalizes an empty logo to null", () => {
    const r = FacilitySchema.safeParse({ name: "Phoenix Heart", fax_number: "(602) 555-0134", logo_url: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(cleanLogo(r.data).logo_url).toBeNull();
  });
});