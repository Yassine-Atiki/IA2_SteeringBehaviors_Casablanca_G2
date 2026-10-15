const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Minimal p5.Vector adapter; browser integration also exercises the actual p5 library.
class Vector {
  constructor(x=0,y=0) { this.x=x; this.y=y; }
  copy() { return new Vector(this.x,this.y); }
  set(x,y) { this.x=x; this.y=y; return this; }
  add(v) { this.x+=v.x; this.y+=v.y; return this; }
  sub(v) { this.x-=v.x; this.y-=v.y; return this; }
  mult(n) { this.x*=n; this.y*=n; return this; }
  magSq() { return this.x*this.x+this.y*this.y; }
  mag() { return Math.hypot(this.x,this.y); }
  normalize() { const m=this.mag(); if(m) this.mult(1/m); return this; }
  setMag(n) { return this.normalize().mult(n); }
  limit(n) { if(this.mag()>n) this.setMag(n); return this; }
  heading() { return Math.atan2(this.y,this.x); }
  static sub(a,b) { return new Vector(a.x-b.x,a.y-b.y); }
  static dist(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }
}
let seed=21;
const random=(a=1,b=null)=>{ seed=(seed*16807)%2147483647; const u=seed/2147483647; return b===null?u*a:a+u*(b-a); };
const ctx=vm.createContext({createVector:(x,y)=>new Vector(x,y),p5:{Vector},width:1000,TWO_PI:Math.PI*2,random,
  map:(v,a,b,c,d)=>c+(d-c)*(v-a)/(b-a)});
for(const [file,name] of [['vehicle.js','Vehicle'],['snake.js','Snake'],['food.js','Food'],['energyParticle.js','EnergyParticle'],['neonSnake.js','NeonSnake'],['neonFood.js','NeonFood'],['arenaEffects.js','ArenaEffects']]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8')+`\nthis.${name}=${name};`,ctx);
}

test('particles steer, use inherited integration, respect force and speed limits and expire',()=>{
  const p=new ctx.EnergyParticle(0,0,0,2,1);
  assert.ok(p instanceof ctx.Vehicle);
  p.step(0.1);
  assert.ok(p.pos.x>0); assert.equal(p.pos.y,0);
  assert.ok(p.vel.mag()<=p.maxForce+1e-9); assert.equal(p.acc.mag(),0);
  const target=new Vector(-100,20); const saved=target.copy();
  for(let i=0;i<10;i++) p.step(0.1,target);
  assert.equal(p.life,0); assert.ok(p.vel.mag()<=p.maxSpeed);
  assert.equal(target.x,saved.x); assert.equal(target.y,saved.y);
});

test('particle pools and rings remain bounded and expired effects are removed',()=>{
  const effects=new ctx.ArenaEffects();
  for(let i=0;i<25;i++) effects.burst(100,100);
  assert.equal(effects.particles.length,120); assert.equal(effects.rings.length,8);
  effects.reduced=true; effects.step(0.05,{x:0,y:0,w:1000,h:600});
  assert.equal(effects.particles.length,48);
  effects.step(1,{x:0,y:0,w:1000,h:600});
  assert.equal(effects.particles.length,0); assert.equal(effects.rings.length,0);
  effects.burst(10,10); effects.reset();
  assert.equal(effects.flash,0); assert.equal(effects.shakeLeft,0); assert.equal(effects.particles.length,0);
});

test('NeonSnake preserves the original independent arrival integration and bounded trail',()=>{
  const base=new ctx.Snake(100,100,4,9,'#39FF88');
  const neon=new ctx.NeonSnake(100,100,4,9,'#39FF88');
  for(let i=0;i<120;i++) {
    const target=new Vector(500+i,200);
    base.update(target); neon.update(target); neon.recordTrail(1/60,false);
    for(const [a,b] of [[base.head,neon.head],...base.anneaux.map((p,j)=>[p,neon.anneaux[j]])]) {
      assert.equal(a.pos.x,b.pos.x); assert.equal(a.pos.y,b.pos.y);
      assert.equal(a.vel.x,b.vel.x); assert.equal(a.vel.y,b.vel.y);
    }
  }
  assert.ok(neon.trail.length>0 && neon.trail.length<=40);
  neon.ajouterAnneau(); assert.equal(neon.anneaux.length,5);
  neon.recordTrail(1,true); assert.equal(neon.trail.length,0);
});

test('energy core retains Food semantics and its orbiting sparks use Vehicles',()=>{
  const core=new ctx.NeonFood(100,100,11);
  assert.ok(core instanceof ctx.Food && core instanceof ctx.Vehicle);
  assert.ok(core.sparks.every(p=>p instanceof ctx.Vehicle));
  const original=core.sparks[0].pos.copy();
  core.step(0.02,1);
  assert.ok(Vector.dist(core.sparks[0].pos,original)>0);
  assert.equal(core.pos.x,100); assert.equal(core.pos.y,100);
  core.vel.set(1,2); core.repositionner(350,200);
  assert.equal(core.vel.mag(),0);
  assert.ok(core.sparks.every(p=>Math.abs(Vector.dist(p.pos,core.pos)-27)<1e-8));
  assert.ok(core.sparks.every(p=>p.vel.mag()===0 && p.acc.mag()===0));
});
