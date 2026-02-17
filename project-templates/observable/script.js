import * as Plot from "@observablehq/plot";

// Seeded PRNG (mulberry32) for reproducible data
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

// Box-Muller for Gaussian noise
function gaussian(mean, std) {
  const u1 = rand();
  const u2 = rand();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Generate 140 points: upward trend, y scattered in [-0.6, 1.2]
const n = 140;
const data = Array.from({ length: n }, (_, i) => {
  const x = i + gaussian(0, 0.4);
  const trend = -0.4 + (1.0 / n) * i; // linear trend from -0.4 → +0.6
  const y = Math.max(-0.6, Math.min(1.2, gaussian(trend, 0.25)));
  return { x, y };
});

const plot = Plot.plot({
  width: 720,
  height: 420,
  grid: true,
  x: { label: "Observation" },
  y: { label: "Value", domain: [-0.7, 1.3] },
  color: {
    type: "diverging",
    scheme: "RdBu",
    domain: [-0.6, 1.2],
    pivot: 0,
    reverse: true,
    label: "Value",
    legend: true,
  },
  marks: [
    Plot.ruleY([0], { stroke: "#ccc", strokeDasharray: "4 3" }),
    Plot.dot(data, {
      x: "x",
      y: "y",
      fill: "y",
      r: 4,
      stroke: "#fff",
      strokeWidth: 0.6,
      opacity: 0.88,
    }),
  ],
});

document.getElementById("plot").appendChild(plot);
