// Inputs: cm0 dimensionless, cmAlphaPerRad 1/rad, angle/disturbance in deg.
// Outputs: Cm and delta_Cm dimensionless; trim angle in deg.
// Sign convention: positive alpha and Cm are nose-up.
// Assumption: linear, quasi-static Cm-alpha relationship.

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function requireFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

export function degreesToRadians(degrees) {
  requireFiniteNumber(degrees, "degrees");
  return degrees * DEG_TO_RAD;
}

export function radiansToDegrees(radians) {
  requireFiniteNumber(radians, "radians");
  return radians * RAD_TO_DEG;
}

export function calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  const alphaRad = degreesToRadians(angleOfAttackDeg);

  return cm0 + cmAlphaPerRad * alphaRad;
}

export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  const alphaTrimRad = -cm0 / cmAlphaPerRad;
  return radiansToDegrees(alphaTrimRad);
}

export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);

  return cmAlphaPerRad * disturbanceAlphaRad;
}

export function classifyDisturbance(disturbanceAlphaDeg, deltaCm) {
  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  requireFiniteNumber(deltaCm, "deltaCm");

  const product = disturbanceAlphaRad * deltaCm;

  if (product < 0) {
    return "restoring";
  }

  if (product > 0) {
    return "destabilizing";
  }

  return "neutral";
}

export function isTrimmed(cm) {
  requireFiniteNumber(cm, "cm");
  return Math.abs(cm) <= 1e-6;
}

export function analyzeTrimResponse({
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg,
  disturbanceAlphaDeg,
}) {
  const currentCm = calculateCm(
    cm0,
    cmAlphaPerRad,
    angleOfAttackDeg,
  );

  const trimAngleDeg = calculateTrimAngleDeg(cm0, cmAlphaPerRad);
  const deltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    disturbanceAlphaDeg,
  );
  const disturbanceTendency = classifyDisturbance(
    disturbanceAlphaDeg,
    deltaCm,
  );

  return {
    cm: currentCm,
    trimAngleDeg,
    deltaCm,
    trimmed: isTrimmed(currentCm),
    disturbanceTendency,
  };
}
