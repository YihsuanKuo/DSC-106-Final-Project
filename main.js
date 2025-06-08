const AVG_STEPS_PER_SEC = 1.5;
const WALK_DURATION_MS = 10000;
let bobDots = [];
let currentZoomData = [];
let currentSlide = 0;
let isRecording = false;
const totalSlides = 4;

// Real data from CSV files - Fixed paths
const SAMPLE_PEOPLE = [
    { id: 1, name: "Control", disease: "Healthy Control", file: "data/control.csv", color: "#28a745" },
    { id: 2, name: "ALS", disease: "ALS", file: "data/als.csv", color: "#dc3545" },
    { id: 3, name: "Huntington's", disease: "Huntington's Disease", file: "data/hunt.csv", color: "#6f42c1" },
    { id: 4, name: "Parkinson's", disease: "Parkinson's Disease", file: "data/park.csv", color: "#fd7e14" }
];

const DISEASE_DESCRIPTIONS = {
    "Control": {
        title: "Healthy Control",
        description: "Healthy individuals typically show consistent stride intervals with minimal variation. Their walking pattern serves as our reference point for identifying abnormal gait patterns."
    },
    "ALS": {
        title: "Amyotrophic Lateral Sclerosis (ALS)",
        description: "ALS affects motor neurons, leading to muscle weakness and progressive difficulty with movement. Gait patterns often show irregular stride intervals and reduced walking speed as the disease progresses."
    },
    "Huntington's": {
        title: "Huntington's Disease",
        description: "Huntington's disease causes involuntary movements and affects coordination. Walking patterns typically show irregular, jerky movements with highly variable stride intervals and difficulty maintaining steady pace."
    },
    "Parkinson's": {
        title: "Parkinson's Disease",
        description: "Parkinson's disease affects movement control, often causing shuffling gait, reduced stride length, and freezing episodes. Stride intervals may show patterns of hesitation or sudden changes in timing."
    }
};

// DOM elements
let bobEl, startBtn, statusEl, svg, svg1, bobChartSvg, personSelect, replayBtn, legend, comparisonLabel, showLinesCheckbox;
let nextBtn1, nextBtn2, nextBtn3;

// Store the last recorded pattern
let lastBobPattern = null;

let timerInterval = null;

function updateTimer(timerElement, remainingTime) {
    const seconds = Math.ceil(remainingTime / 1000);
    timerElement.textContent = `${seconds}s`;
}

function startTimer(timerElement) {
    const startTime = Date.now();
    const duration = WALK_DURATION_MS;
    
    // Show and initialize the timer
    timerElement.style.display = 'block';
    updateTimer(timerElement, duration);
    
    // Clear any existing interval
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Update timer every 100ms
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        
        updateTimer(timerElement, remaining);
        
        // Stop the timer when time is up
        if (remaining <= 0) {
            clearInterval(timerInterval);
            timerElement.style.display = 'none';
        }
    }, 100);
}

// Initialize DOM elements after page loads
document.addEventListener('DOMContentLoaded', function() {
    bobEl = document.getElementById("bob");
    startBtn = document.getElementById("startBtn");
    statusEl = document.getElementById("status");
    svg = d3.select("#chart");
    svg1 = d3.select("#chart1");
    bobChartSvg = d3.select("#bobChartSvg");
    personSelect = document.getElementById("personSelect");
    replayBtn = document.getElementById("replayBtn");
    controlReplayBtn = document.getElementById("controlReplayBtn");
    legend = document.getElementById("legend");
    comparisonLabel = document.getElementById("comparisonLabel");
    showLinesCheckbox = document.getElementById("showLines");
    nextBtn1 = document.getElementById("nextBtn1");
    nextBtn2 = document.getElementById("nextBtn2");
    nextBtn3 = document.getElementById("nextBtn3");    
    initializeApp();
});

