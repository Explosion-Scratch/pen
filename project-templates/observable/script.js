import * as Plot from "@observablehq/plot";

const data = [
  { x: 1, y: 10, category: "A" },
  { x: 2, y: 15, category: "B" },
  { x: 3, y: 13, category: "A" },
  { x: 4, y: 18, category: "B" },
  { x: 5, y: 20, category: "A" },
];

const plot = Plot.plot({
  grid: true,
  x: { label: "Time" },
  y: { label: "Value" },
  marks: [
    Plot.lineY(data, { x: "x", y: "y", stroke: "category" }),
    Plot.dot(data, { x: "x", y: "y", fill: "category" })
  ],
  color: {
    range: ["#f9ab00", "#ffcc00"]
  }
});

document.getElementById("plot").appendChild(plot);
