// Generate sample data to replace missing file
function generateSampleData() {
  const data = [];
  for (let i = 0; i < 100; i++) {
    const time = i * 0.5 + Math.random() * 0.1;
    const delta = 0.8 + Math.random() * 0.4;
    data.push({ time, delta });
  }
  return data;
}

const svg = d3.select("svg"),
      width = +svg.attr("width") || 1000,
      height = +svg.attr("height") || 500,
      margin = { top: 20, right: 30, bottom: 40, left: 50 };

const g = svg.append("g");

// Use generated data instead of loading from file
const data = generateSampleData();

let x = d3.scaleLinear()
  .domain(d3.extent(data, d => d.time)).nice()
  .range([margin.left, width - margin.right]);

let y = d3.scaleLinear()
  .domain(d3.extent(data, d => d.delta)).nice()
  .range([height - margin.bottom, margin.top]);

// Axes
const xAxis = g.append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(x));

const yAxis = g.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(d3.axisLeft(y));

// Axis labels
svg.append("text")
  .attr("x", width / 2)
  .attr("y", height - 10)
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Time in Seconds");

svg.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 15)
  .attr("x", -height / 2)
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("Time Between Steps");

// Dots
const dots = g.append("g")
  .attr("clip-path", "inset(0)")
  .selectAll("circle")
  .data(data)
  .join("circle")
  .attr("cx", d => x(d.time))
  .attr("cy", d => y(d.delta))
  .attr("r", 3);

// Container for new dots
const newDotsGroup = g.append("g");

// Zoom behavior
const zoom = d3.zoom()
  .scaleExtent([1, 10])
  .translateExtent([[0, 0], [width, height]])
  .on("zoom", zoomed);

svg.call(zoom);

function zoomed(event) {
  const zx = event.transform.rescaleX(x);
  const zy = event.transform.rescaleY(y);

  xAxis.call(d3.axisBottom(zx));
  yAxis.call(d3.axisLeft(zy));

  dots
    .attr("cx", d => zx(d.time))
    .attr("cy", d => zy(d.delta));

  // Update new dots too
  newDotsGroup.selectAll(".new-dot")
    .attr("cx", (d, i) => zx(i * 0.5))
    .attr("cy", d => zy(d));
}

// Button functionality
const button = document.getElementById('trackButton');
const logList = document.getElementById('log');

let lastClickTime = null;
const intervals = [];

button.addEventListener('click', () => {
  const now = new Date();
  const timeString = now.toLocaleString();
  let interval = null;

  if (lastClickTime) {
    interval = (now - lastClickTime) / 1000;
    intervals.push(interval);
  }

  lastClickTime = now;

  const logItem = document.createElement('li');
  logItem.textContent = `Time interval ${interval}`;
  
  logList.appendChild(logItem);
});

// Graph button
const graphButton = document.getElementById('graphButton');
graphButton.addEventListener('click', () => {
  const logItem = document.createElement('li');  
  logList.innerHTML = '';
  logItem.textContent = `Plotting the following intervals: ${intervals.join(', ')}`;
  plotGraph(intervals);
  logList.appendChild(logItem);
  if (intervals.length === 0) {
    logItem.textContent = 'No intervals to plot. Please track steps first.';
    logList.appendChild(logItem);
    return;
  }
  intervals.length = 0;
  lastClickTime = null;
  console.log('cleared intervals array:', intervals)
})

// Function to plot intervals
function plotGraph(array) {
  newDotsGroup.selectAll(".new-dot").remove();

  if (array.length === 0) return;

  const intervalX = d3.scaleLinear()
    .domain([0, array.length - 1])
    .range([margin.left, width - margin.right]);

  const intervalY = d3.scaleLinear()
    .domain(d3.extent(array)).nice()
    .range([height - margin.bottom, margin.top]);

  newDotsGroup
    .selectAll("circle")
    .data(array)
    .join("circle")
    .attr("class", "new-dot")
    .attr("cx", (_, i) => intervalX(i))
    .attr("cy", d => intervalY(d))
    .attr("r", 4)
    .attr("fill", "red")
    .attr("opacity", 0.8);
}