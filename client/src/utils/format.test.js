import { describe, expect, it } from "vitest";
import { checkNumber } from "./format";

describe("checkNumber", () => {
    it("returns the value when within range", () => {
        expect(checkNumber(12, 1, 24)).toBe(12);
    });

    it("clamps to min when below range", () => {
        expect(checkNumber(-5, 1, 24)).toBe(1);
    });

    it("clamps to max when above range", () => {
        expect(checkNumber(9999, 1, 24)).toBe(24);
    });

    it("returns max for a non-number value", () => {
        expect(checkNumber("not-a-number", 1, 24)).toBe(24);
        expect(checkNumber(undefined, 1, 24)).toBe(24);
        expect(checkNumber(null, 1, 24)).toBe(24);
    });
});
