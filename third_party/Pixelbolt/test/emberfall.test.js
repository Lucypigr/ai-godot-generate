import test from 'node:test';
import assert from 'node:assert/strict';
import {World,FLOOR} from '../demo/world.js';
const advance=(w,seconds)=>{for(let n=0;n<Math.round(seconds*60);n++)w.update(1/60);};
test('Emberfall double jump, landing, dash cooldown, pause and restart form a coherent movement cycle',()=>{
 const w=new World();w.start();w.press('jump');advance(w,.15);w.release('jump');const y=w.player.y;w.press('jump');advance(w,.15);w.release('jump');assert.equal(w.player.jumps,2);assert.ok(w.player.y<y);w.press('jump');advance(w,.05);assert.equal(w.player.jumps,2);w.release('jump');advance(w,1);assert.equal(w.player.y,FLOOR);assert.equal(w.player.jumps,0);
 w.press('dash');advance(w,.15);w.release('dash');assert.ok(w.player.x>135);const x=w.player.x;w.press('dash');advance(w,.3);w.release('dash');assert.ok(w.player.x-x<15);w.press('pause');const t=w.time;advance(w,2);assert.equal(w.time,t);w.release('pause');w.press('pause');advance(w,.1);assert.ok(w.time>t);w.reset();assert.equal(w.player.x,80);assert.equal(w.mode,'title');
});
test('Emberfall elemental interactions persist and charged shots consume breakable health',()=>{
 const w=new World();w.start();const brazier=w.props.find(p=>p.type==='brazier'),crystal=w.props.find(p=>p.type==='crystal'),vine=w.props.find(p=>p.type==='vines'),grass=w.props.find(p=>p.type==='grass');
 const hit=(prop,spell,damage=1)=>w.hitProp(prop,{x:prop.x,y:prop.y-18,spell,damage});
 hit(brazier,'frost');assert.equal(brazier.state,'frozen');hit(brazier,'ember');assert.equal(brazier.state,'whole');hit(vine,'frost');assert.equal(vine.state,'whole');hit(vine,'ember');assert.equal(vine.state,'burned');hit(grass,'ember');assert.equal(grass.state,'burned');hit(crystal,'storm');assert.equal(crystal.state,'broken');assert.equal(w.destroyed,3);assert.equal(w.loot.length,1);
 const e=w.enemies[0];w.strike(e,{spell:'frost',damage:1,x:e.x,y:e.y-18});assert.equal(e.hp,2);assert.ok(e.freeze>0);w.strike(e,{spell:'storm',damage:1,x:e.x,y:e.y-18});assert.equal(e.dead,true);assert.equal(w.kills,1);
 w.press('fire');advance(w,.65);w.release('fire');assert.ok(w.shots.some(s=>s.charged&&s.damage===4));
});
test('Emberfall checkpoint healing, death, retry and portal gating preserve progression',()=>{
 const w=new World();w.start();w.player.hp=2;w.player.x=1290;advance(w,.05);assert.equal(w.checkpoint,1290);assert.equal(w.player.hp,8);w.hurt(8,1300);assert.equal(w.mode,'dead');w.respawn();assert.equal(w.mode,'playing');assert.equal(w.player.x,1290);assert.equal(w.player.hp,8);w.player.x=3440;advance(w,.05);assert.equal(w.mode,'playing');w.boss.dead=true;advance(w,.05);assert.equal(w.mode,'won');
});
test('Emberfall guided tour traverses gaps, destroys scenery, defeats boss and wins without unbounded effects',()=>{
 const w=new World();w.start(true);w.stress=400;let peak=0;for(let i=0;i<3600&&w.mode==='playing';i++){w.update(1/60);peak=Math.max(peak,w.particles.length);assert.ok(w.effects.length<=140);assert.ok(w.particles.length<=1200);}assert.equal(w.mode,'won');assert.ok(w.destroyed>15);assert.ok(w.kills>=8);assert.equal(w.boss.dead,true);assert.ok(peak>100);assert.ok(w.time<60);
});