function initializeApp() {
    // Populate dropdown
    SAMPLE_PEOPLE.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = `${p.name} (${p.disease})`;
        personSelect.appendChild(option);
    });

    // const vsSelect = document.getElementById("vsSelect");
    // SAMPLE_PEOPLE.forEach(p => {
    //     const opt = document.createElement("option");
    //     opt.value = p.id;
    //     opt.textContent = `${p.name} (${p.disease})`;
    //     vsSelect.appendChild(opt);
    // });
    showControlPattern();
    setupEventListeners();
}
function showDiseaseDescription(personName, isPlayground = false) {
    const description = DISEASE_DESCRIPTIONS[personName];
    if (!description) return;

    const descriptionDiv = document.getElementById('diseaseDescription');
    const titleElement = document.getElementById('diseaseTitle');
    const textElement = document.getElementById('diseaseText');

    if (descriptionDiv && titleElement && textElement) {
        titleElement.textContent = description.title;
        textElement.textContent = description.description;
        descriptionDiv.style.display = 'block';
    }
}

function hideDiseaseDescription(isPlayground = false) {
    const descriptionDiv = document.getElementById('diseaseDescription');
    if (descriptionDiv) {
        descriptionDiv.style.display = 'none';
    }
}

function setupEventListeners() {
    // Bob click handler
    bobEl.addEventListener("click", (e) => {
        e.preventDefault();
        takeStep(bobEl);
        
        // Only record steps if we're actively recording
        if (isRecording && startTime) {
            const now = performance.now();
            const elapsed = now - startTime;
            if (elapsed <= WALK_DURATION_MS) {
                bobSteps.push(elapsed);
                console.log(`Step recorded at ${elapsed}ms`);
            }
        }
    });

    startBtn.addEventListener("click", startWalk);
    replayBtn.addEventListener("click", replaySteps);
    controlReplayBtn.addEventListener("click", async () => {
        console.log("Control replay clicked");

        const svgZoom = d3.select('#zoomChart1');
        const timer2 = document.getElementById("timer2");

        controlReplayBtn.disabled = true;
        controlReplayBtn.textContent = "⏳ Replaying...";

        if (timer2) startTimer(timer2); // 👈 start the timer

        await replayZoomSteps(currentZoomData, svgZoom, document.getElementById("controlCharacter"));

        controlReplayBtn.disabled = false;
        controlReplayBtn.textContent = "▶️ Play NOT Bob's Walk";

        if (timer2) timer2.style.display = 'none'; // 👈 hide after replay
    });
    diseaseReplayBtn.addEventListener("click", async () => {
        console.log("Control replay clicked");

        const svgZoom = d3.select('#zoomChart2');
        const timer3 = document.getElementById("timer3");

        diseaseReplayBtn.disabled = true;
        diseaseReplayBtn.textContent = "⏳ Replaying...";

        if (timer3) startTimer(timer3); // 👈 start the timer

        await replayZoomSteps(currentZoomData, svgZoom, document.getElementById("diseaseCharacter"));

        diseaseReplayBtn.disabled = false;
        diseaseReplayBtn.textContent = "▶️ Play Walk";

        if (timer3) timer3.style.display = 'none'; // 👈 hide after replay
    });
    if (nextBtn1) nextBtn1.addEventListener('click', () => goToSlide(1));
    if (nextBtn2) nextBtn2.addEventListener('click', () => goToSlide(2));
    if (nextBtn3) nextBtn3.addEventListener('click', () => goToSlide(3));

    personSelect.addEventListener("change", async () => {
        const selectedId = personSelect.value;
        if (selectedId) {
            currentComparison = SAMPLE_PEOPLE.find(p => p.id == selectedId);
            console.log('Selected comparison:', currentComparison);
            showDiseaseDescription(currentComparison.name); // Add this line
        } else {
            currentComparison = null;
            legend.style.display = "none";
            hideDiseaseDescription(); // Add this line
        }
        console.log('Person select changed:', selectedId);
        const selectPerson = SAMPLE_PEOPLE[selectedId - 1]; // First person is control
        console.log('Selected person:', selectPerson);
        const selectIntervals = await loadCSVData(selectPerson);
        // Pass controlIntervals as the data and controlPerson for color/details
        drawLongChart(selectIntervals, selectPerson, d3.select('#chart2'), d3.select('#zoomChart2'));
        drawZoomChart(selectIntervals, selectPerson, d3.select('#zoomChart2'), 0);
    });
    
    // Slide indicators
    document.querySelectorAll('.dot').forEach((dot, index) => {
        dot.addEventListener('click', () => goToSlide(index));
    });

    // Navigation buttons
    document.querySelectorAll('.prev-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            if (currentSlide > 0) {
                goToSlide(currentSlide - 1);
            }
        });
    });

    document.getElementById("vsSelect").addEventListener("change", drawVsCharts);
    document.getElementById("vsPlayBtn").addEventListener("click", playVsWalk);
}

