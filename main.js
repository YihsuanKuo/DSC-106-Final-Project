const AVG_STEPS_PER_SEC = 1.5;
const WALK_DURATION_MS = 10000;
let bobDots = [];
const SAMPLE_PEOPLE = [
    { id: 1, name: "Alice", disease: "None", avgStepsPerSec: 1.7 },
    { id: 2, name: "Ben", disease: "Diabetes", avgStepsPerSec: 1.2 },
    { id: 3, name: "Cara", disease: "COPD", avgStepsPerSec: 0.9 },
    { id: 4, name: "Dan", disease: "Parkinson's", avgStepsPerSec: 0.6 },
];

const bobEl = document.getElementById("bob");
const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");
const svg = d3.select("#chart");
const personSelect = document.getElementById("personSelect");

SAMPLE_PEOPLE.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.name} (${p.disease})`;
    personSelect.appendChild(option);
});

let bobSteps = [], startTime = null, intervalId = null;

function reset() {
    bobSteps = [];
    startTime = null;
    svg.selectAll("*").remove();
    statusEl.textContent = "";
}

function drawChart() {
    const intervalData = [];

    const sortedSteps = bobSteps.slice().sort((a, b) => a - b);

    for (let i = 1; i < sortedSteps.length; i++) {
        const interval = (sortedSteps[i] - sortedSteps[i - 1]) / 1000; // interval in seconds
        const time = (sortedSteps[i] + sortedSteps[i - 1]) / 2000; // midpoint in seconds
        intervalData.push({ time, interval });
    }

    const margin = { top: 20, right: 30, bottom: 50, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const svg = d3.select("svg");
    svg.selectAll("*").remove(); // Clear previous chart

    const x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(intervalData, d => d.interval)])
        .range([height, 0]);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    chart.append("g")
        .call(d3.axisLeft(y));

    // X-axis label
    chart.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .text("Time (seconds)")
        .style("font-size", "14px");

    // Y-axis label
    chart.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90)`)
        .attr("x", -height / 2)
        .attr("y", -45)
        .text("Step Interval (seconds)")
        .style("font-size", "14px");

    // Plot intervals as dots
    bobDots = chart.selectAll(".bob-dot")
        .data(intervalData)
        .enter()
        .append("circle")
        .attr("class", "bob-dot")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.interval))
        .attr("r", 4)
        .attr("fill", "#007acc")
        .attr("opacity", 0.7);
}

function startWalk() {
    reset();
    startTime = performance.now();
    statusEl.textContent = "Make Bob walk for 10 seconds…";
    setTimeout(() => {
        clearInterval(intervalId);
        statusEl.textContent = "Here are how long each step took in those 10 seconds.";
        const selected = SAMPLE_PEOPLE.find(p => p.id == personSelect.value);
        drawChart(selected);
        // change nextSlideBtn to have different text
        document.getElementById("nextSlideBtn").textContent = "Next Slide ➡️";
        document.getElementById("replayBtn").style.display = "inline-block";
    }, WALK_DURATION_MS);
}

let stepRight = true;

// makes bob take step (translate 10 px right or left)
function takeStep() {
    const distance = 10 * (stepRight ? 1 : -1);
    bobEl.style.transform = `translateX(${distance}px)`;
    stepRight = !stepRight;
}

bobEl.addEventListener("click", () => {
    takeStep();
    if (startTime){
        const now = performance.now();
        if (now - startTime <= WALK_DURATION_MS) {
            bobSteps.push(now - startTime);
        }
    }
});

startBtn.addEventListener("click", startWalk);
personSelect.addEventListener("change", () => {
    if (startTime && performance.now() - startTime > WALK_DURATION_MS) {
    svg.selectAll("*").remove();
    const selected = SAMPLE_PEOPLE.find(p => p.id == personSelect.value);
    drawChart(selected);
    }
});

document.getElementById("nextSlideBtn").addEventListener("click", () => {
    // Option 1: Scroll smoothly
    document.getElementById("slide2").style.display = "block";
    document.getElementById("slide2").scrollIntoView({ behavior: "smooth" });

    // // Option 2 (Optional): Hide slide1 and show slide2 instead
    // document.getElementById("slide1").style.display = "none";
});

// replay bobsteps
function replaySteps() {
  const bobEl = document.getElementById("bob");
  bobSteps.forEach((t, i) => {
    setTimeout(() => {
      takeStep();

      // Highlight the i-th dot directly by index
      const dot = d3.select(bobDots.nodes()[i]);
      dot.transition()
         .duration(200)
         .attr("fill", "orange")
         .attr("r", 6);

        setTimeout(() => {
            dot.transition()
                .duration(200)
                .attr("fill", "#007acc")
                .attr("r", 4);
        }, 500);
    }, t);
  });

}

document.getElementById("replayBtn").addEventListener("click", () => {
    replaySteps();
    replayBtn.disabled = true;
    replayBtn.textContent = "👣 Bob is currently replaying...";
    
    const totalReplayTime = bobSteps[bobSteps.length - 1] || 0;
    setTimeout(() => {
    replayBtn.disabled = false;
    replayBtn.textContent = "🔁 Replay Bob's Walk";
    }, totalReplayTime + 500); // Add slight buffer
});
