import { beforeAll, describe, expect, test } from "vitest";
import { loadUtils } from "./helpers/loadUtils.js";

// Test cases mirror the documented plan in error_handling_and_testing.md
// (Rewards Engine / Utility Functions sections) -- this suite is the first
// automated implementation of that plan.

let utils;

beforeAll(async () => {
  utils = await loadUtils();
});

describe("calculateEarnedPoints", () => {
  test.each([
    [0, 0],
    [99, 0], // below one block
    [100, 4],
    [250, 8], // NOT 10 -- whole blocks only
    [400, 16],
  ])("calculateEarnedPoints(%i) === %i", (amount, expected) => {
    expect(utils.calculateEarnedPoints(amount)).toBe(expected);
  });

  test("treats negative amounts as zero", () => {
    expect(utils.calculateEarnedPoints(-50)).toBe(0);
  });
});

describe("calculateRedeemFromPoints", () => {
  test.each([
    [0, 100, { pointsToRedeem: 0, rupeesToApply: 0 }],
    [4, 100, { pointsToRedeem: 4, rupeesToApply: 1 }],
    [16, 100, { pointsToRedeem: 16, rupeesToApply: 4 }],
    [20, 3, { pointsToRedeem: 12, rupeesToApply: 3 }], // capped by maxRupees
    [3, 100, { pointsToRedeem: 0, rupeesToApply: 0 }], // insufficient points
  ])("calculateRedeemFromPoints(%i pts, max ₹%i)", (points, max, expected) => {
    expect(utils.calculateRedeemFromPoints(points, max)).toEqual(expected);
  });

  test("never returns a negative redeemable amount for negative inputs", () => {
    expect(utils.calculateRedeemFromPoints(-10, -5)).toEqual({
      pointsToRedeem: 0,
      rupeesToApply: 0,
    });
  });
});

describe("escapeHtml", () => {
  test("sanitizes script tags", () => {
    expect(utils.escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  test("escapes quotes used to break out of HTML attributes", () => {
    expect(utils.escapeHtml(`"><img src=x onerror=alert(1)>`)).not.toContain("<img");
  });

  test("handles null/undefined/zero", () => {
    expect(utils.escapeHtml(null)).toBe("");
    expect(utils.escapeHtml(undefined)).toBe("");
    expect(utils.escapeHtml(0)).toBe("0");
  });
});

describe("formatINR / formatCost", () => {
  test("formatINR renders rupee symbol with two decimals", () => {
    expect(utils.formatINR(1234.5)).toBe("₹1234.50");
    expect(utils.formatINR(0)).toBe("₹0.00");
    expect(utils.formatINR(undefined)).toBe("₹0.00");
  });

  test("formatCost shows a dash for zero/empty cost and a formatted amount otherwise", () => {
    expect(utils.formatCost(0)).toBe("-");
    expect(utils.formatCost(undefined)).toBe("-");
    expect(utils.formatCost(500)).toBe("₹500.00");
  });
});

describe("formatFileSize", () => {
  test.each([
    [500, "500 B"],
    [2048, "2.0 KB"],
    [5 * 1024 * 1024, "5.0 MB"],
  ])("formatFileSize(%i) === %s", (bytes, expected) => {
    expect(utils.formatFileSize(bytes)).toBe(expected);
  });

  test("returns empty string for non-finite input", () => {
    expect(utils.formatFileSize(NaN)).toBe("");
    expect(utils.formatFileSize(Infinity)).toBe("");
  });
});

describe("slugifyFormName", () => {
  test("lowercases, replaces non-alphanumerics with hyphens, and trims edge hyphens", () => {
    expect(utils.slugifyFormName("Dental Insurance Claim Form!")).toBe(
      "dental-insurance-claim-form"
    );
    expect(utils.slugifyFormName("  Spaced -- Out  ")).toBe("spaced-out");
  });

  test("returns empty string for empty/missing input", () => {
    expect(utils.slugifyFormName("")).toBe("");
    expect(utils.slugifyFormName(undefined)).toBe("");
  });
});

describe("normalizeCategory", () => {
  test("trims and lowercases for case-insensitive comparisons", () => {
    expect(utils.normalizeCategory("  Preventive & Diagnostic  ")).toBe("preventive & diagnostic");
  });

  test("returns empty string for missing input", () => {
    expect(utils.normalizeCategory(undefined)).toBe("");
  });
});
