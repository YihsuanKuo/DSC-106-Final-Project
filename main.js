const AVG_STEPS_PER_SEC = 1.5;
const WALK_DURATION_MS = 10000;
let bobDots = [];
let currentSlide = 0;
let isRecording = false;
const totalSlides = 4;

// Real data from CSV files - Fixed paths
const SAMPLE_PEOPLE = [
    { id: 1, name: "Control", disease: "Healthy Control", file: "new_data/control/control1.csv", color: "#28a745" },
    { id: 2, name: "ALS", disease: "ALS", file: "new_data/als/als1.csv", color: "#dc3545" },
    { id: 3, name: "Huntington's", disease: "Huntington's Disease", file: "new_data/hunt/hunt1.csv", color: "#6f42c1" },
    { id: 4, name: "Parkinson's", disease: "Parkinson's Disease", file: "new_data/park/park1.csv", color: "#fd7e14" }
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
let nextBtn1, nextBtn2, nextBtn3, showControlBtn;

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
    legend = document.getElementById("legend");
    comparisonLabel = document.getElementById("comparisonLabel");
    showLinesCheckbox = document.getElementById("showLines");
    nextBtn1 = document.getElementById("nextBtn1");
    nextBtn2 = document.getElementById("nextBtn2");
    nextBtn3 = document.getElementById("nextBtn3");
    showControlBtn = document.getElementById("showControlBtn");
    
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
    
    setupEventListeners();
    console.log('Gait analyzer initialized');
    initializePlayground();
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
        takeStep();
        
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
    if (nextBtn1) nextBtn1.addEventListener('click', () => goToSlide(1));
    if (nextBtn2) nextBtn2.addEventListener('click', () => goToSlide(2));
    if (nextBtn3) nextBtn3.addEventListener('click', () => goToSlide(3));
    if (showControlBtn) showControlBtn.addEventListener('click', showControlPattern);

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
        
        if (bobSteps.length > 0) {
            const showLinesChecked = showLinesCheckbox ? showLinesCheckbox.checked : false;
            await drawChart(currentComparison, null, showLinesChecked);
        }
    });

    showLinesCheckbox.addEventListener("change", async () => {
        if (bobSteps.length > 0) {
            await drawChart(currentComparison, null, showLinesCheckbox.checked);
        }
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
}

let bobSteps = [], startTime = null, intervalId = null;
let currentComparison = null;
let loadedData = {}; // Cache for loaded CSV data

function reset() {
    bobSteps = [];
    startTime = null;
    isRecording = false;
    svg.selectAll("*").remove();
    bobChartSvg.selectAll("*").remove();
    statusEl.textContent = "";
    replayBtn.style.display = "none";
    legend.style.display = "none";
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
        const data = await d3.csv(person.file);
        console.log(`Loaded ${data.length} rows from ${person.file}`);
        loadedData[person.file] = data;
        return data;
    } catch (error) {
        console.error(`Error loading ${person.file}:`, error);
        statusEl.textContent = `❌ Error loading ${person.name} data. Check console for details.`;
        return [];
    }
}

function processCSVToIntervals(csvData) {
    if (!csvData || csvData.length === 0) {
        console.warn('No CSV data to process');
        return [];
    }
    
    const intervals = [];
    let minTime = Infinity;
    
    csvData.forEach(row => {
        const elapsedTime = +row['Elapsed Time (sec)'];
        if (!isNaN(elapsedTime) && elapsedTime !== null) {
            minTime = Math.min(minTime, elapsedTime);
        }
    });
    
    if (minTime === Infinity) minTime = 0;
    
    csvData.forEach(row => {
        const elapsedTime = +row['Elapsed Time (sec)'];
        const leftStride = +row['Left Stride Interval (sec)'];
        const rightStride = +row['Right Stride Interval (sec)'];
        
        const normalizedTime = elapsedTime - minTime;
        
        if (normalizedTime <= 10 && normalizedTime >= 0 && 
            !isNaN(leftStride) && !isNaN(rightStride) && 
            leftStride > 0 && rightStride > 0) {
            const avgStride = (leftStride + rightStride) / 2;
            intervals.push({ time: normalizedTime, interval: avgStride, type: 'avg' });
        }
    });
    
    return intervals.sort((a, b) => a.time - b.time);
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
    try {
        const csvData = await loadCSVData(controlPerson);
        const controlIntervals = processCSVToIntervals(csvData);
        
        const controlChart = document.getElementById('controlChart');
        controlChart.style.display = 'block';
        
        drawControlChart(controlIntervals, controlPerson);
        showControlBtn.style.display = 'none';
        if (nextBtn2) nextBtn2.style.display = 'inline-block';
    } catch (error) {
        console.error('Error loading control data:', error);
    }
}

