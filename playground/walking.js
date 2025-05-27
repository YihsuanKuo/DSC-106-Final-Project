// const svg = d3.select("#canvas");

// const person = svg.append("g")
//   .attr("transform", "translate(50, 300)"); // Starting position

// // Head
// person.append("circle")
//   .attr("r", 10)
//   .attr("cx", 0)
//   .attr("cy", -40)
//   .attr("fill", "black");

// // Body
// person.append("line")
//   .attr("x1", 0).attr("y1", -30)
//   .attr("x2", 0).attr("y2", 0)
//   .attr("stroke", "black");

// // Arms
// person.append("line")
//   .attr("x1", -15).attr("y1", -20)
//   .attr("x2", 15).attr("y2", -20)
//   .attr("stroke", "black");

// // Legs
// const legLeft = person.append("line")
//   .attr("x1", 0).attr("y1", 0)
//   .attr("x2", -10).attr("y2", 20)
//   .attr("stroke", "black");

// const legRight = person.append("line")
//   .attr("x1", 0).attr("y1", 0)
//   .attr("x2", 10).attr("y2", 20)
//   .attr("stroke", "black");

// // Walking speed from slider (1 = slow, 10 = fast)
// let speedSlider = document.getElementById("speed");
// let speed = parseFloat(speedSlider.value);

// speedSlider.addEventListener("input", () => {
//   speed = parseFloat(speedSlider.value);
// });

// let x = 50;
// let y = 200; // vertical center of SVG
// let direction = 1;

// function animate() {
//   const time = Date.now();

//   // The higher the speed, the faster the movement and leg swing
//   const legSpeed = 1000 / speed; // smaller is faster
//   const stepSize = speed * 0.5; // pixel step per frame

//   const angle = Math.sin(time / legSpeed) * 15;
//   const radians = angle * Math.PI / 180;

//   legLeft
//     .attr("x2", -10 * Math.cos(radians))
//     .attr("y2", 20 * Math.abs(Math.sin(radians)));

//   legRight
//     .attr("x2", 10 * Math.cos(radians))
//     .attr("y2", 20 * Math.abs(Math.sin(radians)));

//   x += direction * stepSize;
//   person.attr("transform", `translate(${x}, ${y})`);


//   if (x > 750 || x < 50) direction *= -1;

//   requestAnimationFrame(animate);
// }

// animate();

// const button = document.getElementById('trackButton');
// const logList = document.getElementById('log');

// let lastClickTime = null;
// const intervals = [];

// button.addEventListener('click', () => {
//   const now = new Date();
//   const timeString = now.toLocaleString(); // You can also use now.toISOString()
//   let interval = null;

//   if (lastClickTime) {
//       interval = (now - lastClickTime) / 1000; // in seconds
//       intervals.push(interval);
//   }

//   lastClickTime = now;

//   const logItem = document.createElement('li');
//   logItem.textContent = `Time interval ${interval}`;
  
//   logList.appendChild(logItem);
//   });

const svg = d3.select("#canvas");

const person = svg.append("g")
.attr("transform", "translate(100, 300)");

        // Head
person.append("circle")
.attr("r", 12)
.attr("cx", 0)
.attr("cy", -80)
.attr("fill", "black");

        // Body
person.append("line")
.attr("x1", 0).attr("y1", -68)
.attr("x2", 0).attr("y2", 0)
.attr("stroke", "black")
.attr("stroke-width", 2);

        // Arms
const armLeft = person.append("line").attr("stroke", "black").attr("stroke-width", 2);
const armRight = person.append("line").attr("stroke", "black").attr("stroke-width", 2);

        // Legs
const thighLeft = person.append("line").attr("stroke", "black").attr("stroke-width", 2);
const calfLeft = person.append("line").attr("stroke", "black").attr("stroke-width", 2);

const thighRight = person.append("line").attr("stroke", "black").attr("stroke-width", 2);
const calfRight = person.append("line").attr("stroke", "black").attr("stroke-width", 2);

        // Speed control
