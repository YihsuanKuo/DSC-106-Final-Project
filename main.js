const AVG_STEPS_PER_SEC = 1.5;
const WALK_DURATION_MS = 10000;
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

let steps = [], startTime = null, intervalId = null;

function reset() {
    steps = [];
    startTime = null;
    svg.selectAll("*").remove();
    statusEl.textContent = "";
}

function drawChart() {
    const intervalData = [];

    // Sort steps in case they aren't already sorted
    const sortedSteps = steps.slice().sort((a, b) => a - b);

    // Calculate intervals (in seconds) and assign a timestamp (average of two steps)
    for (let i = 1; i < sortedSteps.length; i++) {
        const interval = (sortedSteps[i] - sortedSteps[i - 1]) / 1000; // convert ms to sec
        const time = (sortedSteps[i] + sortedSteps[i - 1]) / 2000; // average time in seconds
        intervalData.push({ time, interval });
    }

    const margin = { top: 20, right: 30, bottom: 30, left: 40 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const svg = d3.select("svg");
    svg.selectAll("*").remove(); // Clear previous chart if any

    const x = d3.scaleLinear()
        .domain(d3.extent(intervalData, d => d.time))
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

    // Plot dots
    chart.selectAll("circle")
        .data(intervalData)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.interval))
        .attr("r", 4)
        .attr("fill", "#007acc");
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
    }, WALK_DURATION_MS);
}

bobEl.addEventListener("click", () => {
if (!startTime) return;
const now = performance.now();
if (now - startTime <= WALK_DURATION_MS) {
    const stepIndex = steps.length;
    steps.push(now - startTime);
    
    // Alternate direction: even = right, odd = left
    const direction = stepIndex % 2 === 0 ? 1 : -1;
    const distance = 10 * direction;

    bobEl.style.transform = `translateX(${distance}px)`;
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