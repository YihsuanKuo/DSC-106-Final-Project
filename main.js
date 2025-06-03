const AVG_STEPS_PER_SEC = 1.5;
const WALK_DURATION_MS = 10000;
let bobDots = [];

// Real data from CSV files - Fixed paths
const SAMPLE_PEOPLE = [
    { id: 1, name: "Control", disease: "Healthy Control", file: "new_data/control/control1.csv", color: "#28a745" },
    { id: 2, name: "ALS", disease: "ALS", file: "new_data/als/als1.csv", color: "#dc3545" },
    { id: 3, name: "Huntington's", disease: "Huntington's Disease", file: "new_data/hunt/hunt1.csv", color: "#6f42c1" },
    { id: 4, name: "Parkinson's", disease: "Parkinson's Disease", file: "new_data/park/park1.csv", color: "#fd7e14" }
];

// DOM elements - wait for DOM to be ready
let bobEl, startBtn, statusEl, svg, personSelect, replayBtn, legend, comparisonLabel, showLinesCheckbox;

// Initialize DOM elements after page loads
document.addEventListener('DOMContentLoaded', function() {
    bobEl = document.getElementById("bob");
    startBtn = document.getElementById("startBtn");
    statusEl = document.getElementById("status");
    svg = d3.select("#chart");
    personSelect = document.getElementById("personSelect");
    replayBtn = document.getElementById("replayBtn");
    legend = document.getElementById("legend");
    comparisonLabel = document.getElementById("comparisonLabel");
    showLinesCheckbox = document.getElementById("showLines");
    
    // Check if all elements are found
    if (!bobEl || !startBtn || !statusEl || !personSelect || !replayBtn || !legend || !comparisonLabel || !showLinesCheckbox) {
        console.error('Some DOM elements not found:', {
            bobEl: !!bobEl,
            startBtn: !!startBtn,
            statusEl: !!statusEl,
            personSelect: !!personSelect,
            replayBtn: !!replayBtn,
            legend: !!legend,
            comparisonLabel: !!comparisonLabel,
            showLinesCheckbox: !!showLinesCheckbox
        });
        return;
    }
    
    // Initialize the app
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
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('Gait analyzer initialized');
}

function setupEventListeners() {
    // Bob click handler
    bobEl.addEventListener("click", (e) => {
        e.preventDefault();
        takeStep();
        if (startTime) {
            const now = performance.now();
            if (now - startTime <= WALK_DURATION_MS) {
                bobSteps.push(now - startTime);
            }
        }
    });

    startBtn.addEventListener("click", startWalk);
    replayBtn.addEventListener("click", replaySteps);

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
}

let bobSteps = [], startTime = null, intervalId = null;
let currentComparison = null;
let loadedData = {}; // Cache for loaded CSV data

function reset() {
    bobSteps = [];
    startTime = null;
    svg.selectAll("*").remove();
    statusEl.textContent = "";
    replayBtn.style.display = "none";
    legend.style.display = "none";
    // Reset Bob's position
    bobEl.style.transform = "translateX(0px)";
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
    
    // First pass: find the minimum time to use as offset
    csvData.forEach(row => {
        const elapsedTime = +row['Elapsed Time (sec)'];
        if (!isNaN(elapsedTime) && elapsedTime !== null) {
            minTime = Math.min(minTime, elapsedTime);
        }
    });
    
    // If no valid times found, use 0 as offset
    if (minTime === Infinity) minTime = 0;
    
    csvData.forEach(row => {
        const elapsedTime = +row['Elapsed Time (sec)'];
        const leftStride = +row['Left Stride Interval (sec)'];
        const rightStride = +row['Right Stride Interval (sec)'];
        
        // Normalize time by subtracting the minimum time (time offset)
        const normalizedTime = elapsedTime - minTime;
        
        // Only include data points within our 10-second window and with valid values
        if (normalizedTime <= 10 && normalizedTime >= 0 && 
            !isNaN(leftStride) && !isNaN(rightStride) && 
            leftStride > 0 && rightStride > 0) {
            // Add both left and right stride intervals with normalized time
            const avgStride = (leftStride + rightStride) / 2;
            intervals.push({ time: normalizedTime, interval: avgStride, type: 'avg' });
        }
    });
    
    // Sort by time to ensure proper ordering
    return intervals.sort((a, b) => a.time - b.time);
}

function processStepsToIntervals(steps) {
    const intervals = [];
    for (let i = 1; i < steps.length; i++) {
        const interval = (steps[i] - steps[i - 1]) / 1000;
        const time = (steps[i] + steps[i - 1]) / 2000;
        intervals.push({ time, interval });
    }
    return intervals;
}

async function drawChart(comparisonPerson = null) {
    svg.selectAll("*").remove();

    const bobIntervals = processStepsToIntervals(bobSteps);
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

    const allData = [...bobIntervals, ...comparisonIntervals];
    if (allData.length === 0) {
        console.warn('No data to display in chart');
        return;
    }

    // Chart dimensions
    const margin = { top: 40, right: 60, bottom: 80, left: 100 },
        width = 1400 - margin.left - margin.right,
        height = 800 - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, Math.max(2, d3.max(allData, d => d.interval))])
        .range([height, 0]);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add grid lines
    const xGrid = d3.axisBottom(x)
        .tickSize(-height)
        .tickFormat("");

    const yGrid = d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("");

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

    // Plot Bob's data
    if (bobIntervals.length > 0) {
        bobDots = chart.selectAll(".bob-dot")
            .data(bobIntervals)
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
        if (showLinesCheckbox && showLinesCheckbox.checked) {
            const line = d3.line()
                .x(d => x(d.time))
                .y(d => y(d.interval))
                .curve(d3.curveMonotoneX);

            chart.append("path")
                .datum(bobIntervals)
                .attr("fill", "none")
                .attr("stroke", "#007acc")
                .attr("stroke-width", 2)
                .attr("opacity", 0.4)
                .attr("stroke-dasharray", "5,5")
                .attr("d", line);
        }
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
            .attr("stroke-width", 2)
            .on("click", function(event, d) {
                // Add click functionality for comparison dots
                const dot = d3.select(this);
                dot.transition()
                    .duration(300)
                    .attr("r", 10)
                    .attr("opacity", 1);
                
                setTimeout(() => {
                    dot.transition()
                        .duration(300)
                        .attr("r", 6)
                        .attr("opacity", 0.7);
                }, 600);
                
                // Show info about the clicked point
                statusEl.textContent = `📍 ${comparisonPerson.name}: Time ${d.time.toFixed(2)}s, Interval ${d.interval.toFixed(3)}s`;
            });

        // Add connecting line for comparison data
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

        // Show legend
        legend.style.display = "flex";
        comparisonLabel.textContent = `${comparisonPerson.name} (${comparisonPerson.disease})`;
        
        // Update legend dot color
        const legendDot = document.querySelector('.legend-item:last-child .legend-dot');
        if (legendDot) {
            legendDot.style.backgroundColor = comparisonPerson.color;
        }
    }
}

