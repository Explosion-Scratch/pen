// Credit to: https://d3-graph-gallery.com/graph/histogram_double.html
import * as d3 from 'd3';

const width = 420;
const height = 280;
const margin = { top: 30, right: 30, bottom: 40, left: 40 };

const svg = d3.select("#viz")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

/** 
 * Generates random data for two groups with different normal distributions
 */
function generateData() {
  const n = 1000;
  const genA = d3.randomNormal(150, 40);
  const genB = d3.randomNormal(250, 30);
  
  return [
    ...Array.from({ length: n }, () => ({ value: genA(), group: 'A' })),
    ...Array.from({ length: n }, () => ({ value: genB(), group: 'B' }))
  ];
}

const x = d3.scaleLinear()
  .domain([0, 400])
  .range([0, width]);

svg.append("g")
  .attr("transform", `translate(0,${height})`)
  .attr("class", "axis-x")
  .call(d3.axisBottom(x).ticks(8));

const y = d3.scaleLinear()
  .range([height, 0]);

const yAxis = svg.append("g").attr("class", "axis-y");

const histogram = d3.histogram()
  .value(d => d.value)
  .domain(x.domain())
  .thresholds(x.ticks(30));

function update() {
  const data = generateData();
  
  const binsA = histogram(data.filter(d => d.group === 'A'));
  const binsB = histogram(data.filter(d => d.group === 'B'));

  y.domain([0, d3.max([...binsA, ...binsB], d => d.length)]);
  
  yAxis.transition().duration(500).call(d3.axisLeft(y).ticks(5));

  const drawGroup = (bins, color, className) => {
    const bars = svg.selectAll(`.${className}`)
      .data(bins);

    bars.enter()
      .append("rect")
      .attr("class", className)
      .merge(bars)
      .transition()
      .duration(500)
      .attr("x", 1)
      .attr("transform", d => `translate(${x(d.x0)},${y(d.length)})`)
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("height", d => height - y(d.length))
      .style("fill", color)
      .style("stroke", "#000000")
      .style("stroke-width", "2px")
      .style("opacity", 1);

    bars.exit().remove();
  };

  drawGroup(binsA, "var(--accent-color, #E6B800)", "barA");
  drawGroup(binsB, "#000000", "barB");
}

// Initial draw
update();

document.getElementById('randomize').addEventListener('click', update);
