const AVG_STEPS_PER_SEC = 1.5;
const WALK_DURATION_MS = 10000;
let bobDots = [];
let currentSlide = 0;
let isRecording = false;
const totalSlides = 3;

// Real data from CSV files - Fixed paths
const SAMPLE_PEOPLE = [
    { id: 1, name: "Control", disease: "Healthy Control", file: "new_data/control/control1.csv", color: "#28a745" },
    { id: 2, name: "ALS", disease: "ALS", file: "new_data/als/als1.csv", color: "#dc3545" },
    { id: 3, name: "Huntington's", disease: "Huntington's Disease", file: "new_data/hunt/hunt1.csv", color: "#6f42c1" },
    { id: 4, name: "Parkinson's", disease: "Parkinson's Disease", file: "new_data/park/park1.csv", color: "#fd7e14" }
];

// DOM elements
let bobEl, startBtn, statusEl, svg, svg1, bobChartSvg, personSelect, replayBtn, legend, comparisonLabel, showLinesCheckbox;
let nextBtn1, nextBtn2, showControlBtn;

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
    nextBtn1.addEventListener("click", () => goToSlide(1));
    nextBtn2.addEventListener("click", () => goToSlide(2));
    showControlBtn.addEventListener("click", showControlPattern);

    personSelect.addEventListener("change", async () => {
        const selectedId = personSelect.value;
        if (selectedId) {
            currentComparison = SAMPLE_PEOPLE.find(p => p.id == selectedId);
            console.log('Selected comparison:', currentComparison);
        } else {
            currentComparison = null;
            legend.style.display = "none";
        }
        
        if (bobSteps.length > 0) {
            await drawChart(currentComparison);
        }
    });

    showLinesCheckbox.addEventListener("change", async () => {
        if (bobSteps.length > 0) {
            await drawChart(currentComparison);
        }
    });

    // Slide indicators
    document.querySelectorAll('.dot').forEach((dot, index) => {
        dot.addEventListener('click', () => goToSlide(index));
    });
}

