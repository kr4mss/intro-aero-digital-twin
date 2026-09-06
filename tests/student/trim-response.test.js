import { describe, expect, test } from "vitest";
import {
  analyzeTrimResponse,
  calculateCm,
  calculateDeltaCm,
  calculateTrimAngleDeg,
  classifyDisturbance,
  isTrimmed,
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  test("numerical case", () => {
    const result = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    expect(result.cm).toBeCloseTo(0.00006687, 6);
    expect(result.trimAngleDeg).toBeCloseTo(2.86478898, 4);
    expect(result.deltaCm).toBeCloseTo(-0.00279253, 6);
    expect(result.trimmed).toBe(false);
    expect(result.disturbanceTendency).toBe("restoring");
  });

  test("behavioral case: doubling disturbance doubles delta_Cm", () => {
    const baseline = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    const doubled = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 4.0,
    });

    expect(doubled.deltaCm).toBeCloseTo(-0.00558505, 6);
    expect(doubled.deltaCm).toBeCloseTo(baseline.deltaCm * 2, 6);
    expect(doubled.deltaCm).toBeLessThan(0);
    expect(doubled.disturbanceTendency).toBe("restoring");
    expect(doubled.cm).toBe(baseline.cm);
    expect(doubled.trimAngleDeg).toBe(baseline.trimAngleDeg);
  });

  test("boundary case: zero slope has no unique trim angle", () => {
    const result = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0.0,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    expect(result.cm).toBe(0.04);
    expect(result.trimAngleDeg).toBeNull();
    expect(result.deltaCm).toBe(0.0);
    expect(result.trimmed).toBe(false);
    expect(result.disturbanceTendency).toBe("neutral");
  });

  test("zero slope produces no disturbance moment change", () => {
    expect(calculateDeltaCm(0, 2)).toBe(0);
    expect(classifyDisturbance(2, 0)).toBe("neutral");
  });

  test("trim tolerance uses the specified absolute tolerance", () => {
    expect(isTrimmed(1e-6)).toBe(true);
    expect(isTrimmed(-1e-6)).toBe(true);
    expect(isTrimmed(1.000001e-6)).toBe(false);
  });

  test("physics functions produce the reference values", () => {
    expect(calculateCm(0.04, -0.8, 2.86)).toBeCloseTo(
      0.00006687,
      6,
    );
    expect(calculateTrimAngleDeg(0.04, -0.8)).toBeCloseTo(
      2.86478898,
      4,
    );
    expect(calculateDeltaCm(-0.8, 2.0)).toBeCloseTo(
      -0.00279253,
      6,
    );
  });

  test("obviously invalid numeric inputs are rejected", () => {
    expect(() => calculateCm(
      Number.NaN,
      -0.8,
      2.86,
    )).toThrow(TypeError);

    expect(() => calculateCm(
      0.04,
      Number.POSITIVE_INFINITY,
      2.86,
    )).toThrow(TypeError);

    expect(() => calculateDeltaCm(
      -0.8,
      Number.NaN,
    )).toThrow(TypeError);

    expect(() => calculateTrimAngleDeg(
      0.04,
      Number.NEGATIVE_INFINITY,
    )).toThrow(TypeError);
  });
});