function drawControlChart(intervals, person) {
    svg1.selectAll("*").remove();
    
    const margin = { top: 20, right: 40, bottom: 60, left: 80 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, Math.max(2, d3.max(intervals, d => d.interval))])
        .range([height, 0]);

    const chart = svg1.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add axes
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

    chart.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Stride Interval (seconds)");

    // Plot control data
    chart.selectAll(".control-dot")
        .data(intervals)
        .enter()
        .append("circle")
        .attr("class", "control-dot")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.interval))
        .attr("r", 6)
        .attr("fill", person.color)
        .attr("opacity", 0.8)
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    // Add connecting line
    const line = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.interval))
        .curve(d3.curveMonotoneX);

    chart.append("path")
        .datum(intervals)
        .attr("fill", "none")
        .attr("stroke", person.color)
        .attr("stroke-width", 3)
        .attr("opacity", 0.7)
        .attr("d", line);
    }

// Updated function to draw Bob's chart on slide 1
function drawBobChart(stepData) {
    bobChartSvg.selectAll("*").remove();
    
    const margin = { top: 20, right: 40, bottom: 60, left: 80 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const replayLine = d3.select("#bobChartSvg")
        .append("line")
        .attr("class", "replay-line")
        .attr("y1", 0)
        .attr("y2", height) // use your chart height here
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("opacity", 0);

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

async function drawChart(comparisonData = null, targetSvg = null, showLines = false) {
    // If no target SVG is specified, use the appropriate one based on current slide
    if (!targetSvg) {
        targetSvg = currentSlide === 3 ? d3.select('#playgroundChart') : d3.select('#chart');
    }
    const svg = targetSvg;
    svg.selectAll("*").remove();

    const bobStepData = processStepsToData(bobSteps);
    let comparisonIntervals = [];
    
    if (comparisonData) {
        try {
            const csvData = await loadCSVData(comparisonData);
            comparisonIntervals = processCSVToIntervals(csvData);
            console.log(`Processed ${comparisonIntervals.length} intervals for ${comparisonData.name}`);
        } catch (error) {
            console.error('Error loading comparison data:', error);
        }
    }

    const allData = [...bobStepData, ...comparisonIntervals];
    if (allData.length === 0) {
        console.warn('No data to display in chart');
        return;
    }

    // Get the SVG dimensions from the viewBox or actual size
    const svgElement = svg.node();
    const svgRect = svgElement.getBoundingClientRect();
    const width = svgRect.width || 800;
    const height = svgRect.height || 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Update SVG viewBox if needed
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain([0, Math.max(2, d3.max(allData, d => d.interval))])
        .range([innerHeight, 0]);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

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

    // Plot comparison data
    if (comparisonIntervals.length > 0) {
        // Add connecting line for comparison data if showLines is true
        if (showLines) {
            const comparisonLine = d3.line()
                .x(d => x(d.time))
                .y(d => y(d.interval))
                .curve(d3.curveMonotoneX);

            chart.append("path")
                .datum(comparisonIntervals)
                .attr("class", "comparison-line")
                .attr("fill", "none")
                .attr("stroke", comparisonData.color)
                .attr("stroke-width", 2)
                .attr("opacity", 0.3)
                .attr("stroke-dasharray", "3,3")
                .attr("d", comparisonLine);
        }

        chart.selectAll(".comparison-dot")
            .data(comparisonIntervals)
            .enter()
            .append("circle")
            .attr("class", "comparison-dot")
            .attr("cx", d => x(d.time))
            .attr("cy", d => y(d.interval))
            .attr("r", 5)
            .attr("fill", comparisonData.color)
            .attr("opacity", 0.7)
            .attr("stroke", "white")
            .attr("stroke-width", 2);

        if (legend && comparisonLabel) {
            legend.style.display = "flex";
            comparisonLabel.textContent = `${comparisonData.name} (${comparisonData.disease})`;
            
            const legendDot = document.querySelector('.legend-item:last-child .legend-dot');
            if (legendDot) {
                legendDot.style.backgroundColor = comparisonData.color;
            }
        }
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
            
            // Draw the main chart (either in slide 1 or playground)
            drawChart(currentComparison, svg);
            
            // Show replay button
            replayBtn.style.display = "inline-block";
            if (nextBtn1) nextBtn1.disabled = false;
            
            // Update legend if needed
            if (currentComparison) {
                legend.style.display = "flex";
            }
        } else {
            statusEl.textContent = "❌ No steps recorded! Try clicking on Bob during the recording period.";
            startBtn.disabled = false;
            startBtn.textContent = "🎬 Start Recording Bob";
        }
    }, WALK_DURATION_MS);
}

