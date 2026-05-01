import { describe, expect, it } from "vitest";
import { calculate, CONTRAST_THRESHOLD_PCT, EARTH_RADIUS_M, type CalcInputs } from "./calculations";

const baseInputs: CalcInputs = {
  dist_km: 15,
  h_turbina: 260,
  h_obs: 2,
  largura_km: 10,
  area: 1500,
  ci: 35,
  k: 1.13,
  beta: 0,
};

const makeInputs = (overrides: Partial<CalcInputs> = {}): CalcInputs => ({ ...baseInputs, ...overrides });

describe("calculate", () => {
  it("calculates horizon and hidden turbine height", () => {
    const hiddenHeight = 25;
    const observerHorizonM = Math.sqrt(2 * EARTH_RADIUS_M * 2);
    const distanceM = observerHorizonM + Math.sqrt(2 * EARTH_RADIUS_M * hiddenHeight);
    const out = calculate(makeInputs({ dist_km: distanceM / 1000, h_turbina: 100, k: 1 }));

    expect(out.horizonte_obs).toBeCloseTo(observerHorizonM, 6);
    expect(out.h_oculta).toBeCloseTo(hiddenHeight, 6);
    expect(out.h_visivel).toBeCloseTo(75, 6);
  });

  it("uses refraction k to extend the horizon", () => {
    const pureGeometry = calculate(makeInputs({ dist_km: 30, h_turbina: 200, k: 1 }));
    const refracted = calculate(makeInputs({ dist_km: 30, h_turbina: 200, k: 1.17 }));

    expect(refracted.horizonte_obs).toBeGreaterThan(pureGeometry.horizonte_obs);
    expect(refracted.h_oculta).toBeLessThan(pureGeometry.h_oculta);
    expect(refracted.distancia_geometrica_max_km).toBeGreaterThan(pureGeometry.distancia_geometrica_max_km);
  });

  it("applies atmospheric attenuation beta", () => {
    const clearAir = calculate(makeInputs({ dist_km: 25, h_obs: 50, h_turbina: 300, beta: 0 }));
    const denseHaze = calculate(makeInputs({ dist_km: 25, h_obs: 50, h_turbina: 300, beta: 0.0003 }));

    expect(clearAir.cd).toBeCloseTo(35, 6);
    expect(clearAir.isVisible).toBe(true);
    expect(denseHaze.h_visivel).toBeGreaterThan(0);
    expect(denseHaze.cd).toBeLessThan(CONTRAST_THRESHOLD_PCT);
    expect(denseHaze.isVisible).toBe(false);
    expect(denseHaze.visibilityReason).toBe("blocked_by_atmosphere");
  });

  it("calculates atmospheric distance limit", () => {
    const out = calculate(makeInputs({ ci: 35, beta: 0.00008 }));
    expect(out.distancia_atmosferica_max_km).toBeCloseTo(Math.log(35 / 2) / 0.00008 / 1000, 6);
  });

  it("treats the contrast threshold as visible at the boundary", () => {
    const distM = 10_000;
    const betaAtThreshold = Math.log(baseInputs.ci / CONTRAST_THRESHOLD_PCT) / distM;
    const out = calculate(makeInputs({ dist_km: distM / 1000, beta: betaAtThreshold }));

    expect(out.cd).toBeCloseTo(CONTRAST_THRESHOLD_PCT, 10);
    expect(out.atmosfera_permite).toBe(true);
  });

  it("returns zero angular occupation when fully hidden", () => {
    const out = calculate(makeInputs({ dist_km: 200, h_turbina: 100, h_obs: 0, k: 1 }));

    expect(out.h_visivel).toBe(0);
    expect(out.alpha).toBe(0);
    expect(out.theta).toBe(0);
    expect(out.prob_pct).toBe(0);
    expect(out.visibilityReason).toBe("hidden_by_horizon");
  });

  it("handles zero-width or zero-height edge cases", () => {
    const out = calculate(makeInputs({ h_turbina: 0, largura_km: 0 }));

    expect(out.h_oculta).toBe(0);
    expect(out.h_visivel).toBe(0);
    expect(out.alpha).toBe(0);
    expect(out.theta).toBe(0);
    expect(out.visibilityReason).toBe("no_structure");
  });

  it("rejects physically invalid inputs", () => {
    expect(() => calculate(makeInputs({ dist_km: 0 }))).toThrow(RangeError);
    expect(() => calculate(makeInputs({ k: 0 }))).toThrow(RangeError);
    expect(() => calculate(makeInputs({ beta: -0.1 }))).toThrow(RangeError);
    expect(() => calculate(makeInputs({ h_obs: -1 }))).toThrow(RangeError);
  });
});
