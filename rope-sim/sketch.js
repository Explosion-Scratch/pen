const GRAVITY = 1;
const STEP = 0.5;
const DOWN = 1;
const POINT_SIZE = 10;
const LINE_WEIGHT = 3;
// Maximum distance to drag a point from 
const DRAG_DISTANCE = POINT_SIZE * 2;
//Friction to apply after bouncing
const BOUNCE_FRICTION = .5;
// Between 0 and 1, 1 == Steel rods, 0 == no connections
const GIVE = 0;
// Multiply each point's velocity by this every frame.
const AIR_FRICTION = .95;
//Iterations to apply physics to points, more == less bounce and a stabler animation
const ITERATION_COUNT = 3;
class Vector {
  constructor(x, y){
    Object.assign(this, {x, y});
  }
  clone(){
    return new Vector(this.x, this.y);
  }
  distance(vector){
    vector = this._v(vector);
    return Math.sqrt((vector.x - this.x)**2 + (vector.y - this.y) **2);
  }
  add(vector){
    vector = this._v(vector);
    const a = this.clone();
    a.x += vector.x;
    a.y += vector.y;
    return a;
  }
  subtract(vector){
    vector = this._v(vector);
    const a = this.clone();
    a.x -= vector.x;
    a.y -= vector.y;
    return a;
  }
  multiply(vector){
    vector = this._v(vector);
    const a = this.clone();
    a.x *= vector.x;
    a.y *= vector.y;
    return a;
  }
  divide(vector){
    vector = this._v(vector);
    const a = this.clone();
    a.x /= vector.x;
    a.y /= vector.y;
    return a;
  }
  normalize(){
    return new Vector(this.x / this.length, this.y / this.length);
  }
  get length(){
    return Math.sqrt(this.x**2 + this.y**2);
  }
  _v(vector){
    if (!(vector instanceof Vector)){
      if (typeof vector === "number"){
        return new Vector(vector, vector);
      }
      console.log(vector)
      throw new Error("Vector must be number or vector");
    } else if (vector.x && vector.y){
      return new Vector(vector.x, vector.y);
    }else {
      return vector;
    }
  }
}

class Point {
  constructor({position, prevPosition, locked = false}){
    if (!prevPosition){prevPosition = position.clone()}
    Object.assign(this, {
      position, 
      prevPosition, 
      locked,
      dragging: false,
      connections: [],
    });
  }
  connect(point){
    this.connections = [...this.connections, new Connection(this, point)];
    connections = [...connections, ...this.connections.slice(-1)]
  }
  addBetween(p2, {count, ...opts}){
    let newpoints = [];
    let weight = 0;
    let inc = 1 / (count + 1);
    for (let i = 0; i < count; i++){
      weight += inc;
      let p = new Point({
        position: new Vector(mix(this.position.x, p2.position.x, weight), mix(this.position.y, p2.position.y, weight)),
        prevPosition: new Vector(mix(this.prevPosition.x, p2.prevPosition.x, weight), mix(this.prevPosition.y, p2.prevPosition.y, weight)),
        ...opts,
      })
      newpoints.push(p)
    }
    return newpoints;
  }
  get x(){return this.position.x}
  get y(){return this.position.y}
  get index(){return points.indexOf(this) < 0 ? null : points.indexOf(this)}
  applyFriction(friction){
    this.prevPosition = new Vector(
      mix(this.position.x, this.prevPosition.x, friction),
      mix(this.position.y, this.prevPosition.y, friction),
    )
  }
  draw(){
    if (this.dragging){
      strokeWeight(DRAG_DISTANCE);
      stroke("#fff2");
      point(this.x, this.y);
    }
    strokeWeight(POINT_SIZE);
    if (this.locked){
      stroke("#f55");
    } else {
      stroke("#fff");
    }
    point(this.x, this.y);
  }
}

class Connection {
  // p1 and p2 should be instanceof Point
  constructor(p1, p2){
    Object.assign(this, {
      p1,
      p2,
      //Give is how stretchy it is (0-1).
      give: GIVE,
      // If give is 0 it acts like a steel bar.
      length: Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2),
    })
  }
  draw(){
    strokeWeight(LINE_WEIGHT);
    stroke("#999");
    line(this.p1.x, this.p1.y, this.p2.x, this.p2.y)
  }
}

let points = [];
let connections = [];