function goToSlide(slideIndex) {
    if (slideIndex < 0 || slideIndex >= totalSlides) return;
    
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevButtons = document.querySelectorAll('.prev-btn');
    
    // Remove active class from current slide and dots
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    // Add active class to new slide and dots
    slides[slideIndex].classList.add('active');
    dots[slideIndex].classList.add('active');
    
    // Update current slide
    currentSlide = slideIndex;
    
    // Update previous buttons state
    prevButtons.forEach(btn => {
        btn.disabled = currentSlide === 0;
    });
    
    // Update next buttons visibility based on recording state
    if (currentSlide === 0) {
        nextBtn1.disabled = bobSteps.length === 0;
    }

    if (slideIndex === 2 && bobSteps.length >= 2) {
        drawVsCharts();
    }
}

let bobSteps = [], startTime = null, intervalId = null;
let loadedData = {}; // Cache for loaded CSV data

function reset() {
    bobSteps = [];
    startTime = null;
    isRecording = false;
    svg.selectAll("*").remove();
    bobChartSvg.selectAll("*").remove();
    statusEl.textContent = "";
    replayBtn.style.display = "none";
    // legend.style.display = "none";
    document.getElementById("bobChart").style.display = "none";
    bobEl.style.transform = "translateX(0px)";
    if (nextBtn1) nextBtn1.disabled = true;
    startBtn.disabled = false;
    startBtn.textContent = "🎬 Start Recording Bob";
    
    // Reset and hide timers
    const timer1 = document.getElementById('timer1');
    const timer4 = document.getElementById('timer4');
    if (timer1) timer1.style.display = 'none';
    if (timer4) timer4.style.display = 'none';
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Load CSV data with better error handling
async function loadCSVData(person) {
    if (loadedData[person.file]) {
        return loadedData[person.file];
    }
    
    try {
        console.log(`Loading data from: ${person.file}`);
        const data = await d3.csv(person.file, d => ({
            time: +d.time,
            interval: +d.interval
        }));
        console.log(`Loaded ${data.length} rows from ${person.file}`);
        loadedData[person.file] = data;
        return data;
    } catch (error) {
        console.error(`Error loading ${person.file}:`, error);
        statusEl.textContent = `❌ Error loading ${person.name} data. Check console for details.`;
        return [];
    }
}

// Fixed function to process Bob's steps - now calculates actual stride intervals
function processStepsToData(steps) {
    if (steps.length < 2) {
        // If we have less than 2 steps, we can't calculate intervals
        return [];
    }
    
    const stepData = [];
    
    // Calculate stride intervals as the difference between consecutive steps
    for (let i = 1; i < steps.length; i++) {
        const currentStepTime = steps[i] / 1000; // Convert to seconds
        const previousStepTime = steps[i - 1] / 1000; // Convert to seconds
        const strideInterval = currentStepTime - previousStepTime; // Time between steps
        
        // Use the current step time as the x-coordinate and stride interval as y-coordinate
        stepData.push({ 
            time: currentStepTime, 
            interval: strideInterval, 
            type: 'stride' 
        });
    }
    
    console.log('Processed Bob stride intervals:', stepData);
    return stepData;
}

async function showControlPattern() {
    const controlPerson = SAMPLE_PEOPLE[0]; // First person is control
    console.log('Showing control pattern for:', controlPerson);
    const controlIntervals = await loadCSVData(controlPerson);
    const controlChart = document.getElementById('controlChart');
    controlChart.style.display = 'block';
    if (nextBtn2) nextBtn2.style.display = 'inline-block';
    // Pass controlIntervals as the data and controlPerson for color/details
    drawLongChart(controlIntervals, controlPerson, svg1, d3.select('#zoomChart1'));
    drawZoomChart(controlIntervals, controlPerson, d3.select('#zoomChart1'), 0);
}

function drawLongChart(data, person, svg, zoomSvg, includeBrush = true, customBrushCallback = null) { // Removed 'bobData' and 'diseaseData', now accepts single 'data' and 'person'
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 60, left: 80 },
        width = 800 - margin.left - margin.right,
        height = 200 - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.time)]) // Use 'data' directly
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, Math.max(2, d3.max(data, d => d.interval))]) // Use 'data' directly
        .range([height, 0]);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X-axis
    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Time (seconds)");

    // Y-axis
    chart.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Stride Interval (s)");

    // Data points (now for the single 'data' array)
    chart.selectAll(".data-dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "data-dot")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.interval))
        .attr("r", 6)
        .attr("fill", person.color) // Use the color from the 'person' object
        .attr("opacity", 0.8)
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    // Brush remains the same, but it will operate on the single dataset
    if (includeBrush) {
        const brush = d3.brushX()
            .extent([[0, 0], [width, height]])
            .on("brush end", ({ selection }) => {
                if (!selection) return;
                const [x0, x1] = selection.map(x.invert);

                if (customBrushCallback) {
                    // If a custom callback is provided, use it
                    customBrushCallback(x0, x1); // Pass the brush range to the custom callback
                } else {
                    // Existing Slide 2 brush logic
                    drawZoomChart(
                        data.filter(d => d.time >= x0 && d.time <= x1), // Filter the single data array
                        person, // Pass the person object
                        zoomSvg,
                        x0
                    );
                    currentZoomData = data.filter(d => d.time >= x0 && d.time <= x1); // Store for replay
                }
            });

        chart.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, [0, 10].map(x)); // Initial brush range
    }
}