function startWalk() {
    reset();
    startTime = performance.now();
    statusEl.textContent = "🚶‍♂️ Make Bob walk for 10 seconds by clicking on him!";
    
    setTimeout(() => {
        clearInterval(intervalId);
        statusEl.textContent = `✅ Recording complete! Bob took ${bobSteps.length} steps.`;
        drawChart(currentComparison);
        replayBtn.style.display = "inline-block";
        
        if (currentComparison) {
            legend.style.display = "flex";
        }
    }, WALK_DURATION_MS);
}

let stepRight = true;

function takeStep() {
    const distance = stepRight ? 20 : -20;
    bobEl.style.transform = `translateX(${distance}px)`;
    stepRight = !stepRight;
    
    // Add a little bounce animation
    bobEl.style.transition = "transform 0.2s ease";
    setTimeout(() => {
        bobEl.style.transition = "transform 0.3s ease";
    }, 200);
}

function replaySteps() {
    if (bobSteps.length === 0) return;
    
    replayBtn.disabled = true;
    replayBtn.textContent = "👣 Bob is replaying...";
    
    // Reset Bob's position
    bobEl.style.transform = "translateX(0px)";
    stepRight = true;
    
    bobSteps.forEach((stepTime, i) => {
        setTimeout(() => {
            takeStep();
            
            // Highlight corresponding dot
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