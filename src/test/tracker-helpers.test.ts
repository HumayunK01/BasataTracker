import { describe, it, expect } from "vitest";
import { stepIsSkipped } from "@/components/ar/tracker/tracker-helpers";
import type { FaxRow, StepField } from "@/hooks/useFaxTracker";

const row = (step1: FaxRow["step1"], step2: FaxRow["step2"], step3: FaxRow["step3"]) =>
  ({ step1, step2, step3 }) as FaxRow;

describe("stepIsSkipped (indexable)", () => {
  it("marks later steps skipped when step 1 is sent", () => {
    const r = row("Successfully Sent", "Pending", "Pending");
    expect(stepIsSkipped(r, "step2", "indexable")).toBe(true);
    expect(stepIsSkipped(r, "step3", "indexable")).toBe(true);
  });

  it("marks earlier steps skipped when a later step is sent", () => {
    const r = row("Pending", "Pending", "Successfully Sent");
    expect(stepIsSkipped(r, "step1", "indexable")).toBe(true);
    expect(stepIsSkipped(r, "step2", "indexable")).toBe(true);
  });

  it("does not skip a step that was attempted or none sent", () => {
    const r = row("Failed", "Failed", "Pending");
    expect(stepIsSkipped(r, "step1", "indexable")).toBe(false);
    expect(stepIsSkipped(r, "step2", "indexable")).toBe(false);
    expect(stepIsSkipped(r, "step3", "indexable")).toBe(false);
  });

  it("is inert outside indexable mode", () => {
    const r = row("Successfully Sent", "Pending", "Pending");
    expect(stepIsSkipped(r, "step2", "fax")).toBe(false);
  });
});