let speedSlider = document.getElementById("speed");
let speedDisplay = document.getElementById("speedValue");
let speed = parseFloat(speedSlider.value);
        
speedSlider.addEventListener("input", () => {
speed = parseFloat(speedSlider.value);
speedDisplay.textContent = speed;
});

let x = 100;
let y = 300;
let direction = 1;

function animate() {
  const time = Date.now();
  const stepRate = 1000 / speed;
  const stepSize = speed * 0.6;

  const thighLength = 30;
  const calfLength = 30;
  const armLength = 30;

          // Hip position relative to group
  const hipX = 0;
  const hipY = 0;

  function computeLeg(angleOffset) {
            // When walking right (direction=1), flip the angles so legs bend forward-right
            // When walking left (direction=-1), keep normal angles for forward-left
    const stepAngle = Math.sin(time / stepRate + angleOffset) * 30 * Math.PI / 180 * -direction;
    const kneeAngle = 45 * Math.PI / 180;

    const kneeX = hipX + thighLength * Math.sin(stepAngle);
    const kneeY = hipY + thighLength * Math.cos(stepAngle);

    const calfAngle = stepAngle + kneeAngle * -direction;
    const footX = kneeX + calfLength * Math.sin(calfAngle);
    const footY = kneeY + calfLength * Math.cos(calfAngle);

    return { kneeX, kneeY, footX, footY };
  }

          // When walking right: left leg leads (phase 0), right leg follows (phase π)
          // When walking left: right leg leads (phase 0), left leg follows (phase π)
    const leftLeg = computeLeg(direction === 1 ? 0 : Math.PI);
    const rightLeg = computeLeg(direction === 1 ? Math.PI : 0);

          // Arms swing opposite to legs and in direction of movement
    const armSwing = Math.sin(time / stepRate) * 20 * (Math.PI / 180) * direction;
    armLeft
    .attr("x1", 0).attr("y1", -60)
    .attr("x2", -armLength * Math.sin(armSwing))
    .attr("y2", -60 + armLength * Math.cos(Math.abs(armSwing)));
    armRight
    .attr("x1", 0).attr("y1", -60)
    .attr("x2", armLength * Math.sin(armSwing))
    .attr("y2", -60 + armLength * Math.cos(Math.abs(armSwing)));

          // Draw legs
    thighLeft
    .attr("x1", hipX).attr("y1", hipY)
    .attr("x2", leftLeg.kneeX).attr("y2", leftLeg.kneeY);
    calfLeft
    .attr("x1", leftLeg.kneeX).attr("y1", leftLeg.kneeY)
    .attr("x2", leftLeg.footX).attr("y2", leftLeg.footY);

    thighRight
    .attr("x1", hipX).attr("y1", hipY)
    .attr("x2", rightLeg.kneeX).attr("y2", rightLeg.kneeY);
    calfRight
    .attr("x1", rightLeg.kneeX).attr("y1", rightLeg.kneeY)
    .attr("x2", rightLeg.footX).attr("y2", rightLeg.footY);

          // Move person horizontally
    x += direction * stepSize;
    if (x > 750 || x < 50) direction *= -1;

    person.attr("transform", `translate(${x}, ${y})`);
    requestAnimationFrame(animate);
  }

  animate();
  // Top-down foot animation script
let currentSpeed = 1;
let animationIntervals = [];

// Create simple foot shape - clean outline only
function createSimpleFootPath() {
    // Simple foot outline - longer and much narrower
    return "M-3,20 Q-4,12 -3,4 Q0,-2 8,-3 Q18,-2 26,0 Q30,2 30,6 Q28,12 25,20 Q20,30 12,38 Q4,42 -1,41 Q-4,38 -4,32 Q-3,26 -3,20 Z";
}

