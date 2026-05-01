export interface CalcInputs {
  dist_km: number;
  h_turbina: number;
  h_obs: number;
  largura_km: number;
  area: number;
  ci: number;
  k: number;
  beta: number;
}

export type VisibilityReason =
  | "visible"
  | "no_structure"
  | "hidden_by_horizon"
  | "blocked_by_atmosphere"
  | "hidden_and_blocked";

export type LimitingFactor = "geometry" | "atmosphere" | "both" | "none";

export interface CalcOutputs {
  h_oculta: number;
  h_visivel: number;
  alpha: number;
  theta: number;
  prob_pct: number;
  cd: number;
  isVisible: boolean;
  atmosfera_permite: boolean;
  horizonte_obs: number;
  distancia_geometrica_max_km: number;
  distancia_atmosferica_max_km: number;
  distancia_limite_visibilidade_km: number;
  visibilityReason: VisibilityReason;
  limitingFactor: LimitingFactor;
}

export const EARTH_RADIUS_M = 6_371_000;
export const CONTRAST_THRESHOLD_PCT = 2.0;
export const ROTOR_MOTION_AREA_FACTOR = 1.2;

const DEG_PER_RAD = 180 / Math.PI;
const ARC_MINUTES_PER_DEGREE = 60;
const FLOAT_TOLERANCE = 1e-12;

function assertFiniteNumber(name: keyof CalcInputs, value: number) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
  }
}

function assertNonNegative(name: keyof CalcInputs, value: number) {
  assertFiniteNumber(name, value);
  if (value < 0) throw new RangeError(`${name} must be greater than or equal to zero.`);
}

function assertPositive(name: keyof CalcInputs, value: number) {
  assertFiniteNumber(name, value);
  if (value <= 0) throw new RangeError(`${name} must be greater than zero.`);
}

function validateInputs(inputs: CalcInputs) {
  assertPositive("dist_km", inputs.dist_km);
  assertNonNegative("h_turbina", inputs.h_turbina);
  assertNonNegative("h_obs", inputs.h_obs);
  assertNonNegative("largura_km", inputs.largura_km);
  assertNonNegative("area", inputs.area);
  assertNonNegative("ci", inputs.ci);
  assertPositive("k", inputs.k);
  assertNonNegative("beta", inputs.beta);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function calculateAtmosphericLimitKm(ci: number, beta: number) {
  if (ci + FLOAT_TOLERANCE < CONTRAST_THRESHOLD_PCT) return 0;
  if (beta === 0) return Number.POSITIVE_INFINITY;
  return Math.log(ci / CONTRAST_THRESHOLD_PCT) / beta / 1000;
}

function getVisibilityReason(h_visivel: number, h_turbina: number, atmosfera_permite: boolean): VisibilityReason {
  if (h_turbina === 0) return "no_structure";

  const hiddenByHorizon = h_visivel <= 0;
  const blockedByAtmosphere = !atmosfera_permite;

  if (hiddenByHorizon && blockedByAtmosphere) return "hidden_and_blocked";
  if (hiddenByHorizon) return "hidden_by_horizon";
  if (blockedByAtmosphere) return "blocked_by_atmosphere";
  return "visible";
}

function getLimitingFactor(geometricLimitKm: number, atmosphericLimitKm: number): LimitingFactor {
  if (!Number.isFinite(atmosphericLimitKm)) return "geometry";
  if (Math.abs(geometricLimitKm - atmosphericLimitKm) <= 0.1) return "both";
  return geometricLimitKm < atmosphericLimitKm ? "geometry" : "atmosphere";
}

export function calculate(inputs: CalcInputs): CalcOutputs {
  validateInputs(inputs);

  const { dist_km, h_turbina, h_obs, largura_km, area, ci, k, beta } = inputs;
  const dist_m = dist_km * 1000;
  const largura_m = largura_km * 1000;
  const effectiveEarthRadius = EARTH_RADIUS_M * k;

  const horizonte_obs = Math.sqrt(2 * effectiveEarthRadius * h_obs);
  const turbineTopHorizon = Math.sqrt(2 * effectiveEarthRadius * h_turbina);
  const distancia_geometrica_max_km = (horizonte_obs + turbineTopHorizon) / 1000;
  const distancia_atmosferica_max_km = calculateAtmosphericLimitKm(ci, beta);
  const distancia_limite_visibilidade_km = Math.min(distancia_geometrica_max_km, distancia_atmosferica_max_km);

  const distanceBeyondHorizon = Math.max(0, dist_m - horizonte_obs);
  const rawHiddenHeight = Math.pow(distanceBeyondHorizon, 2) / (2 * effectiveEarthRadius);
  const h_oculta = clamp(rawHiddenHeight, 0, h_turbina);
  const h_visivel = Math.max(0, h_turbina - h_oculta);

  const cd = ci * Math.exp(-beta * dist_m);
  const atmosfera_permite = cd + FLOAT_TOLERANCE >= CONTRAST_THRESHOLD_PCT;
  const isVisible = h_visivel > 0 && atmosfera_permite;
  const visibilityReason = getVisibilityReason(h_visivel, h_turbina, atmosfera_permite);
  const limitingFactor = getLimitingFactor(distancia_geometrica_max_km, distancia_atmosferica_max_km);

  const alpha = h_visivel > 0 ? 2 * Math.atan(largura_m / (2 * dist_m)) * DEG_PER_RAD : 0;
  const theta = h_visivel > 0 ? Math.atan(h_visivel / dist_m) * DEG_PER_RAD : 0;

  let prob_pct = 0;
  if (isVisible && area > 0 && cd > 0) {
    const perceivedArea = area * ROTOR_MOTION_AREA_FACTOR;
    const oneMeterAngularMinutes = Math.atan(1 / dist_m) * DEG_PER_RAD * ARC_MINUTES_PER_DEGREE;
    const visualMagnitude = perceivedArea * Math.pow(oneMeterAngularMinutes, 2);
    const logit = -16.02 + 0.0124 * (cd * visualMagnitude) + 12.75;
    prob_pct = clamp((1 / (1 + Math.exp(-logit))) * 100, 0, 100);
  }

  return {
    h_oculta,
    h_visivel,
    alpha,
    theta,
    prob_pct,
    cd,
    isVisible,
    atmosfera_permite,
    horizonte_obs,
    distancia_geometrica_max_km,
    distancia_atmosferica_max_km,
    distancia_limite_visibilidade_km,
    visibilityReason,
    limitingFactor,
  };
}
