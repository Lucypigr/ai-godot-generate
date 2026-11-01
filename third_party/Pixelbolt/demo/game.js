import {World,WIDTH,HEIGHT,FLOOR,GAPS,PLATFORMS,SPELLS} from './world.js';
const $=id=>document.getElementById(id), canvas=$('game'), ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;
const world=new World(), assets={}, reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let ready=false,last=0,accumulator=0,manual=false,frameCount=0,perfTime=0,fps=60,drawCalls=0,audio=null,sound=false,shownMode='',lastHealth='',lastSpell=-1;
const colors={ember:'#ffa85b',frost:'#61c9c5',storm:'#c780a6'};
const names={knight:'Ember knight',fiends:'Forest fiends',warden:'Hollow Warden',terrain:'Earth & stone',relics:'Living relics',spellcraft:'Spellcraft',woodland:'Ancient woodland',wayfarer:'Wayside details',horizon:'Moonlit kingdom'};
async function load(){
 const response=await fetch('./assets/manifest.json');if(!response.ok)throw new Error(`Asset manifest: ${response.status}`);const manifest=await response.json();
 await Promise.all(manifest.map(async item=>{const r=await fetch(`./assets/${item.name}/${item.name}.atlas.json`);if(!r.ok)throw new Error(`Atlas ${item.name}: ${r.status}`);const atlas=await r.json(),image=new Image();image.src=`./assets/${item.name}/${atlas.meta.image}`;await image.decode();assets[item.name]={...item,atlas,image};}));
 buildGallery(manifest);$('asset-count').textContent=`${manifest.length} recipes / ${manifest.reduce((n,a)=>n+a.frames,0)} frames`;ready=true;$('start-btn').disabled=false;$('start-btn').textContent='Begin adventure';$('tour-btn').disabled=false;render();
}
// Atlas animation selection honors each individual frame duration and one-shot endings.
function frameAt(asset,animation,time){
 const a=asset.atlas.animations[animation];if(!a)throw new Error(`Missing animation ${asset.name}/${animation}`);
 let t=a.loop?Math.max(0,time*1000)%a.duration:Math.min(Math.max(0,time*1000),a.duration);
 for(const key of a.frames){const f=asset.atlas.frames[key];if(t<f.duration)return f.frame;t-=f.duration;}
 return asset.atlas.frames[a.frames.at(-1)].frame;
}
function sprite(name,anim,x,y,{time=world.time,scale=1,flip=false,alpha=1}={}){
 const a=assets[name];if(!a)return;const r=frameAt(a,anim,time),w=Math.round(r.w*scale),h=Math.round(r.h*scale);x=Math.round(x);y=Math.round(y);
 ctx.save();ctx.globalAlpha=alpha;if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);x=0;y=0;}ctx.drawImage(a.image,r.x,r.y,r.w,r.h,x,y,w,h);ctx.restore();drawCalls++;
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function background(){
 const c=world.camera,t=world.time;
 // A 256px recipe is scaled with nearest-neighbor filtering behind independent parallax layers.
 sprite('horizon','moonrise',-Math.round(c*.035),-19,{scale:3});
 ctx.fillStyle='#20394b';ctx.fillRect(0,HEIGHT-110,WIDTH,110);
 // Distant trunks and ruins use the same exported art, softened only by scene opacity.
 for(let i=-2;i<12;i++){
  const x=i*145-((c*.18)%145);
  sprite('woodland','oak',x,88+(i%3)*9,{scale:.82,alpha:.16,time:0});
 }
 for(let i=0;i<16;i++){
  const x=i*290-80-c*.48;if(x>WIDTH+160||x< -200)continue;
  sprite('woodland',i%3===1?'ruin':'oak',x,i%3===1?92:45,{scale:i%3===1?1.04:1.32,alpha:i%3===1?.48:.85,time:reducedMotion?0:t*.6+i});
 }
 // Horizontal, hard-edged mist bands preserve the pixel aesthetic.
 rect(0,251,WIDTH,15,'#75969b18');rect(0,272,WIDTH,7,'#b8d2c412');
 for(let i=0;i<19;i++){
  const x=i*215-120-c*.78;if(x>WIDTH+150||x< -240)continue;
  sprite('woodland','shrub',x,135+(i%3)*5,{scale:.9,alpha:.8,time:reducedMotion?0:t});
 }
 // Gentle drifting motes are intentionally sparse during normal play.
 if(!reducedMotion)for(let i=0;i<22;i++){const x=((i*103.17+t*(i%2?3:-2)-c*.3)%WIDTH+WIDTH)%WIDTH,y=94+(i*43%166)+Math.sin(t*.6+i)*9;rect(x,y,1,i%4===0?2:1,i%3?'#96c4bd55':'#c8d88999');}
}
function terrain(){
 const c=world.camera;
 // Water beneath the broken aqueduct. Several independent bands scroll in opposing directions.
 for(const [a,b] of GAPS){if(b<c||a>c+WIDTH)continue;rect(a-c,325,b-a,35,'#235851');rect(a-c,325,b-a,2,'#61c9c5');for(let y=332;y<360;y+=7)for(let j=0;j<5;j++){const x=a+((j*29+world.time*(y%2?12:-9))%(b-a)+(b-a))%(b-a);rect(x-c,y,Math.min(11,b-x),1,'#45627a');}}
 for(let x=Math.floor(c/32)*32;x<c+WIDTH+32;x+=32){
  if(GAPS.some(([a,b])=>x>=a&&x<b))continue;
  const zone=x>2380?'stone':'earth';
  sprite('terrain',zone,x-c,FLOOR,{time:Math.floor(x/32)%4*.2});
  sprite('terrain','stone',x-c,FLOOR+32,{time:Math.floor(x/32)%4*.2});
 }
 for(const p of PLATFORMS){if(p.x>c+WIDTH||p.x+p.w<c)continue;for(let x=p.x;x<p.x+p.w;x+=32)sprite('terrain','platform',x-c,p.y-8,{time:Math.floor(x/32)%3*.2});}
}
function scenery(){
 const c=world.camera;
 for(const x of [70,650,1110,1580,2030,2630,3070]){
  if(x-c>WIDTH+140||x-c< -160)continue;
  sprite('woodland',x===70||x===2030?'oak':'ruin',x-c-80,FLOOR-190,{alpha:x===70?.75:.87,time:reducedMotion?0:world.time});
  if(x!==70&&x!==2030){sprite('wayfarer','banner',x-c-15,FLOOR-145,{time:reducedMotion?0:world.time+x});sprite('wayfarer','lantern',x-c-56,FLOOR-143,{time:reducedMotion?0:world.time});}
 }
 for(let i=0;i<35;i++){
  const x=i*109+38;if(x<c-80||x>c+WIDTH+80||GAPS.some(([a,b])=>x>a&&x<b))continue;
  sprite('wayfarer',['fern','mushrooms','rubble','fern'][i%4],x-c-40,FLOOR-76,{time:reducedMotion?0:world.time+i,scale:i%4===0?.85:1});
 }
 for(const prop of world.props){
  if(prop.x<c-64||prop.x>c+WIDTH+64)continue;
  if(prop.state==='broken'){rect(prop.x-c-14,prop.y-3,28,3,'#1c2e42');for(let j=0;j<5;j++)rect(prop.x-c-14+j*6,prop.y-2-j%3,4,2,prop.type==='crate'?'#674e48':'#80609b');continue;}
  if(prop.type==='vines'&&prop.state==='burned'){rect(prop.x-c-21,prop.y-3,43,3,'#573944');continue;}
  let anim=prop.type;if(prop.type==='grass'&&prop.state==='burned')anim='grass-burned';if(prop.type==='brazier'&&prop.state==='frozen')anim='brazier-frozen';
  if(prop.type==='portal'&&!world.boss.dead){sprite('relics',anim,prop.x-c-32,prop.y-62,{alpha:.32,time:0});continue;}
  sprite('relics',anim,prop.x-c-32,prop.y-62,{time:reducedMotion?0:world.time+prop.x*.013});
  if(prop.type==='checkpoint'&&prop.x<=world.checkpoint){rect(prop.x-c-11,prop.y-4,22,2,'#61c9c5');}
 }
}
function actors(){
 const c=world.camera,t=world.time,p=world.player;
 for(const e of world.enemies){
  if(e.dead||e.x<c-50||e.x>c+WIDTH+50)continue;
  rect(e.x-c-12,e.y-1,24,3,'#111b2988');
  sprite('fiends',e.type,e.x-c-24,e.y-44,{time:e.freeze>0?0:t+e.phase,flip:e.face<0});
  if(e.freeze>0){ctx.globalAlpha=.38;rect(e.x-c-18,e.y-34,36,32,'#61c9c5');ctx.globalAlpha=1;rect(e.x-c-18,e.y-34,36,1,'#a5eef0');rect(e.x-c-18,e.y-34,1,32,'#a5eef0');}
  if(e.hit>0){ctx.globalCompositeOperation='screen';sprite('fiends',e.type,e.x-c-24,e.y-44,{alpha:.6,flip:e.face<0});ctx.globalCompositeOperation='source-over';}
  if(e.hp<e.maxHp){rect(e.x-c-12,e.y-44,24,2,'#111b29');rect(e.x-c-12,e.y-44,24*e.hp/e.maxHp,2,'#c780a6');}
 }
 const b=world.boss;if(!b.dead&&b.x>c-100&&b.x<c+WIDTH+100){sprite('warden',b.cooldown<.6?'attack':'idle',b.x-c-48,b.y-91,{time:b.freeze>0?0:t});if(b.freeze>0){rect(b.x-c-30,b.y-4,60,3,'#a5eef0');}}
 for(const g of world.ghosts)sprite('knight','dash',g.x-c-24,g.y-44,{flip:g.face<0,alpha:g.life*1.9});
 rect(p.x-c-11,p.y-1,24,3,'#111b2966');
 const visible=p.invulnerable<=0||Math.floor(t*14)%2===0;
 if(visible)sprite('knight',p.animation,p.x-c-24,p.y-44,{time:p.animationTime,flip:p.face<0});
 if(p.charging&&p.charge>.15){const x=p.x-c+p.face*20,y=p.y-18,sz=2+Math.round(p.charge*3);rect(x-sz,y-sz,sz*2,sz*2,colors[SPELLS[p.spell]]);rect(x-1,y-1,3,3,'#eaf1ce');if(p.charge>.7){rect(p.x-c-12,p.y-49,24,2,'#111b29');rect(p.x-c-12,p.y-49,24*p.charge,2,colors[SPELLS[p.spell]]);}}
 for(const s of world.shots){const scale=s.charged?1.2:.63;sprite('spellcraft',s.spell,s.x-c-32*scale,s.y-32*scale,{scale,flip:s.vx<0,time:t});}
 for(const a of world.loot)sprite('spellcraft','rune',a.x-c-32,a.y-32+Math.sin(t*4)*2,{time:t});
 for(const a of world.effects)sprite('spellcraft',a.name,a.x-c-32,a.y-32,{time:a.age});
 for(const a of world.particles){ctx.globalAlpha=Math.min(1,a.life*2);rect(a.x-c,a.y,a.size,a.size,a.color);}ctx.globalAlpha=1;
 if(world.stress){for(let i=0;i<world.stress;i++){const x=(i*67.13+t*(18+i%14))%700-30,y=90+(i*37%205)+Math.sin(t+i)*12;sprite(i%4?'fiends':'spellcraft',i%4?'wisp':SPELLS[i%3],x,y,{time:t+i*.27,scale:.5,alpha:.58,flip:i%2===0});}}
}
function render(){
 if(!ready){rect(0,0,WIDTH,HEIGHT,'#20394b');return;}drawCalls=0;ctx.save();
 if(world.shake>0&&!reducedMotion){const n=Math.sin(world.time*231)*world.shake*12;ctx.translate(Math.round(n),Math.round(-n*.6));}
 background();scenery();terrain();actors();
 // Foreground ferns anchor the camera without obscuring collision surfaces.
 for(let i=-1;i<4;i++)sprite('woodland','shrub',i*265-((world.camera*1.14)%265),189,{scale:.92,alpha:.42,time:0});
 if(world.flash>0&&!reducedMotion){ctx.globalAlpha=world.flash;rect(0,0,WIDTH,HEIGHT,'#eaf1ce');ctx.globalAlpha=1;}ctx.restore();
 updateUI();
}
function updateUI(){
 const p=world.player,state=world.mode;
 $('hud').hidden=state==='title';$('zone').textContent=p.x<1100?'Whispering wood':p.x<2400?'Drowned aqueduct':'The moon gate';
 if(lastHealth!==p.hp){$('health').replaceChildren(...Array.from({length:p.maxHp},(_,i)=>{const el=document.createElement('i');el.className=i>=p.hp?'empty':'';return el;}));$('health').setAttribute('aria-label',`${p.hp} of ${p.maxHp} health`);lastHealth=p.hp;}
 if(lastSpell!==p.spell){$('spell-name').textContent=SPELLS[p.spell][0].toUpperCase()+SPELLS[p.spell].slice(1);$('spell-name').style.color=colors[SPELLS[p.spell]];document.querySelectorAll('[data-spell]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.spell===p.spell)));lastSpell=p.spell;}
 $('score').textContent=`${world.score} runes`;$('pause').textContent=state==='paused'?'Resume':'Pause';
 $('boss-bar').hidden=!world.boss.active||world.boss.dead;$('boss-health').style.width=`${Math.max(0,world.boss.hp/world.boss.maxHp*100)}%`;
 const text=world.messageTime>0&&state==='playing'?world.message:'';if($('toast').textContent!==text)$('toast').textContent=text;$('toast').classList.toggle('visible',!!text);
 if(shownMode!==state){
  shownMode=state;$('overlay').hidden=state==='playing';
  const configs={title:['Beyond the old kingdom','Carry the last<br>ember home.','Cross the moonlit ruins. Burn the vines, freeze the flames, and wake the stone Warden.','Begin adventure'],paused:['A moment by the fire','The forest can wait.','Your journey is paused. Take a breath, then pick up where you left off.','Resume adventure'],dead:['The ember still glows','Rise from the ashes.','Return to your last moon shrine with restored health. The forest remembers your path.','Try again'],won:['Dawn comes at last','The ember is home.',`The Warden is silent. You gathered ${world.score} runes and changed ${world.destroyed} pieces of the world.`,'Play again']};
  if(configs[state]){const [eye,title,copy,button]=configs[state];$('menu-eyebrow').textContent=eye;$('menu-title').innerHTML=title;$('menu-copy').textContent=copy;$('start-btn').textContent=button;$('tour-btn').hidden=state==='paused'||state==='dead';$('menu-note').textContent=state==='won'?`${world.kills} foes defeated · ${Math.floor(world.time/60)}m ${Math.floor(world.time%60)}s`:'A short adventure. Headphones welcome.';}
 }
}
function soundEvent(event){
 if(!sound||!audio)return;const sounds={cast:[440,.07,'triangle'],charge:[150,.22,'sawtooth'],jump:[300,.09,'sine'],dash:[120,.08,'triangle'],hurt:[80,.17,'sawtooth'],impact:[95,.05,'triangle'],break:[210,.14,'triangle'],collect:[740,.1,'sine'],checkpoint:[520,.35,'sine'],freeze:[900,.14,'sine'],boss:[65,.5,'sawtooth'],win:[880,.45,'sine']};const spec=sounds[event];if(!spec)return;
 const [freq,duration,type]=spec,osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*(event==='jump'?2:.45),audio.currentTime+duration);gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
}
function step(dt){world.update(dt);for(const e of world.events.splice(0))soundEvent(e);}
function tick(now){
 const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
 if(!manual){accumulator+=dt;while(accumulator>=1/60){step(1/60);accumulator-=1/60;}}
 render();frameCount++;perfTime+=dt;if(perfTime>=.6){fps=Math.round(frameCount/perfTime);frameCount=0;perfTime=0;$('performance').textContent=`${fps} fps / ${drawCalls} draws${world.stress?` / ${world.stress} extra sprites`:''}`;}requestAnimationFrame(tick);
}
const keymap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',KeyW:'jump',ArrowUp:'jump',KeyJ:'fire',KeyZ:'fire',KeyB:'fire',ShiftLeft:'dash',ShiftRight:'dash',KeyK:'dash',KeyX:'dash',KeyE:'spell',KeyQ:'spell',KeyP:'pause',Escape:'pause'};
function isControl(target){return target instanceof Element&&!!target.closest('button,select,a,input,textarea');}
window.addEventListener('keydown',event=>{
 if(isControl(event.target))return;
 if(event.code==='Enter'&&world.mode!=='playing'){event.preventDefault();begin();return;}
 if(event.code==='KeyF'){event.preventDefault();if(!event.repeat)fullscreen();return;}
 if(event.code==='KeyM'){if(!event.repeat)toggleSound();return;}
 if(['Digit1','Digit2','Digit3'].includes(event.code)){world.player.spell=+event.code.slice(-1)-1;return;}
 const key=keymap[event.code];if(key){event.preventDefault();world.press(key);}
});
window.addEventListener('keyup',event=>{const key=keymap[event.code];if(key){if(!isControl(event.target))event.preventDefault();world.release(key);}});
window.addEventListener('blur',()=>{world.clearInput();if(world.mode==='playing')world.mode='paused';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){world.clearInput();if(world.mode==='playing')world.mode='paused';}});
function begin(){if(!ready)return;if(world.mode==='paused'){world.mode='playing';}else if(world.mode==='dead'){world.respawn();}else{world.start();world.stress=+$('stress').value;}canvas.focus({preventScroll:true});if(audio)audio.resume();render();}
$('start-btn').addEventListener('click',begin);
$('tour-btn').addEventListener('click',()=>{world.start(true);world.stress=+$('stress').value;canvas.focus({preventScroll:true});render();});
$('restart').addEventListener('click',()=>{world.start();world.stress=+$('stress').value;canvas.focus({preventScroll:true});render();});
$('pause').addEventListener('click',()=>{world.press('pause');world.release('pause');canvas.focus({preventScroll:true});render();});
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game-shell').requestFullscreen();canvas.focus({preventScroll:true});}catch{world.notice('Fullscreen is unavailable in this browser.');}}
$('fullscreen').addEventListener('click',fullscreen);
function toggleSound(){sound=!sound;if(sound){audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();soundEvent('collect');}$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound));canvas.focus({preventScroll:true});}
$('sound').addEventListener('click',toggleSound);
document.querySelectorAll('[data-spell]').forEach(button=>button.addEventListener('click',()=>{world.player.spell=+button.dataset.spell;canvas.focus({preventScroll:true});render();}));
$('stress').addEventListener('change',event=>{world.stress=+event.target.value;canvas.focus({preventScroll:true});});
document.querySelectorAll('[data-key]').forEach(button=>{
 button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);world.press(button.dataset.key);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>world.release(button.dataset.key));
});
function buildGallery(manifest){
 for(const item of manifest){const button=document.createElement('button'),img=document.createElement('img');img.src=`./assets/${item.name}/${item.animations[0]}.png`;img.alt='';if(reducedMotion)img.src=`./assets/${item.name}/${item.name}.png`;button.append(img,document.createTextNode(names[item.name]));button.dataset.asset=item.name;button.addEventListener('click',()=>selectAsset(item));$('asset-list').append(button);}
 selectAsset(manifest[0]);
}
let selectedAsset;
function selectAsset(item){selectedAsset=item;$('asset-title').textContent=names[item.name];$('asset-meta').textContent=`${item.width} × ${item.height} px / ${item.frames} frames`;document.querySelectorAll('[data-asset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.asset===item.name)));$('animation').replaceChildren(...item.animations.map(a=>{const option=document.createElement('option');option.value=a;option.textContent=a.replaceAll('-',' ');return option;}));$('recipe-link').href=`./recipes/${item.name}.json`;$('bundle-link').href=`./assets/${item.name}/bundle.zip`;$('sheet-link').href=`./assets/${item.name}/contact.png`;showAnimation();}
function showAnimation(){const a=selectedAsset;$('sprite-preview').src=reducedMotion?`./assets/${a.name}/contact.png`:`./assets/${a.name}/${$('animation').value}.png`;$('sprite-preview').alt=`${names[a.name]}: ${$('animation').value.replaceAll('-',' ')} animation`;$('sprite-preview').style.width=`${Math.min(512,a.width*4)}px`;}
$('animation').addEventListener('change',showAnimation);
window.render_game_to_text=()=>JSON.stringify({...world.state(),render:{fps,drawCalls,ready}});
window.advanceTime=ms=>{manual=true;for(let i=0;i<Math.max(1,Math.round(ms/(1000/60)));i++)step(1/60);render();};
// A read-only state hook and deterministic stepping are useful to agents and browser tests.
load().catch(error=>{$('start-btn').textContent='Assets could not load';$('menu-copy').textContent=`${error.message}. Serve the demo folder over HTTP, then reload.`;console.error(error);});
requestAnimationFrame(tick);