function initializeFootAnimation() {
    // Clear any existing intervals
    animationIntervals.forEach(interval => clearInterval(interval));
    animationIntervals = [];

    // Gait parameters
    const strideTime = 1200 / currentSpeed;
    const swingTime = 400 / currentSpeed;
    const stepLength = 60; // How far forward/back the foot moves

    const svg = d3.select("#foot-animation");
    const width = +svg.attr("width");
    const height = +svg.attr("height");

    // Clear previous animation
    svg.selectAll("*").remove();

    // Add title
    svg.append("text")
        .attr("x", width/2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .text("Walking Animation - Top View");

    // Create foot groups
    const leftFootGroup = svg.append("g")
        .attr("class", "left-foot")
        .attr("transform", `translate(${width/2 - 80}, ${height/2})`);
    
    const rightFootGroup = svg.append("g")
        .attr("class", "right-foot")
        .attr("transform", `translate(${width/2 + 80}, ${height/2})`);

    // Create left foot - simple clean shape
    leftFootGroup.append("path")
        .attr("d", createSimpleFootPath())
        .attr("fill", "#666")
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5);

    // Create right foot (mirrored) - simple clean shape
    rightFootGroup.append("path")
        .attr("d", createSimpleFootPath())
        .attr("transform", "scale(-1, 1)")
        .attr("fill", "#666")
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5);

    // Add foot labels - moved further down to avoid collision
    svg.append("text")
        .attr("x", width/2 - 80)
        .attr("y", height/2 + 90)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#666")
        .text("Left Foot");

    svg.append("text")
        .attr("x", width/2 + 80)
        .attr("y", height/2 + 90)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#666")
        .text("Right Foot");

    // Ground contact indicators
    const leftContact = svg.append("circle")
        .attr("cx", width/2 - 80)
        .attr("cy", height/2 + 100)
        .attr("r", 6)
        .attr("fill", "#4CAF50");

    const rightContact = svg.append("circle")
        .attr("cx", width/2 + 80)
        .attr("cy", height/2 + 100)
        .attr("r", 6)
        .attr("fill", "#4CAF50");

    svg.append("text")
        .attr("x", width/2)
        .attr("y", height - 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#666")
        .text("Green = Ground Contact, Orange = Swing Phase");

    function animateWalk() {
        // Left foot movement - forward during swing, back during stance
        leftFootGroup.transition()
            .duration(swingTime)
            .attr("transform", `translate(${width/2 - 80}, ${height/2 - stepLength/2}) scale(0.85)`)
            .style("opacity", 0.6)
            .transition()
            .duration(strideTime - swingTime)
            .attr("transform", `translate(${width/2 - 80}, ${height/2 + stepLength/2}) scale(1)`)
            .style("opacity", 1);

        // Left foot contact indicator
        leftContact.transition()
            .duration(swingTime)
            .attr("fill", "#FF9800")
            .transition()
            .duration(strideTime - swingTime)
            .attr("fill", "#4CAF50");

        // Right foot movement (offset by half stride) - opposite pattern
        rightFootGroup.transition()
            .delay(strideTime / 2)
            .duration(swingTime)
            .attr("transform", `translate(${width/2 + 80}, ${height/2 - stepLength/2}) scale(0.85)`)
            .style("opacity", 0.6)
            .transition()
            .duration(strideTime - swingTime)
            .attr("transform", `translate(${width/2 + 80}, ${height/2 + stepLength/2}) scale(1)`)
            .style("opacity", 1);

        // Right foot contact indicator
        rightContact.transition()
            .delay(strideTime / 2)
            .duration(swingTime)
            .attr("fill", "#FF9800")
            .transition()
            .duration(strideTime - swingTime)
            .attr("fill", "#4CAF50");
    }

    // Start animation loop
    const animationInterval = setInterval(animateWalk, strideTime);
    animationIntervals.push(animationInterval);
    animateWalk();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Speed control
    const speedSelector = document.getElementById("speed-selector");
    if (speedSelector) {
        speedSelector.addEventListener("change", function() {
            currentSpeed = parseFloat(this.value);
            initializeFootAnimation();
        });
    }

    // Initialize foot animation
    initializeFootAnimation();
});