function drawZoomChart(intervals, person, svg, startTime = 0, comparisonData = null, comparisonPerson = null) {
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 60, left: 80 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // Filter to only include intervals within the 10-second window
    const endTime = startTime + 10;
    const zoomedData = intervals.filter(d => d.time >= startTime && d.time <= endTime); 
    currentZoomData = zoomedData.map(d => ({ 
        ...d, 
        time: d.time - startTime 
    }));
    console.log('Zoomed data:', currentZoomData);

    const x = d3.scaleLinear()
        .domain([startTime, endTime])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            0,
            Math.max(2, d3.max(zoomedData, d => d.interval) * 1.1)
        ])
        .range([height, 0]);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // x-axis with label
    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text('Time (seconds)');

    // y-axis with label
    chart.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Stride Interval (s)");

    // Data points
    chart.selectAll(".zoom-dot")
        .data(zoomedData)
        .enter()
        .append("circle")
        .attr("class", "zoom-dot")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.interval))
        .attr("r", 6)
        .attr("fill", person.color)
        .attr("opacity", 0.8)
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    if (comparisonData && comparisonPerson) {
        const zoomedComparisonData = comparisonData.filter(d => d.time >= startTime && d.time <= endTime);
        chart.selectAll(".comparison-zoom-dot")
            .data(zoomedComparisonData)
            .enter()
            .append("circle")
            .attr("class", "comparison-zoom-dot")
            .attr("cx", d => x(d.time))
            .attr("cy", d => y(d.interval))
            .attr("r", 6)
            .attr("fill", comparisonPerson.color)
            .attr("opacity", 0.8)
            .attr("stroke", "white")
            .attr("stroke-width", 2);
    }
}

