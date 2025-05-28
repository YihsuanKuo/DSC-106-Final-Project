const svg = d3.select("svg"),
        width = +svg.attr("width") || 1000,
        height = +svg.attr("height") || 500,
        margin = { top: 20, right: 30, bottom: 40, left: 50 };

const g = svg.append("g"); // Group for zooming

// load data o1-76-si.txt
d3.text("../data/o1-76-si.txt").then(rawText => {
    const data = rawText
    .trim()
    .split("\n")
    .map(line => {
        const [time, delta] = line.split("\t").map(parseFloat);
        return { time, delta };
    });

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
    }
});

//graph and click button
const button = document.getElementById('trackButton');
const logList = document.getElementById('log');

let lastClickTime = null;
const intervals = [];

button.addEventListener('click', () => {
  const now = new Date();
  const timeString = now.toLocaleString(); // You can also use now.toISOString()
  let interval = null;

  if (lastClickTime) {
      interval = (now - lastClickTime) / 1000; // in seconds
      intervals.push(interval);
  }

  lastClickTime = now;

  const logItem = document.createElement('li');
  logItem.textContent = `Time interval ${interval}`;
  
  logList.appendChild(logItem);
});

// Graph button that adds the intervals to a graph and clears the log
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
  //clear intervals array
  intervals.length = 0;
  lastClickTime = null;
  console.log('cleared intervals array:', intervals)
  // clear log list
})

// Function to plot the intervals on a graph
function plotGraph(array) {
  // Remove previously plotted red points
  g.selectAll(".new-dot").remove();

  // Create a temporary x-scale (index-based)
  const intervalX = d3.scaleLinear()
    .domain([0, array.length - 1])
    .range([margin.left, width - margin.right]);

  // Use same y-scale as original graph
  const intervalY = d3.scaleLinear()
    .domain(d3.extent(array)).nice()
    .range([height - margin.bottom, margin.top]);

  // Use existing Y scale (y) so they align with the current chart
  // If you want an independent Y scale for new points, replace 'y' with a separate one
  g.append("g")
    .attr("class", "new-points")
    .selectAll("circle")
    .data(array)
    .join("circle")
    .attr("class", "new-dot")
    .attr("cx", (_, i) => intervalX(i))
    .attr("cy", d => intervalY(d))  // use original y-scale for consistency
    .attr("r", 4)
    .attr("fill", "red")
    .attr("opacity", 0.8);
}
