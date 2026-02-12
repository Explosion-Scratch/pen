// Credit to: https://editor.p5js.org/MAKE/sketches/cr7tCaAg9

class Particle {
  constructor(x, y) {
    this.velocity = createVector(random(-1, 1), random(-1, 1));
    this.acceleration = createVector(0, -0.05);
    this.position = createVector(x, y);
    this.lifespan = 500;
  }

  run() {
    this.display();
    this.update();
  }

  update() {
    this.position.add(this.velocity);
    this.lifespan -= 2;
    if (mouseIsPressed) this.acceleration.y = 0.05;
    this.velocity.add(this.acceleration);
  }

  isDead() {
    if (this.lifespan <= 0) return true;
    else return false;
  }

  display() {
    stroke(2, this.lifespan);
    fill(0, this.lifespan);
    ellipse(this.position.x, this.position.y, 1, 1);
  }
}
class ParticleSystem {
  constructor(x, y) {
    this.origin = createVector(x, y);
    this.particles = [];
  }

  addParticle(x, y) {
    this.particles.push(new Particle(this.origin.x, this.origin.y));
  }

  run() {
    for (let particle of this.particles) {
      particle.run();
    }

    this.particles = this.particles.filter((particle) => !particle.isDead());
  }
}

let ps;

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  ps = new ParticleSystem(createVector(width / 2, 50));
}

function draw() {
  background(220);

  ps.origin.set(mouseX, mouseY, 0);
  ps.addParticle();
  ps.run();
}