function replayZoomSteps(zoomData, svgZoom, char) {
    const dots = svgZoom.selectAll(".zoom-dot");
    const controlChar = char;
    if (zoomData.length === 0 || dots.empty() || !controlChar) return;

    const sortedData = [...zoomData].sort((a, b) => a.time - b.time);
    const baseTime = sortedData[0].time;

    let stepRight = true;
    const stepDistance = 20;

    sortedData.forEach((step, i) => {
        const delay = (step.time - baseTime) * 1000;
        setTimeout(() => {
            // Animate the dot
            const dot = d3.select(dots.nodes()[i]);
            dot.transition()
                .duration(300)
                .attr("r", 12)
                .attr("fill", "#ff6b6b")
                .attr("opacity", 1)
                .transition()
                .duration(300)
                .attr("r", 6)
                .attr("fill", "#28a745")
                .attr("opacity", 0.8);

            takeStep(controlChar);

            // Reset to center after short delay
        }, delay);
    });

    const totalTime = (sortedData[sortedData.length - 1].time - baseTime) * 1000 + 500;
    return new Promise(resolve => setTimeout(resolve, totalTime));
}


// Updated function to draw Bob's chart on slide 1
function drawBobChart(stepData) {
    bobChartSvg.selectAll("*").remove();
    
    const margin = { top: 20, right: 40, bottom: 60, left: 80 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, width]);

    // Dynamic y-scale based on actual stride intervals
    const maxInterval = stepData.length > 0 ? d3.max(stepData, d => d.interval) : 2;
    const y = d3.scaleLinear()
        .domain([0, Math.max(2, maxInterval * 1.1)]) // Add 10% padding
        .range([height, 0]);

    const chart = bobChartSvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add grid lines
    const xGrid = d3.axisBottom(x).tickSize(-height).tickFormat("");
    const yGrid = d3.axisLeft(y).tickSize(-width).tickFormat("");

    chart.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(xGrid)
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.3);

    chart.append("g")
        .attr("class", "grid")
        .call(yGrid)
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.3);

    // Add axes
    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(8))
        .style("font-size", "14px")
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "600")
        .text("Time (seconds)");

    chart.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "14px")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "600")
        .text("Stride Interval (seconds)");

    // Plot Bob's stride intervals
    if (stepData.length > 0) {
        const dots = chart.selectAll(".bob-dot")
            .data(stepData)
            .enter()
            .append("circle")
            .attr("class", "bob-dot")
            .attr("cx", d => x(d.time))
            .attr("cy", d => y(d.interval))
            .attr("r", 8)
            .attr("fill", "#007acc")
            .attr("opacity", 0.8)
            .attr("stroke", "white")
            .attr("stroke-width", 3);
            
        // Store the dots selection for animation
        bobDots = dots;

        chart.append("path")
            .datum(stepData)
            .attr("fill", "none")
            .attr("stroke", "#007acc")
            .attr("stroke-width", 2)
            .attr("opacity", 0.5)
    } else {
        // Show message if no stride intervals could be calculated
        chart.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#666")
            .style("font-size", "16px")
            .text("Need at least 2 steps to calculate stride intervals");
    }
}

