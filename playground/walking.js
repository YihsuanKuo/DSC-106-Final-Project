const svg = d3.select("#canvas");

const person = svg.append("g")
  .attr("transform", "translate(50, 300)"); // Starting position

// Head
person.append("circle")
  .attr("r", 10)
  .attr("cx", 0)
  .attr("cy", -40)
  .attr("fill", "black");

// Body
person.append("line")
  .attr("x1", 0).attr("y1", -30)
  .attr("x2", 0).attr("y2", 0)
  .attr("stroke", "black");

// Arms
person.append("line")
  .attr("x1", -15).attr("y1", -20)
  .attr("x2", 15).attr("y2", -20)
  .attr("stroke", "black");

// Legs
const legLeft = person.append("line")
  .attr("x1", 0).attr("y1", 0)
  .attr("x2", -10).attr("y2", 20)
  .attr("stroke", "black");

const legRight = person.append("line")
  .attr("x1", 0).attr("y1", 0)
  .attr("x2", 10).attr("y2", 20)
  .attr("stroke", "black");

// Walking speed from slider (1 = slow, 10 = fast)
let speedSlider = document.getElementById("speed");
let speed = parseFloat(speedSlider.value);

speedSlider.addEventListener("input", () => {
  speed = parseFloat(speedSlider.value);
});

let x = 50;
let y = 200; // vertical center of SVG
let direction = 1;

function animate() {
  const time = Date.now();

  // The higher the speed, the faster the movement and leg swing
  const legSpeed = 1000 / speed; // smaller is faster
  const stepSize = speed * 0.5; // pixel step per frame

  const angle = Math.sin(time / legSpeed) * 15;
  const radians = angle * Math.PI / 180;

  legLeft
    .attr("x2", -10 * Math.cos(radians))
    .attr("y2", 20 * Math.abs(Math.sin(radians)));

  legRight
    .attr("x2", 10 * Math.cos(radians))
    .attr("y2", 20 * Math.abs(Math.sin(radians)));

  x += direction * stepSize;
  person.attr("transform", `translate(${x}, ${y})`);


  if (x > 750 || x < 50) direction *= -1;

  requestAnimationFrame(animate);
}

animate();

