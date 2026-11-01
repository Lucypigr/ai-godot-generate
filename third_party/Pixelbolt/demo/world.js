// Fixed-step, deterministic gameplay. Rendering and browser APIs live in game.js.
export const WIDTH=640, HEIGHT=360, WORLD=3584, FLOOR=300;
export const SPELLS=['ember','frost','storm'];
export const GAPS=[[896,1024],[1760,1888],[2304,2400]];
export const PLATFORMS=[{x:360,y:231,w:128},{x:592,y:189,w:96},{x:828,y:223,w:96},{x:1000,y:240,w:128},{x:1450,y:231,w:128},{x:1696,y:218,w:128},{x:1880,y:248,w:128},{x:2136,y:224,w:96},{x:2336,y:205,w:96},{x:2640,y:232,w:128},{x:2900,y:218,w:96}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class World {
 constructor(){this.keys=new Set();this.seed=44;this.reset();}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 reset(){
  this.keys.clear();this.seed=44;this.time=0;this.mode='title';this.camera=0;this.score=0;this.kills=0;this.hits=0;this.destroyed=0;this.checkpoint=80;this.shake=0;this.stress=0;this.tour=false;this.tourTime=0;this.flash=0;this.message='';this.messageTime=0;this.shots=[];this.effects=[];this.particles=[];this.loot=[];this.ghosts=[];this.events=[];
  this.player={x:80,y:FLOOR,vx:0,vy:0,face:1,hp:8,maxHp:8,grounded:true,jumps:0,coyote:0,jumpBuffer:0,dash:0,dashCooldown:0,invulnerable:0,cast:0,charge:0,charging:false,spell:0,animation:'idle',animationTime:0};
  this.props=[...Array.from({length:45},(_,i)=>({type:'grass',x:115+i*73,y:FLOOR,state:'whole',hp:1})),...[[220,'brazier'],[335,'crate'],[555,'crystal'],[735,'vines'],[1140,'brazier'],[1290,'checkpoint'],[1505,'crystal'],[1600,'crate'],[2040,'vines'],[2190,'brazier'],[2480,'checkpoint'],[2700,'crystal'],[2820,'crate'],[3350,'brazier'],[3440,'portal']].map(([x,type])=>({x,y:FLOOR,type,state:'whole',hp:type==='crystal'?3:type==='crate'?2:1}))].filter(p=>!GAPS.some(([a,b])=>p.x>a&&p.x<b));
  this.enemies=[[440,'crawler'],[655,'wisp'],[800,'sentinel'],[1190,'crawler'],[1415,'wisp'],[1550,'sentinel'],[1970,'crawler'],[2170,'wisp'],[2575,'sentinel'],[2770,'crawler'],[2930,'wisp']].map(([x,type],i)=>({x,y:type==='wisp'?220:FLOOR,home:x,type,hp:type==='sentinel'?5:3,maxHp:type==='sentinel'?5:3,phase:i,face:-1,freeze:0,hit:0,cooldown:1+i*.2,dead:false}));
  this.boss={x:3215,y:FLOOR,type:'warden',hp:36,maxHp:36,freeze:0,hit:0,phase:0,cooldown:2.2,active:false,dead:false};
 }
 start(tour=false){this.reset();this.mode='playing';this.tour=tour;this.notice(tour?'A guided journey through spellcraft':'Reach the Warden. Reclaim the ember.');}
 notice(message){this.message=message;this.messageTime=3.5;}
 event(name){this.events.push(name);if(this.events.length>32)this.events.shift();}
 press(key){
  if(this.keys.has(key))return;this.keys.add(key);
  if(key==='pause'){if(this.mode==='playing')this.mode='paused';else if(this.mode==='paused')this.mode='playing';return;}
  if(this.mode!=='playing')return;
  if(key==='jump'){this.player.jumpBuffer=.12;}
  if(key==='dash')this.dash();
  if(key==='spell'){this.player.spell=(this.player.spell+1)%3;this.event('switch');}
  if(key==='fire'){this.player.charging=true;this.player.charge=0;this.shoot(false);}
 }
 release(key){this.keys.delete(key);if(key==='fire'){if(this.mode==='playing'&&this.player.charging&&this.player.charge>=.4)this.shoot(true);this.player.charging=false;this.player.charge=0;}if(key==='jump'&&this.player.vy< -120)this.player.vy=-120;}
 clearInput(){this.keys.clear();this.player.charging=false;this.player.charge=0;this.player.jumpBuffer=0;}
 dash(){const p=this.player;if(p.dashCooldown>0)return;p.dash=.17;p.dashCooldown=.85;p.invulnerable=Math.max(p.invulnerable,.24);p.vy=0;this.event('dash');this.fx('dust',p.x,p.y-4);}
 shoot(charged){
  const p=this.player;if(p.cast>.1&&!charged)return;
  const spell=SPELLS[p.spell];p.cast=.24;
  this.shots.push({x:p.x+p.face*22,y:p.y-18,vx:p.face*(spell==='storm'?460:360),vy:0,spell,charged,damage:charged?4:1,life:2.2,friendly:true,r:charged?12:5});
  if(charged){this.shake=.12;this.event('charge');}else this.event('cast');
 }
 fx(name,x,y){this.effects.push({name,x,y,age:0,life:name==='shatter'?.52:.6});if(this.effects.length>140)this.effects.shift();}
 burst(x,y,color,count=12){for(let i=0;i<count;i++)this.particles.push({x,y,vx:(this.random()-.5)*180,vy:-this.random()*160,life:.4+this.random()*.5,max:1,color,size:1+Math.floor(this.random()*3)});if(this.particles.length>1200)this.particles.splice(0,this.particles.length-1200);}
 hurt(damage,fromX){
  const p=this.player;if(p.invulnerable>0||this.tour||this.mode!=='playing')return;
  p.hp=Math.max(0,p.hp-damage);p.invulnerable=1.1;p.vx=(p.x<fromX?-1:1)*100;p.vy=-140;this.hits++;this.shake=.22;this.event('hurt');this.burst(p.x,p.y-18,'#c780a6',12);
  if(!p.hp){this.mode='dead';this.clearInput();this.event('death');}
 }
 respawn(){
  if(this.mode!=='dead')return;const p=this.player;p.x=this.checkpoint;p.y=FLOOR;p.vy=p.vx=0;p.hp=p.maxHp;p.invulnerable=2;p.dash=0;p.jumps=0;this.shots=[];this.effects=[];this.mode='playing';this.clearInput();this.notice('The ember endures.');
  if(this.boss.active&&!this.boss.dead){this.boss.hp=this.boss.maxHp;this.boss.cooldown=2;this.boss.x=3215;}
 }
 strike(enemy,shot){
  const frozen=enemy.freeze>0;
  enemy.hp-=shot.damage+(frozen&&shot.spell==='storm'?2:0);enemy.hit=.12;
  if(shot.spell==='frost')enemy.freeze=enemy.type==='warden'?1:2.4;
  if(shot.spell==='ember'&&frozen){enemy.freeze=0;this.burst(enemy.x,enemy.y-18,'#a5eef0',10);}
  this.fx(`${shot.spell}-impact`,shot.x,shot.y);this.event('impact');this.shake=shot.charged?.15:.045;
  if(enemy.hp<=0){enemy.dead=true;this.kills++;this.score+=enemy.type==='warden'?1000:100;this.fx('shatter',enemy.x,enemy.y-22);this.burst(enemy.x,enemy.y-22,'#c8d889',22);this.loot.push({x:enemy.x,y:enemy.y-25,vy:-90,life:16});if(enemy.type==='warden'){this.flash=.3;this.notice('The Warden has fallen. Enter the moon gate.');this.event('boss');}}
 }
 hitProp(prop,shot){
  if(prop.state==='broken'||prop.state==='burned')return false;
  const hit=Math.abs(prop.x-shot.x)<(prop.type==='vines'?24:18)&&shot.y>prop.y-(prop.type==='grass'?26:57)&&shot.y<prop.y+4;
  if(!hit)return false;
  if(prop.type==='grass'&&shot.spell==='ember'){prop.state='burned';this.destroyed++;this.burst(prop.x,prop.y-3,'#ffa85b',10);this.fx('ember-impact',prop.x,prop.y-6);return false;}
  if(prop.type==='vines'&&shot.spell==='ember'){prop.state='burned';this.destroyed++;this.burst(prop.x,prop.y-25,'#ffa85b',26);this.fx('ember-impact',prop.x,prop.y-30);this.notice('Ember burns the overgrowth.');return true;}
  if(prop.type==='brazier'){
   if(shot.spell==='frost'&&prop.state!=='frozen'){prop.state='frozen';this.fx('frost-impact',prop.x,prop.y-30);this.notice('Frost quiets the flame.');this.event('freeze');return true;}
   if(shot.spell==='ember'&&prop.state==='frozen'){prop.state='whole';this.fx('ember-impact',prop.x,prop.y-30);this.notice('Ember rekindles the flame.');return true;}return false;
  }
  if(prop.type==='crystal'||prop.type==='crate'){
   prop.hp-=shot.damage+(shot.spell==='storm'?2:0);this.fx(`${shot.spell}-impact`,shot.x,shot.y);
   if(prop.hp<=0){prop.state='broken';this.destroyed++;this.score+=50;this.fx('shatter',prop.x,prop.y-25);this.burst(prop.x,prop.y-25,prop.type==='crystal'?'#c780a6':'#977858',20);this.loot.push({x:prop.x,y:prop.y-35,vy:-90,life:16});this.event('break');}
   return true;
  }return false;
 }
 update(dt){
  if(this.mode!=='playing'){if(this.mode==='title')this.time+=dt;return;}
  this.time+=dt;const p=this.player;
  for(const field of ['dash','dashCooldown','invulnerable','cast','coyote','jumpBuffer'])p[field]=Math.max(0,p[field]-dt);
  this.shake=Math.max(0,this.shake-dt);this.flash=Math.max(0,this.flash-dt);this.messageTime=Math.max(0,this.messageTime-dt);
  if(this.tour)this.autoplay(dt);
  const direction=(this.keys.has('right')?1:0)-(this.keys.has('left')?1:0);
  if(direction)p.face=direction;
  p.vx=p.dash>0?p.face*440:direction*155;
  if(p.charging)p.charge=Math.min(1,p.charge+dt);
  if(p.grounded)p.coyote=.09;
  if(p.jumpBuffer>0&&(p.grounded||p.coyote>0||p.jumps<2)){
   if(!p.grounded&&p.coyote<=0)p.jumps=Math.max(1,p.jumps);p.jumps++;p.vy=-300;p.grounded=false;p.coyote=0;p.jumpBuffer=0;this.fx('dust',p.x,p.y);this.event('jump');
  }
  const oldY=p.y;p.x=clamp(p.x+p.vx*dt,12,WORLD-12);p.vy=Math.min(550,p.vy+(p.dash>0?0:850*dt));p.y+=p.vy*dt;p.grounded=false;
  const ground=!GAPS.some(([a,b])=>p.x>a+6&&p.x<b-6);
  const surfaces=[...PLATFORMS,...(ground?[{x:0,w:WORLD,y:FLOOR}]:[])];
  if(p.vy>=0)for(const s of surfaces){if(p.x+8>s.x&&p.x-8<s.x+s.w&&oldY<=s.y+.5&&p.y>=s.y){p.y=s.y;p.vy=0;p.grounded=true;p.jumps=0;break;}}
  if(p.y>420){if(this.tour){p.y=FLOOR;p.x+=110;p.vy=0;}else{p.invulnerable=0;this.hurt(2,p.x);if(this.mode!=='dead'){p.x=this.checkpoint;p.y=FLOOR;p.vy=0;p.jumps=0;}}}
  if(p.dash>0&&Math.floor(this.time*60)%3===0){this.ghosts.push({x:p.x,y:p.y,face:p.face,life:.22});}
  const animation=p.invulnerable>.9?'hurt':p.dash>0?'dash':p.cast>0?'cast':!p.grounded?(p.vy<0?'jump':'fall'):direction?'run':'idle';
  if(animation!==p.animation){p.animation=animation;p.animationTime=0;}else p.animationTime+=dt;
  for(const prop of this.props){
   if(prop.type==='checkpoint'&&Math.abs(prop.x-p.x)<30&&Math.abs(p.y-prop.y)<40&&this.checkpoint<prop.x){this.checkpoint=prop.x;p.hp=p.maxHp;prop.state='active';this.notice('Moon shrine kindled. Health restored.');this.event('checkpoint');this.burst(prop.x,prop.y-35,'#61c9c5',25);}
   if(prop.type==='portal'&&this.boss.dead&&Math.abs(prop.x-p.x)<25){this.mode='won';this.clearInput();this.event('win');}
  }
  for(const e of this.enemies){
   if(e.dead||Math.abs(e.x-p.x)>750)continue;e.freeze=Math.max(0,e.freeze-dt);e.hit=Math.max(0,e.hit-dt);
   if(e.freeze<=0){e.phase+=dt;e.face=p.x<e.x?-1:1;if(e.type==='crawler')e.x=e.home+Math.sin(e.phase*.9)*35;
    if(e.type==='wisp'){e.x=e.home+Math.sin(e.phase)*43;e.y=222+Math.sin(e.phase*2)*27;}
    if(e.type==='sentinel'){e.cooldown-=dt;if(e.cooldown<=0&&Math.abs(p.x-e.x)<400){e.cooldown=2.1;const dx=p.x-e.x,dy=p.y-18-(e.y-23),len=Math.hypot(dx,dy);this.shots.push({x:e.x,y:e.y-23,vx:dx/len*130,vy:dy/len*130,spell:'ember',life:4,friendly:false,r:5,damage:1});}}
   }
   if(Math.abs(e.x-p.x)<22&&Math.abs(e.y-p.y)<30)this.hurt(1,e.x);
  }
  const boss=this.boss;boss.active=p.x>2970;
  if(boss.active&&!boss.dead){
   boss.freeze=Math.max(0,boss.freeze-dt);boss.hit=Math.max(0,boss.hit-dt);boss.phase+=dt;boss.cooldown-=dt*(boss.freeze>0?.35:1);
   if(boss.cooldown<=0){boss.cooldown=boss.hp<18?1.4:2;for(let j=-1;j<=1;j++){const dx=p.x-boss.x,dy=p.y-20-(boss.y-38),a=Math.atan2(dy,dx)+j*.18;this.shots.push({x:boss.x,y:boss.y-38,vx:Math.cos(a)*165,vy:Math.sin(a)*165,spell:'ember',damage:1,friendly:false,r:7,life:4});}this.shake=.08;this.event('boss-cast');}
   if(Math.abs(p.x-boss.x)<38&&Math.abs(p.y-boss.y)<70)this.hurt(2,boss.x);
  }
  for(const s of this.shots){
   s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
   if(s.friendly){for(const e of [...this.enemies,...(!boss.dead&&boss.active?[boss]:[])]){if(e.dead)continue;const size=e.type==='warden'?38:18;if(Math.abs(s.x-e.x)<size+s.r&&s.y>e.y-(e.type==='warden'?82:36)-s.r&&s.y<e.y+s.r){this.strike(e,s);s.life=0;break;}}
    if(s.life>0)for(const prop of this.props){if(this.hitProp(prop,s)){s.life=0;break;}}
   }else if(Math.abs(s.x-p.x)<10+s.r&&s.y>p.y-32-s.r&&s.y<p.y+s.r){this.hurt(s.damage,s.x);s.life=0;this.fx('ember-impact',s.x,s.y);}
  }
  this.shots=this.shots.filter(s=>s.life>0&&s.x>-50&&s.x<WORLD+50);
  for(const a of this.effects)a.age+=dt;this.effects=this.effects.filter(a=>a.age<a.life);
  for(const a of this.particles){a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=330*dt;}this.particles=this.particles.filter(a=>a.life>0);
  for(const g of this.ghosts)g.life-=dt;this.ghosts=this.ghosts.filter(g=>g.life>0);
  for(const a of this.loot){a.life-=dt;a.vy+=250*dt;a.y=Math.min(FLOOR-12,a.y+a.vy*dt);if(Math.abs(a.x-p.x)<34&&Math.abs(a.y-p.y+15)<44){a.life=0;this.score+=25;p.hp=Math.min(p.maxHp,p.hp+1);this.event('collect');this.burst(a.x,a.y,'#c8d889',8);}}
  this.loot=this.loot.filter(a=>a.life>0);
  this.camera=clamp(p.x-220,0,WORLD-WIDTH);
  if(this.stress>0&&Math.floor(this.time*60)%4===0){for(let i=0;i<this.stress/20;i++)this.burst(this.camera+this.random()*WIDTH,this.random()*260,['#61c9c5','#ffa85b','#c780a6'][i%3],2);}
 }
 autoplay(dt){
  const p=this.player;this.tourTime+=dt;this.keys.add('right');
  // Guided mode still uses the same physics, spells, collision and combat.
  const ahead=GAPS.find(([a,b])=>p.x>a-48&&p.x<b);
  if(ahead&&(p.grounded||(p.vy>0&&p.jumps<2)))p.jumpBuffer=.12;
  const enemy=this.enemies.find(e=>!e.dead&&e.x>p.x&&e.x-p.x<190);
  if(enemy&&enemy.type==='wisp'&&p.grounded)p.jumpBuffer=.12;
  if(p.x>2970&&!this.boss.dead){this.keys.delete('right');p.face=1;}
  const stage=Math.floor(this.tourTime*2.6);
  if(stage!==this.lastTourShot){this.lastTourShot=stage;p.spell=Math.floor(this.tourTime/3)%3;this.shoot(stage%4===0);}
 }
 state(){const p=this.player;return {coordinates:'world pixels; origin top-left, +x right, +y down; player x=center, y=feet',mode:this.mode,tour:this.tour,seconds:+this.time.toFixed(2),camera:Math.round(this.camera),player:{...p,x:+p.x.toFixed(1),y:+p.y.toFixed(1),spell:SPELLS[p.spell]},checkpoint:this.checkpoint,score:this.score,kills:this.kills,destroyed:this.destroyed,zone:p.x<1100?'Whispering wood':p.x<2400?'Drowned aqueduct':'The moon gate',enemies:this.enemies.filter(e=>!e.dead&&Math.abs(e.x-p.x)<420).map(({type,x,y,hp,freeze})=>({type,x:Math.round(x),y:Math.round(y),hp,frozen:freeze>0})),boss:{hp:this.boss.hp,active:this.boss.active,dead:this.boss.dead},props:this.props.filter(e=>Math.abs(e.x-p.x)<340&&e.type!=='grass').map(({type,x,state,hp})=>({type,x,state,hp})),scorchedGrass:this.props.filter(e=>e.type==='grass'&&e.state==='burned').length,shots:this.shots.map(({x,y,spell,friendly,charged})=>({x:Math.round(x),y:Math.round(y),spell,friendly,charged})),effects:this.effects.length,particles:this.particles.length,stressActors:this.stress,platforms:PLATFORMS.filter(s=>s.x>this.camera-128&&s.x<this.camera+WIDTH),gaps:GAPS.filter(([a,b])=>b>this.camera&&a<this.camera+WIDTH),objective:this.boss.dead?'Enter the portal at x=3440':'Defeat the Warden near x=3215',message:this.messageTime>0?this.message:''};}
}
