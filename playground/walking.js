<<<<<<< HEAD
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

=======
//walking man animation
>>>>>>> 3d44093d4f190401ad9f1206963bdb09bd424a64
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

<<<<<<< HEAD
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
=======

  if (x > 750 || x < 50) direction *= -1;

  requestAnimationFrame(animate);
}

animate();

// interactivity for tracking steps 
// first steps are recorded into an array when the button is clicked
const trackButton = document.getElementById('trackButton');
const logList = document.getElementById('log');

let lastClickTime = null;
const intervals = [];

trackButton.addEventListener('click', () => {
  const now = new Date();
  const timeString = now.toLocaleString(); // You can also use now.toISOString()
  let interval = null;
  const logItem = document.createElement('li');  

  if (lastClickTime) {
      interval = (now - lastClickTime) / 1000; // in seconds
      intervals.push(interval);
      console.log(`Interval: ${interval} seconds`);
      logItem.textContent = `Time interval ${interval}`;
  }
  else {
    logItem.textContent = `First step recorded`;
    logList.innerHTML = '';
  }
  console.log('array:',intervals)
  lastClickTime = now;
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
function plotGraph(array){
  console.log('I dont do anything yet')
}
>>>>>>> 3d44093d4f190401ad9f1206963bdb09bd424a64