function goToSlide(slideIndex) {
    if (slideIndex < 0 || slideIndex >= totalSlides) return;
    
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    // Update slides
    slides[currentSlide].classList.remove('active');
    slides[currentSlide].classList.add('prev');
    
    setTimeout(() => {
        slides[currentSlide].classList.remove('prev');
        slides[slideIndex].classList.add('active');
        
        // Update dots
        dots[currentSlide].classList.remove('active');
        dots[slideIndex].classList.add('active');
        
        currentSlide = slideIndex;
    }, 100);
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
    nextBtn1.disabled = true;
    startBtn.disabled = false;
    startBtn.textContent = "🎬 Start Recording Bob";
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
        nextBtn2.style.display = 'inline-block';
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
        bobDots = chart.selectAll(".bob-dot")
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

        // Add connecting line for Bob's stride intervals
        const line = d3.line()
            .x(d => x(d.time))
            .y(d => y(d.interval))
            .curve(d3.curveMonotoneX);

        chart.append("path")
            .datum(stepData)
            .attr("fill", "none")
            .attr("stroke", "#007acc")
            .attr("stroke-width", 2)
            .attr("opacity", 0.5)
            .attr("d", line);
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

async function drawChart(comparisonPerson = null) {
    svg.selectAll("*").remove();

    const bobStepData = processStepsToData(bobSteps);
    let comparisonIntervals = [];
    
    if (comparisonPerson) {
        try {
            const csvData = await loadCSVData(comparisonPerson);
            comparisonIntervals = processCSVToIntervals(csvData);
            console.log(`Processed ${comparisonIntervals.length} intervals for ${comparisonPerson.name}`);
        } catch (error) {
            console.error('Error loading comparison data:', error);
        }
    }

    const allData = [...bobStepData, ...comparisonIntervals];
    if (allData.length === 0) {
        console.warn('No data to display in chart');
        return;
    }

    const margin = { top: 40, right: 60, bottom: 80, left: 100 },
        width = 1200 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, Math.max(2, d3.max(allData, d => d.interval))])
        .range([height, 0]);

    const chart = svg.append("g")
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
        .attr("y", 50)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "600")
        .text("Time (seconds)");

    chart.append("g")
        .call(d3.axisLeft(y).tickSize(8))
        .style("font-size", "14px")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -height / 2)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "600")
        .text("Stride Interval (seconds)");

    // Plot Bob's stride intervals
    if (bobStepData.length > 0) {
        chart.selectAll(".bob-dot")
            .data(bobStepData)
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

        // Add connecting line for Bob's data
        const bobLine = d3.line()
            .x(d => x(d.time))
            .y(d => y(d.interval))
            .curve(d3.curveMonotoneX);

        chart.append("path")
            .datum(bobStepData)
            .attr("fill", "none")
            .attr("stroke", "#007acc")
            .attr("stroke-width", 2)
            .attr("opacity", 0.5)
            .attr("d", bobLine);
    }

    // Plot comparison data
    if (comparisonIntervals.length > 0) {
        chart.selectAll(".comparison-dot")
            .data(comparisonIntervals)
            .enter()
            .append("circle")
            .attr("class", "comparison-dot")
            .attr("cx", d => x(d.time))
            .attr("cy", d => y(d.interval))
            .attr("r", 6)
            .attr("fill", comparisonPerson.color)
            .attr("opacity", 0.7)
            .attr("stroke", "white")
            .attr("stroke-width", 2);

        if (showLinesCheckbox && showLinesCheckbox.checked) {
            const line = d3.line()
                .x(d => x(d.time))
                .y(d => y(d.interval))
                .curve(d3.curveMonotoneX);

            chart.append("path")
                .datum(comparisonIntervals)
                .attr("fill", "none")
                .attr("stroke", comparisonPerson.color)
                .attr("stroke-width", 2)
                .attr("opacity", 0.3)
                .attr("stroke-dasharray", "3,3")
                .attr("d", line);
        }

        legend.style.display = "flex";
        comparisonLabel.textContent = `${comparisonPerson.name} (${comparisonPerson.disease})`;
        
        const legendDot = document.querySelector('.legend-item:last-child .legend-dot');
        if (legendDot) {
            legendDot.style.backgroundColor = comparisonPerson.color;
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
    
    console.log('Recording started at:', startTime);
    
    setTimeout(() => {
        isRecording = false;
        statusEl.textContent = `✅ Recording complete! Bob took ${bobSteps.length} steps.`;
        console.log('Recording ended. Total steps:', bobSteps.length);
        console.log('Step times:', bobSteps);
        
        if (bobSteps.length > 0) {
            // Process and show Bob's chart on slide 1
            const bobStepData = processStepsToData(bobSteps);
            drawBobChart(bobStepData);
            document.getElementById("bobChart").style.display = "block";
            
            // Also draw comparison chart if needed
            drawChart(currentComparison);
            replayBtn.style.display = "inline-block";
            nextBtn1.disabled = false;
            
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
    
    bobSteps.forEach((stepTime, i) => {
        setTimeout(() => {
            takeStep();
            
            if (bobDots.nodes && bobDots.nodes()[i]) {
                const dot = d3.select(bobDots.nodes()[i]);
                dot.transition()
                    .duration(300)
                    .attr("r", 12)
                    .attr("fill", "#ff6b6b");
                
                setTimeout(() => {
                    dot.transition()
                        .duration(300)
                        .attr("r", 8)
                        .attr("fill", "#007acc");
                }, 600);
            }
        }, stepTime);
    });
    
    const totalTime = bobSteps[bobSteps.length - 1] || 0;
    setTimeout(() => {
        replayBtn.disabled = false;
        replayBtn.textContent = "🔁 Replay Bob's Walk";
    }, totalTime + 1000);
}