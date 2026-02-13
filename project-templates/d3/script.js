import * as d3 from 'd3';

const width = 300;
const height = 150;
const margin = { top: 20, right: 20, bottom: 30, left: 40 };

const svg = d3.select("#viz")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

function update(data) {
  const bars = svg.selectAll("rect")
    .data(data);

  bars.enter()
    .append("rect")
    .merge(bars)
    .transition()
    .duration(500)
    .attr("x", (d, i) => i * (width / data.length))
    .attr("y", d => height - d)
    .attr("width", (width / data.length) - 5)
    .attr("height", d => d)
    .attr("fill", "var(--accent-color, #1B9CE5)");

  bars.exit().remove();
}

const randomData = () => Array.from({ length: 10 }, () => Math.random() * (height - margin.top));

update(randomData());

document.getElementById('randomize').addEventListener('click', () => {
  update(randomData());
});