async function drawChart(showLines = false) {
    // Always target the bobChartSvg for Slide 1
    const svg = d3.select('#bobChartSvg');
    svg.selectAll("*").remove(); // Clear previous content

    const bobStepData = processStepsToData(bobSteps);

    if (bobStepData.length === 0) {
        console.warn('No data to display in chart');
        return;
    }

    // Get the SVG dimensions from the viewBox or actual size
    const svgElement = svg.node();
    const svgRect = svgElement.getBoundingClientRect();
    // Use default values if SVG dimensions are not readily available (e.g., during testing or if not rendered)
    const width = svgRect.width || 800;
    const height = svgRect.height || 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Update SVG viewBox if needed
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const x = d3.scaleLinear()
        .domain([0, 10]) // Fixed domain for 10 seconds of Bob's walk
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain([0, Math.max(2, d3.max(bobStepData, d => d.interval))]) // Domain based on Bob's interval data
        .range([innerHeight, 0]);

    const chart = svg.append("g")
        .attr("transform", `translate(<span class="math-inline">\{margin\.left\},</span>{margin.top})`);

    // Add grid lines
    const xGrid = d3.axisBottom(x).tickSize(-innerHeight).tickFormat("");
    const yGrid = d3.axisLeft(y).tickSize(-innerWidth).tickFormat("");

    chart.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xGrid)
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.3);

    chart.append("g")
        .attr("class", "grid")
        .call(yGrid)
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.3);

    // Add axes
    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickSize(8))
        .style("font-size", "12px")
        .append("text")
        .attr("x", innerWidth / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .text("Time (seconds)");

    chart.append("g")
        .call(d3.axisLeft(y).tickSize(8))
        .style("font-size", "12px")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -innerHeight / 2)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .text("Stride Interval (seconds)");

    // Plot Bob's stride intervals
    if (bobStepData.length > 0) {
        // Add connecting line for Bob's data if showLines is true
        if (showLines) {
            const bobLine = d3.line()
                .x(d => x(d.time))
                .y(d => y(d.interval))
                .curve(d3.curveMonotoneX);

            chart.append("path")
                .datum(bobStepData)
                .attr("class", "bob-line")
                .attr("fill", "none")
                .attr("stroke", "#007acc")
                .attr("stroke-width", 2)
                .attr("opacity", 0.5)
                .attr("d", bobLine);
        }

        bobDots = chart.selectAll(".bob-dot")
            .data(bobStepData)
            .enter()
            .append("circle")
            .attr("class", "bob-dot")
            .attr("cx", d => x(d.time))
            .attr("cy", d => y(d.interval))
            .attr("r", 6)
            .attr("fill", "#007acc")
            .attr("opacity", 0.8)
            .attr("stroke", "white")
            .attr("stroke-width", 2);
    }
}

function startWalk() {
    reset();
    isRecording = true;
    startTime = performance.now();
    startBtn.disabled = true;
    startBtn.textContent = "⏳ Recording...";
    statusEl.textContent = "🚶‍♂️ Make Bob walk for 10 seconds by clicking on him!";
    
    // Start the timer in the appropriate slide
    const timer = currentSlide === 0 ? 
        document.getElementById('timer1') : 
        document.getElementById('timer4');
    if (timer) {
        startTimer(timer);
    }
    
    console.log('Recording started at:', startTime);
    
    setTimeout(() => {
        isRecording = false;
        statusEl.textContent = `✅ Recording complete! Bob took ${bobSteps.length} steps.`;
        console.log('Recording ended. Total steps:', bobSteps.length);
        console.log('Step times:', bobSteps);
        
        if (bobSteps.length > 0) {
            // Process and show Bob's chart
            const bobStepData = processStepsToData(bobSteps);
            
            // If we're in slide 1, draw the bob chart
            if (document.getElementById("bobChart")) {
                drawBobChart(bobStepData);
                document.getElementById("bobChart").style.display = "block";
            }
            
            // Show replay button
            replayBtn.style.display = "inline-block";
            if (nextBtn1) nextBtn1.disabled = false;
            
            startBtn.textContent = "🎬 Record again";
            startBtn.disabled = false;
        } else {
            statusEl.textContent = "❌ No steps recorded! Try clicking on Bob during the recording period.";
            startBtn.disabled = false;
            startBtn.textContent = "🎬 Start Recording Bob";
        }
        // change next button text
        document.getElementById("nextBtn1").textContent = "See Normal Walk➡️";
    }, WALK_DURATION_MS);
}

let stepRight = true;

function takeStep(element) {
    const distance = stepRight ? 20 : -20;
    element.style.transform = `translateX(${distance}px)`;
    stepRight = !stepRight;

    element.style.transition = "transform 0.2s ease";
    setTimeout(() => {
        element.style.transition = "transform 0.3s ease";
    }, 200);
}