let stepRight = true;

function takeStep() {
    const distance = stepRight ? 20 : -20;
    bobEl.style.transform = `translateX(${distance}px)`;
    stepRight = !stepRight;
    
    bobEl.style.transition = "transform 0.2s ease";
    setTimeout(() => {
        bobEl.style.transition = "transform 0.3s ease";
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
            takeStep();

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

// Playground functionality
function initializePlayground() {
    const playgroundStartBtn = document.getElementById('playgroundStartBtn');
    const playgroundReplayBtn = document.getElementById('playgroundReplayBtn');
    const compareSelect = document.getElementById('compareSelect');
    const playgroundBob = document.getElementById('playgroundBob');
    const playgroundChartContainer = document.querySelector('#slide4 .chart-container');
    const playgroundChart = d3.select('#playgroundChart');
    const playgroundShowLines = document.getElementById('playgroundShowLines');
    
    // Make sure the chart container is visible
    if (playgroundChartContainer) {
        playgroundChartContainer.style.display = 'block';
    }
    
    // Initialize the chart with empty state or existing data
    if (!playgroundChart.empty()) {
        playgroundChart.selectAll("*").remove();
        const svgRect = playgroundChart.node().getBoundingClientRect();
        const width = svgRect.width || 800;
        const height = svgRect.height || 400;
        
        if (bobSteps.length > 0) {
            // If we have existing data, show it
            svg = playgroundChart;
            drawChart(null, svg, playgroundShowLines.checked);
        } else {
            // Show placeholder message
            playgroundChart
                .attr("viewBox", `0 0 ${width} ${height}`)
                .append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#666")
                .style("font-size", "14px")
                .text("Record steps to see the pattern");
        }
    }
    
    // Reset Bob's position
    if (playgroundBob) {
        playgroundBob.style.transform = 'translateX(0px)';
        playgroundBob.style.transition = 'transform 0.3s ease';
        
        // Add click handler for Bob's movement
        playgroundBob.addEventListener("click", (e) => {
            e.preventDefault();
            if (!isRecording) return; // Only allow movement during recording
            
            takeStep();
            
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
    }

    // Start recording button
    if (playgroundStartBtn) {
        playgroundStartBtn.addEventListener('click', () => {
            // Update DOM references to use playground elements
            bobEl = document.getElementById('playgroundBob');
            statusEl = document.getElementById('playgroundStatus');
            startBtn = document.getElementById('playgroundStartBtn');
            replayBtn = document.getElementById('playgroundReplayBtn');
            svg = playgroundChart;
            
            // Reset any previous state
            reset();
            bobEl.style.transform = 'translateX(0px)';
            
            // Use the same startWalk function from slide 1
            startWalk();
            
            // Show replay button
            if (playgroundReplayBtn) {
                playgroundReplayBtn.style.display = 'inline-block';
            }
        });
    }

    // Replay button
    if (playgroundReplayBtn) {
        playgroundReplayBtn.addEventListener('click', () => {
            // Update DOM references to use playground elements
            bobEl = document.getElementById('playgroundBob');
            replayBtn = document.getElementById('playgroundReplayBtn');
            
            // Reset position before replay
            bobEl.style.transform = 'translateX(0px)';
            
            // Use the same replaySteps function from slide 1
            replaySteps();
        });
    }

    // Show lines checkbox
    if (playgroundShowLines) {
        playgroundShowLines.addEventListener('change', () => {
            if (bobSteps.length > 0) {
                svg = playgroundChart;
                drawChart(currentComparison, svg, playgroundShowLines.checked);
            }
        });
    }

    // Comparison select
    if (compareSelect) {
        // Initialize comparison options
        SAMPLE_PEOPLE.forEach(p => {
            const option = document.createElement("option");
            option.value = p.id;
            option.textContent = `${p.name} (${p.disease})`;
            compareSelect.appendChild(option);
        });

        // Add change handler
        compareSelect.addEventListener('change', async () => {
            const selectedId = compareSelect.value;
            if (selectedId) {
                currentComparison = SAMPLE_PEOPLE.find(p => p.id == selectedId);
                console.log('Selected comparison:', currentComparison);
                showDiseaseDescription(currentComparison.name, true); // Add this line
            } else {
                currentComparison = null;
                legend.style.display = "none";
                hideDiseaseDescription(true); // Add this line
            }
            
            // Use the same chart drawing function from slide 3
            if (bobSteps.length > 0) {
                svg = playgroundChart;
                await drawChart(currentComparison, svg, playgroundShowLines.checked);
            }
        });
    }
}