import {
  analyzeTrimResponse,
  calculateCm,
  calculateDeltaCm,
  calculateTrimAngleDeg,
  classifyDisturbance,
  isTrimmed,
} from "../physics/trim-response.js";

const NUMERICAL_CASE = {
  cm0: 0.04,
  cmAlphaPerRad: -0.8,
  angleOfAttackDeg: 2.86,
  disturbanceAlphaDeg: 2.0,
};

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Determine whether the selected condition is trimmed and whether a small angle-of-attack disturbance has a restoring tendency.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg",
  ],
  requiresCapabilities: [
    { id: "loads.pitch.component-sum", version: 1 },
  ],
  providesCapabilities: [
    { id: "stability.pitch.cm-alpha", version: 1 },
  ],
  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],
  validityLimits: [
    "Do not use the linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "The model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency in this model is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle.",
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {},
  },

  analyze(aircraft, capabilityContext) {
    const capabilities = capabilityContext?.capabilities ?? capabilityContext ?? [];
    const requiredCapability = Array.isArray(capabilities)
      ? capabilities.find(
          (capability) =>
            capability?.id === "loads.pitch.component-sum" &&
            Number(capability?.version) >= 1,
        )
      : capabilities?.["loads.pitch.component-sum"];

    if (!requiredCapability) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question:
            "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
          interpretation:
            "The Stage 4 analysis is locked because the required loads.pitch.component-sum capability is not available.",
          status: "neutral",
        },
        plots: [],
        scene: null,
      };
    }

    const analysis = analyzeTrimResponse(aircraft);

    const trimResult = analysis.trimAngleDeg === null
      ? "not available"
      : analysis.trimAngleDeg;

    const decisionStatus = analysis.trimmed &&
      analysis.disturbanceTendency === "restoring"
      ? "pass"
      : analysis.disturbanceTendency === "destabilizing"
        ? "caution"
        : "neutral";

    const verificationCases = [
      {
        id: "numerical",
        title: "Numerical case",
        inputs: { ...NUMERICAL_CASE },
        expected: {
          cm: 0.00006687,
          trimAngleDeg: 2.86478898,
          deltaCm: -0.00279253,
          trimmed: false,
          disturbanceTendency: "restoring",
        },
        tolerances: {
          cm: 1e-6,
          trimAngleDeg: 1e-4,
          deltaCm: 1e-6,
        },
        passed: (() => {
          const result = analyzeTrimResponse(NUMERICAL_CASE);
          return (
            Math.abs(result.cm - 0.00006687) <= 1e-6 &&
            Math.abs(result.trimAngleDeg - 2.86478898) <= 1e-4 &&
            Math.abs(result.deltaCm - -0.00279253) <= 1e-6 &&
            result.trimmed === false &&
            result.disturbanceTendency === "restoring"
          );
        })(),
      },
      {
        id: "behavioral",
        title: "Behavioral case",
        inputs: {
          cm0: 0.04,
          cmAlphaPerRad: -0.8,
          angleOfAttackDeg: 2.86,
          disturbanceAlphaDeg: 4.0,
        },
        expected: {
          deltaCm: -0.00558505,
          deltaCmMagnitudeDoubles: true,
          disturbanceTendency: "restoring",
          cmUnchanged: true,
          trimAngleUnchanged: true,
        },
        tolerances: {
          deltaCm: 1e-6,
        },
        passed: (() => {
          const baseline = analyzeTrimResponse(NUMERICAL_CASE);
          const changed = analyzeTrimResponse({
            ...NUMERICAL_CASE,
            disturbanceAlphaDeg: 4.0,
          });

          return (
            Math.abs(changed.deltaCm - -0.00558505) <= 1e-6 &&
            Math.abs(changed.deltaCm) >=
              Math.abs(baseline.deltaCm) * 2 - 1e-6 &&
            changed.deltaCm < 0 &&
            changed.disturbanceTendency === "restoring" &&
            changed.cm === baseline.cm &&
            changed.trimAngleDeg === baseline.trimAngleDeg
          );
        })(),
      },
      {
        id: "boundary-zero-slope",
        title: "Boundary or sanity case",
        inputs: {
          cm0: 0.04,
          cmAlphaPerRad: 0.0,
          angleOfAttackDeg: 2.86,
          disturbanceAlphaDeg: 2.0,
        },
        expected: {
          cm: 0.04,
          trimAngleDeg: "not available",
          deltaCm: 0.0,
          trimmed: false,
          disturbanceTendency: "neutral",
        },
        passed: (() => {
          const result = analyzeTrimResponse({
            cm0: 0.04,
            cmAlphaPerRad: 0.0,
            angleOfAttackDeg: 2.86,
            disturbanceAlphaDeg: 2.0,
          });

          return (
            result.cm === 0.04 &&
            result.trimAngleDeg === null &&
            result.deltaCm === 0.0 &&
            result.trimmed === false &&
            result.disturbanceTendency === "neutral"
          );
        })(),
      },
    ];

    const plotPoints = [];
    for (let angle = -10; angle <= 10; angle += 1) {
      plotPoints.push({
        x: angle,
        y: calculateCm(
          aircraft.cm0,
          aircraft.cmAlphaPerRad,
          angle,
        ),
      });
    }

    return {
      results: [
        {
          id: "cm-alpha",
          label: "Pitching-moment coefficient, Cm(alpha)",
          value: analysis.cm,
          unit: "",
          precision: 8,
          emphasis: true,
        },
        {
          id: "trim-angle",
          label: "Trim angle",
          value: trimResult,
          unit: "deg",
          precision: 8,
        },
        {
          id: "delta-cm",
          label: "Disturbance moment-coefficient change, delta_Cm",
          value: analysis.deltaCm,
          unit: "",
          precision: 8,
        },
        {
          id: "trimmed",
          label: "Selected condition",
          value: analysis.trimmed ? "trimmed" : "not trimmed",
          unit: "",
          precision: 0,
        },
        {
          id: "disturbance-tendency",
          label: "Disturbance tendency",
          value: analysis.disturbanceTendency,
          unit: "",
          precision: 0,
        },
      ],
      verificationCases,
      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation:
          `The selected condition is ${analysis.trimmed ? "trimmed" : "not trimmed"} and the specified small disturbance has a ${analysis.disturbanceTendency} tendency according to the linear, quasi-static Cm-alpha model. This does not establish dynamic flight response, damping, control motion, handling quality, safety, controllability, or flightworthiness.`,
        status: decisionStatus,
      },
      plots: [
        {
          id: "cm-alpha-plot",
          title: "Cm–alpha relationship",
          xAxis: {
            label: "Angle of attack",
            unit: "deg",
            min: -10,
            max: 10,
          },
          yAxis: {
            label: "Pitching-moment coefficient",
            unit: "",
          },
          series: [
            {
              id: "cm-alpha",
              label: "Cm(alpha)",
              points: plotPoints,
            },
          ],
          regions: [],
          referenceLines: [
            {
              id: "trim-line",
              label: "Cm = 0",
              y: 0,
            },
          ],
        },
      ],
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",
  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft ?? {};
    const capabilities = runtimeContext?.capabilities;

    const requiredCapability = Array.isArray(capabilities)
      ? capabilities.find(
          (capability) =>
            capability?.id === "loads.pitch.component-sum" &&
            Number(capability?.version) >= 1,
        )
      : capabilities?.["loads.pitch.component-sum"];

    if (!requiredCapability) {
      return {
        values: {},
      };
    }

    const analysis = analyzeTrimResponse(aircraft);

    return {
      values: {
        cm: analysis.cm,
        trimAngleDeg: analysis.trimAngleDeg,
        deltaCm: analysis.deltaCm,
        trimmed: analysis.trimmed,
        disturbanceTendency: analysis.disturbanceTendency,
      },
    };
  },
};