function replaySteps() {
    if (bobSteps.length === 0) return;
    
    replayBtn.disabled = true;
    replayBtn.textContent = "👣 Bob is replaying...";
    
    bobEl.style.transform = "translateX(0px)";
    stepRight = true;
    
    // Get all bob-dot elements from both charts
    const currentSlideChart = currentSlide === 0 ? 
        d3.select('#bobChartSvg').selectAll(".bob-dot") :
        d3.select('#playgroundChart').selectAll(".bob-dot");
    
    bobSteps.forEach((stepTime, i) => {
        setTimeout(() => {
            takeStep(bobEl);

            // Function to animate a dot
            const animateDot = (dot) => {
                if (dot.empty()) return;
                
                dot.transition()
                    .duration(300)
                    .attr("r", 12)
                    .attr("fill", "#ff6b6b")
                    .attr("opacity", 1)
                    .transition()
                    .duration(300)
                    .attr("r", 6)
                    .attr("fill", "#007acc")
                    .attr("opacity", 0.8);
            };

            // Animate the corresponding dot in the current slide's chart
            if (currentSlideChart && currentSlideChart.nodes() && currentSlideChart.nodes()[i]) {
                animateDot(d3.select(currentSlideChart.nodes()[i]));
            }
        }, stepTime);
    });
    
    const totalTime = bobSteps[bobSteps.length - 1] || 0;
    setTimeout(() => {
        replayBtn.disabled = false;
        replayBtn.textContent = "🔁 Replay Bob's Walk";
    }, totalTime + 1000);
}

async function drawVsCharts() {
    const vsSelect = document.getElementById("vsSelect");
    const selectedPersonId = vsSelect.value;

    if (!selectedPersonId || bobSteps.length === 0) {
        d3.select("#vsChart1").selectAll("*").remove();
        d3.select("#vsZoomChart1").selectAll("*").remove();
        hideDiseaseDescription();
        return;
    }

    const bobData = processStepsToData(bobSteps);
    const selectedPerson = SAMPLE_PEOPLE.find(p => p.id == selectedPersonId);
    // Ensure diseaseData is an array, even if loadCSVData returns null/undefined (re-added for robustness)
    const diseaseData = await loadCSVData(selectedPerson) || []; 

    // Define the custom brush callback for Slide 3
    const vsChartBrushCallback = (x0, x1) => {
        // Bob's data remains unfiltered – always pass the full bobData
        const filteredDiseaseData = diseaseData.filter(d => d.time >= x0 && d.time <= x1);

        const zoomSvg = d3.select('#vsZoomChart1');
        drawZoomChart(
            bobData, // Pass the FULL bobData here
            { name: "Bob", color: "#007acc" }, // Bob's person object
            zoomSvg,
            0, // startTime is no longer used for x-axis domain in drawZoomChart, but keep for consistency
            filteredDiseaseData, // The filtered disease data
            selectedPerson // The selected disease person object
        );
        // Store full bobData and filtered diseaseData for replay on vs charts
        currentZoomData = [bobData, filteredDiseaseData];
    };

    // Call drawLongChart for the full walking pattern with the custom brush callback
    drawLongChart(
        diseaseData, // Data for the long chart itself (disease data)
        selectedPerson, // Person for the long chart itself
        d3.select("#vsChart1"),
        true, // Include brush
        vsChartBrushCallback // Pass the custom callback
    );

    // Initial drawZoomChart for the full 0-10s range (before brush interaction)
    drawZoomChart(
        bobData, // Full bobData
        { name: "Bob", color: "#007acc" },
        d3.select("#vsZoomChart1"),
        0, // startTime
        diseaseData, // Full diseaseData
        selectedPerson
    );
    // Initialize currentZoomData with the full range for initial replay
    currentZoomData = [bobData, diseaseData];


    showDiseaseDescription(selectedPerson.name);
}
// New function for comparison long chart
function drawComparisonLongChart(bobData, bobPerson, diseaseData, diseasePerson, svg) {
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 60, left: 80 },
        width = 800 - margin.left - margin.right,
        height = 200 - margin.top - margin.bottom;

    const allData = [...bobData, ...diseaseData];

    const x = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d.time)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, Math.max(2, d3.max(allData, d => d.interval))])
        .range([height, 0]);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X-axis
    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Time (seconds)");

    // Y-axis
    chart.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Stride Interval (s)");

    // Bob dots
    chart.selectAll(".bob-dot")
        .data(bobData)
        .enter()
        .append("circle")
        .attr("class", "bob-dot")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.interval))
        .attr("r", 6)
        .attr("fill", "#007acc") // Bob's color
        .attr("opacity", 0.8)
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    // Disease dots
    chart.selectAll(".disease-dot")
        .data(diseaseData)
        .enter()
        .append("circle")
        .attr("class", "disease-dot")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.interval))
        .attr("r", 6)
        .attr("fill", diseasePerson.color) // Disease color
        .attr("opacity", 0.8)
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    // Brush (similar to before, now filtering both datasets for the zoom chart)
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("brush end", ({ selection }) => {
            if (!selection) return;
            const [x0, x1] = selection.map(x.invert);
            const zoomSvg = d3.select("#vsZoomChart1"); // This is specific to the comparison chart
            drawZoomComparisonChart(
                bobData.filter(d => d.time >= x0 && d.time <= x1),
                diseaseData.filter(d => d.time >= x0 && d.time <= x1),
                zoomSvg,
                x0
            );
            currentZoomData = [
                bobData.filter(d => d.time >= x0 && d.time <= x1),
                diseaseData.filter(d => d.time >= x0 && d.time <= x1)
            ];
        });

    chart.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, [0, 10].map(x));  // Initial brush range
}

