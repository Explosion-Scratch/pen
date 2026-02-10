function setup() {
  createCanvas(windowWidth, windowHeight)
  background(20)
}

function draw() {
  noStroke()
  fill(random(100, 255), random(50, 200), random(100, 255), 60)
  const size = random(10, 60)
  ellipse(mouseX, mouseY, size, size)
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}