function setup(){
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  let cx = width / 2;
  let cy = height / 2;
  points = [
    new Point({
      locked: true,
      position: new Vector(cx - 200, cy),
    }),
    new Point({
      position: new Vector(cx + 200, cy),
      locked: true,
    })
  ]
  points.splice(
    1,
    0,
    ...points[0].addBetween(points[1], {
      count: 10,
      locked: false,
    })
  )
  for (let i = 0; i < points.length - 1; i++){
    points[i].connect(points[i+1]);
  }
  let a = new Point({
    locked: true,
    position: new Vector(cx, cy - 150),
  });
  points.push(a)
  let len = points.length;
  points.splice(points.length - 1, 0, ...points[5].addBetween(a, {
    count: 3,
  }))
  for (let i = len - 1; i < points.length - 1; i++){
    points[i].connect(points[i+1])
  }
  points[len - 1].connect(points[5])
}

function draw(){
  simulate()
  background("#335")
  strokeWeight(0)
  let t = "Click to add points, drag points on top of one another to join";
  fill("white")
  textAlign("center")
  text(t, width / 2, height - 20)
  connections.forEach(c => c.draw())
  points.forEach(p => p.draw())
}

function simulate(){
  for (let point of points){
    if (point.dragging){
      point.prevPosition.x = mouseX;
      point.prevPosition.y = mouseY;
      point.position.x = mouseX;
      point.position.y = mouseY;
    }
    if (!point.locked){
      point.applyFriction(AIR_FRICTION);
      let before = point.position.clone();
      // Continue moving as before
      const vel = point.position.subtract(point.prevPosition);
      
      point.position = point.position.add(vel);
      // Gravity
      point.position = point.position.add(new Vector(0, getGravity()));
      // Reassign prevPos
      point.prevPosition = before;
      
      // Bouncing:
      const vx = vel.x;
      const vy = vel.y;
      if (point.position.x > width){
        point.position.x = width;
        point.prevPosition.x = point.position.x + vx;
        point.applyFriction(BOUNCE_FRICTION)
      }
      if (point.position.x < 0){
        point.position.x = 0;
        point.prevPosition.x = point.position.x + vx;
        point.applyFriction(BOUNCE_FRICTION)
      }
      if (point.position.y > height){
        point.position.y = height;
        point.prevPosition.y = point.position.y + vy;
        point.applyFriction(BOUNCE_FRICTION)
      }
      if (point.position.y < 0){
        point.position.y = 0;
        point.prevPosition.y = point.position.y + vy;
        point.applyFriction(BOUNCE_FRICTION)
      }
    }
  }
  for (let i = 0; i < ITERATION_COUNT; i++){
    for (let connection of connections){
      //Find the center
      let center = connection.p1.position.add(connection.p2.position).divide(2);
      // Make it's magnitude 1
      let dir = connection.p1.position.subtract(connection.p2.position).normalize();
      if (!connection.p1.locked){
        let newpos = center.add(dir.multiply(connection.length / 2));
        connection.p1.position = connection.p1.position.multiply(connection.give).add(newpos.multiply(1 - connection.give));
      }
      if (!connection.p2.locked){
        let newpos = center.subtract(dir.multiply(connection.length / 2));
        connection.p2.position = connection.p2.position.multiply(connection.give).add(newpos.multiply(1 - connection.give));
      }
    }
  }
}

function mouseReleased(){
  if (points.find(i => i.dragging)){
    let dragging = points.find(i => i.dragging)
    let closest = points.filter(i => i !== dragging).sort((a, b) => a.position.distance(dragging.position) - b.position.distance(dragging.position))[0];
    if (closest.position.distance(dragging.position) < 3){
      dragging.connect(closest)
    }
  }
  points.forEach(i => {
    if (i.dragging){
      i.dragging = false;
    }
  })
}

function mousePressed(){
  points.forEach(i => {
    if (i.dragging){
      i.dragging = false;
    }
  })
  
  let closest = points.sort((a, b) => a.position.distance(new Vector(mouseX, mouseY)) - b.position.distance(new Vector(mouseX, mouseY)))[0];
  if (closest.position.distance(new Vector(mouseX, mouseY)) >= DRAG_DISTANCE){
    let b = new Point({position: new Vector(mouseX, mouseY)});
    points.push(b)
    closest.connect(b);
  }
  closest.dragging = true;
  return false;
}

function getGravity(){
  return GRAVITY * STEP * STEP * DOWN;
}

function mix(num1, num2, amt){
  return num2 * amt + num1 * (1 - amt);
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}