function drawZoomComparisonChart(bob, disease, svg, startTime = 0) {
    svg.selectAll("*").remove();
    const margin = { top: 20, right: 40, bottom: 60, left: 80 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const endTime = startTime + 10;
    const bobZoom = bob.filter(d => d.time >= startTime && d.time <= endTime);
    const diseaseZoom = disease.filter(d => d.time >= startTime && d.time <= endTime);
    console.log('diseaseZoom:', diseaseZoom);

    const x = d3.scaleLinear().domain([startTime, endTime]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 2]).range([height, 0]);

    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    chart.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    chart.append("g").call(d3.axisLeft(y));

    chart.selectAll(".bob-dot")
        .data(bobZoom)
        .enter().append("circle")
        .attr("class", "bob-dot")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.interval))
        .attr("r", 6)
        .attr("fill", "#007acc")
        .attr("opacity", 0.8);

    chart.selectAll(".disease-dot")
        .data(diseaseZoom)
        .enter().append("circle")
        .attr("class", "disease-dot")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.interval))
        .attr("r", 6)
        .attr("fill", "#dc3545")
        .attr("opacity", 0.8);
}

function playVsWalk() {
    const [bobZoom, diseaseZoom] = currentZoomData || [];
    if (!bobZoom || !diseaseZoom) return;

    const bobChar = document.getElementById("bobVsEmoji");
    const disChar = document.getElementById("diseaseVsEmoji");
    const timer3 = document.getElementById("timer3");

    stepRight = true;
    bobChar.style.transform = "translateX(0px)";
    disChar.style.transform = "translateX(0px)";
    if (timer3) startTimer(timer3);

    const allSteps = [...bobZoom, ...diseaseZoom];
    const maxTime = d3.max(allSteps, d => d.time);
    const baseTime = d3.min(allSteps, d => d.time);

    bobZoom.forEach((step, i) => {
        const delay = (step.time - baseTime) * 1000;
        setTimeout(() => takeStep(bobChar), delay);
    });

    diseaseZoom.forEach((step, i) => {
        const delay = (step.time - baseTime) * 1000;
        setTimeout(() => takeStep(disChar), delay);
    });

    setTimeout(() => {
        if (timer3) timer3.style.display = "none";
    }, (maxTime - baseTime) * 1000 + 1000);
}