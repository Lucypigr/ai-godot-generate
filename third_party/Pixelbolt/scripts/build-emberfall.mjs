/** Original Emberfall art, authored as Pixelbolt recipes. No image library or model. */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createBundle, createZip, inspectProject, encodePNG } from '../src/index.js';

const root = fileURLToPath(new URL('../demo/', import.meta.url));
const force = process.argv.includes('--force');
const palette = { k:'#111b29', n:'#1c2e42', s:'#2d4560', b:'#45627a', a:'#75969b', h:'#b8d2c4', w:'#eaf1ce', t:'#235851', g:'#39836c', l:'#72b888', y:'#c8d889', c:'#61c9c5', i:'#a5eef0', v:'#51446e', p:'#80609b', r:'#c780a6', d:'#573944', e:'#ac5049', o:'#e5804f', f:'#ffa85b', z:'#ffe2a0', q:'#674e48', u:'#977858' };
const R=(x,y,w,h,color,filled=true)=>({op:'rect',x,y,w,h,color,filled});
const E=(x,y,w,h,color,filled=true)=>({op:'ellipse',x,y,w,h,color,filled});
const L=(x,y,x2,y2,color)=>({op:'line',x,y,x2,y2,color});
const P=(x,y,color)=>({op:'pixel',x,y,color});
const S=(symbol,x,y,extra={})=>({op:'stamp',symbol,x,y,...extra});
const poly=(points,color)=>{
  const out=[];
  for(let y=Math.min(...points.map(p=>p[1]));y<=Math.max(...points.map(p=>p[1]));y++){
    const xs=[];
    for(let j=0;j<points.length;j++){const a=points[j],b=points[(j+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
    xs.sort((a,b)=>a-b); for(let j=0;j+1<xs.length;j+=2)out.push(L(Math.ceil(xs[j]),y,Math.floor(xs[j+1]),y,color));
  }return out;
};
let seed=731;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const noise=(x,y,w,h,n,colors)=>Array.from({length:n},()=>P(x+Math.floor(rand()*w),y+Math.floor(rand()*h),colors[Math.floor(rand()*colors.length)]));
const make=(name,width,height,symbols={})=>({version:1,name,width,height,palette,symbols,frames:[],animations:{},sheet:{columns:8,padding:1,scale:1}});
function seq(recipe,name,count,draw,duration=100,loop=true){
  const frames=[];
  for(let i=0;i<count;i++){const id=`${name}-${i}`;frames.push(id);recipe.frames.push({name:id,duration:Array.isArray(duration)?duration[i%duration.length]:duration,...draw(i)});}
  recipe.animations[name]={frames,loop};
}
const recipes=[];

// The knight is assembled from reusable, hand-designed armor/helmet grids.
const hero=make('knight',48,48,{
 helmet:['.....kkkkkkk...','...kkhhhhhwwk..','..khhwwwwwwwwk.','..khhwhhhhhhhwk','..khhkkkkkkkkkk','..khhknnnnczwk.','..khhknnnnczwk.','...khhkkkkkkk..','....khhhhhk....','.....kkkkk.....'],
 armor:['...kkkkkkkk....','..khhhhwwwwk...','.khwwhhhhhhhk..','khwhhwwwwhhhhk.','khhhhwyywhhhhk.','.khhhwyywhhhk..','..khhhhhhhhk...','..kbbhhhhbbk...','..kkbbbbbbkk...','...kuuuuuk.....'],
 boot:['kkkkk.','kbbhk.','kbbhk.','kbhhk.','kbbhkk','knnnnk','kkkkkk'],
 hand:['.kkkk..','khhhwk.','khhwwk.','.khhk..','..kk...']
});
function knightPose(phase,kind){
  const bob=kind==='run'?(phase%4<2?0:1):kind==='idle'?(phase>=3?1:0):0;
  const crouch=kind==='dash'?7:0, shoot=kind==='cast', air=kind==='jump'||kind==='fall';
  const stride=kind==='run'?Math.round(Math.sin(phase*Math.PI/4)*5):air?3:0;
  const cape=poly([[20,18+bob],[17,21],[7+(phase%3),32+crouch],[3+(phase%4),35+crouch],[13,36],[23,28]],'k');
  cape.push(...poly([[19,20+bob],[16,22],[9,31+crouch],[6+(phase%3),33+crouch],[14,33],[21,27]],'t'),L(14,25,9,31+crouch,'g'),L(15,27,11,33,'c'));
  const legs=[S('boot',19-stride,35-(air?4:0)),S('boot',26+stride,35-(air?1:0)),R(20-stride,32,5,5,'s'),R(26+stride,32,5,5,'a')];
  const body=[S('armor',17,23+bob+crouch),S('helmet',19,11+bob+crouch),R(18,21+bob+crouch,13,3,'t'),L(21,21+bob+crouch,30,21+bob+crouch,'c'),L(26,10+bob+crouch,26,14+bob+crouch,'u'),L(27,10+bob+crouch,27,14+bob+crouch,'z'),P(25,26+bob+crouch,'z'),P(22,28+bob+crouch,'a')];
  body.unshift(...poly([[26,11+bob+crouch],[25,6+bob+crouch],[21-phase%2,5+bob+crouch],[18-phase%3,9+bob+crouch],[23,8+bob+crouch],[24,12+bob+crouch]],'e'),L(21,6+bob+crouch,24,7+bob+crouch,'f'));
  const arm=shoot?[R(30,25,10,5,'k'),R(30,26,8,3,'a'),S('hand',37,24),R(40,24,4,5,'f'),P(42,24,'z')]:[S('hand',29+(stride>0?2:0),29+bob+crouch)];
  return {layers:[{name:'cloak',ops:cape},{name:'legs',ops:legs},{name:'armor',ops:body},{name:'gauntlet',ops:arm}]};
}
seq(hero,'idle',6,i=>knightPose(i,'idle'),[150,150,150,150,150,550]);
seq(hero,'run',8,i=>knightPose(i,'run'),75);
seq(hero,'jump',3,i=>knightPose(i,'jump'),100,false);
seq(hero,'fall',3,i=>knightPose(i,'fall'),110);
seq(hero,'cast',4,i=>knightPose(i,'cast'),[65,65,90,120],false);
seq(hero,'dash',6,i=>knightPose(i,'dash'),45,false);
seq(hero,'hurt',3,i=>({from:'idle-0',ops:i%2?[{op:'replace',from:'h',to:'r'},{op:'replace',from:'w',to:'z'}]:[]}),90,false);
recipes.push(hero);

const fiends=make('fiends',48,48);
seq(fiends,'crawler',8,i=>{
 const bob=i%4<2?0:1, ops=[E(9,18+bob,30,22,'k'),E(11,19+bob,26,17,'t'),E(13,19+bob,21,10,'g'),E(15,19+bob,15,4,'l')];
 for(let j=0;j<4;j++){const x=12+j*7,y=36+Math.round(Math.sin(i*Math.PI/4+j)*2);ops.push(R(x,y,5,5,'k'),R(x+1,y,3,3,'s'));}
 ops.push(...poly([[11,23],[8,13],[18,20]],'k'),...poly([[12,21],[10,15],[17,21]],'u'),...poly([[30,20],[38,12],[36,25]],'k'),L(33,21,36,16,'h'),R(28,25+bob,8,7,'k'),R(29,26+bob,3,2,'f'),P(31,26+bob,'z'),L(30,33,36,32,'l'));
 return {ops};
},90);
seq(fiends,'wisp',8,i=>{const wing=Math.round(Math.sin(i*Math.PI/4)*8);return {ops:[...poly([[21,21],[5,13+wing],[2,20+wing],[10,25],[17,30],[23,27]],'k'),...poly([[20,22],[6,16+wing],[10,23],[18,27]],'v'),...poly([[27,21],[43,13+wing],[46,20+wing],[38,25],[31,30],[25,27]],'k'),...poly([[28,22],[42,16+wing],[38,23],[30,27]],'p'),E(18,17,14,18,'k'),E(20,19,10,13,'v'),R(21,23,3,3,'r'),R(27,23,3,3,'r'),P(22,23,'z'),P(28,23,'z'),L(23,30,27,30,'a'),L(20,18,20,14,'p'),L(29,18,30,14,'p')]};},85);
seq(fiends,'sentinel',6,i=>{const y=i>2?1:0;return {ops:[E(14,9+y,23,15,'k'),R(16,16+y,19,24,'k'),R(18,22+y,15,16,'v'),R(19,24+y,12,2,'p'),R(20,28+y,12,2,'s'),R(16,39,7,5,'k'),R(29,39,7,5,'k'),R(14,12+y,22,10,'s'),R(17,13+y,17,3,'a'),R(19,17+y,13,4,'k'),R(27,18+y,5,2,'f'),R(10,25+y,9,11,'k'),R(11,27+y,7,7,'b'),R(34,26+y,8,6,'k'),R(35,27+y,6,4,'u'),R(39,20+y,3,17,'k'),L(40,21+y,40,35+y,'y'),P(40,22+y,'w')]};},180);
recipes.push(fiends);

const boss=make('warden',96,96);
seq(boss,'idle',6,i=>warden(i,false),180);
seq(boss,'attack',8,i=>warden(i,true),100,false);
function warden(i,attack){
 const bob=i%4<2?0:1,arm=attack?Math.round(Math.sin(i/7*Math.PI)*12):0;
 const ops=[...poly([[28,43],[20,58],[16,82],[31,77],[48,88],[72,78],[80,84],[76,59],[66,42]],'k'),...poly([[31,45],[25,61],[24,77],[43,77],[48,85],[69,75],[72,58],[65,45]],'v'),L(34,54,30,75,'p'),L(63,51,69,74,'p'),R(29,73,13,17,'k'),R(54,73,13,17,'k'),R(28,86,16,6,'s'),R(52,86,18,6,'s'),E(23,30+bob,52,46,'k'),E(26,33+bob,46,37,'s'),E(30,34+bob,37,10,'a'),R(30,49+bob,34,15,'b'),L(35,53,62,53,'a'),E(40,44+bob,18,23,'k'),E(42,46+bob,14,18,attack?'e':'t'),E(46,49+bob,6,12,attack?'f':'c'),P(48,50+bob,'w'),E(32,13+bob,35,28,'k'),R(35,15+bob,28,19,'s'),R(37,16+bob,23,4,'h'),R(38,25+bob,23,8,'k'),R(39,26+bob,8,3,'f'),R(53,26+bob,8,3,'f'),L(47,19,47,24,'b'),L(51,19,51,24,'b'),...poly([[33,20],[24,4],[27,21],[36,27]],'u'),...poly([[64,20],[75,4],[72,23],[62,28]],'y'),R(15,39-arm,15,27,'k'),R(17,41-arm,10,22,'b'),L(18,43-arm,18,59-arm,'a'),R(70,39-arm,15,27,'k'),R(72,41-arm,10,22,'b'),R(13,60-arm,19,13,'k'),R(15,62-arm,15,8,'s'),R(69,60-arm,19,13,'k'),R(71,62-arm,15,8,'s')];
 for(const x of [18,73]){ops.push(R(x,43-arm,8,2,'h'),R(x+2,49-arm,5,9,'s'),L(x+2,53-arm,x+6,53-arm,'a'),L(x+4,51-arm,x+4,56-arm,'a'),P(x+1,45-arm,'u'));}
 ops.push(L(32,39+bob,39,43+bob,'u'),L(59,43+bob,65,39+bob,'u'),L(35,66,41,70,'a'),L(58,68,64,63,'a'),L(34,77,37,83,'b'),L(58,77,61,83,'b'),L(16,66-arm,28,66-arm,'b'),L(72,66-arm,84,66-arm,'b'));
 return {ops};
}
recipes.push(boss);

const tiles=make('terrain',32,32);
for(const [name,base,top] of [['earth','q','g'],['stone','s','a'],['scorched','n','d'],['frozen','b','c']]){
 seq(tiles,name,4,i=>{const ops=[R(0,0,32,32,'k'),R(0,4,32,28,base)];for(let y=6;y<32;y+=9)for(let x=-8+(y%2)*9;x<32;x+=17){const xx=Math.max(0,x),ww=Math.min(15,32-xx);ops.push(R(xx,y,ww,7,name==='earth'?'d':name==='stone'?'b':base),L(xx,y,xx+ww-1,y,name==='frozen'?'i':name==='stone'?'a':'u'));}ops.push(R(0,0,32,3,top),R(0,3,32,2,name==='earth'?'t':base));if(name==='earth')for(let j=0;j<12;j++){const x=(j*7+i*3)%32;ops.push(L(x,1,x,4+(j%4),'g'),P(x,0,'l'));}ops.push(...noise(1,9,30,22,22,[base,'k',base]));return {ops};},200);
}
// Replace regular masonry with irregular earth/roots for the forest floor.
for(let i=0;i<4;i++){
 const ops=[R(0,0,32,32,'n'),R(0,4,32,28,'d'),R(0,3,32,4,'q')];
 for(let j=0;j<9;j++){const x=(j*11+i*3)%29,y=8+(j*7+i*5)%19;ops.push(E(x,y,Math.min(32-x,4+j%4),3+j%3,j%3?'q':'n'),L(x,y,x+Math.min(3,31-x),y,'u'));}
 ops.push(L(3,5,7,12,'q'),L(7,12,5,21,'q'),L(7,12,13,16,'q'),L(23,5,25,13,'q'),L(25,13,21,18,'q'),R(0,1,32,3,'t'));
 for(let j=0;j<16;j++){const x=j*2;ops.push(L(x,0,x,2+j%4,'g'),P(x,0,j%3?'l':'y'));}
 ops.push(...noise(0,7,32,25,22,['n','d','q']));tiles.frames[i].ops=ops;
}
seq(tiles,'platform',3,i=>({ops:[R(0,8,32,13,'k'),R(0,9,32,4,'a'),R(1,13,30,6,'s'),L(2,10,29,10,'h'),R(5,19,5,4,'b'),R(21,19,5,4,'b'),R(0,7,32,2,'t'),...noise(0,7,32,4,18,['g','l','t'])]}),200);
recipes.push(tiles);

const props=make('relics',64,64);
seq(props,'brazier',6,i=>({ops:[E(19,58,28,4,'k'),R(28,41,9,18,'k'),R(30,43,5,14,'b'),...poly([[17,36],[20,43],[45,43],[49,36]],'k'),R(20,36,27,3,'u'),L(22,37,44,37,'y'),...poly([[23,35],[21,27],[28,17+i%3],[29,25],[35,10+i%4],[37,23],[42,20],[43,32],[39,36]],'e'),...poly([[26,35],[26,28],[31,24],[34,17+i%3],[37,29],[39,28],[39,35]],'f'),...poly([[30,35],[31,30],[34,26],[36,35]],'z'),P(25+i*3,12+i%3,'f')]}),100);
seq(props,'brazier-frozen',1,()=>({from:'brazier-0',ops:[{op:'clear',x:18,y:6,w:32,h:31},...poly([[22,36],[24,16],[29,23],[34,8],[40,24],[44,17],[44,36]],'b'),...poly([[25,35],[26,20],[30,27],[34,12],[37,27],[40,24],[42,35]],'c'),L(34,16,34,30,'w'),L(27,26,30,32,'i')]}));
seq(props,'crystal',6,i=>({ops:[E(13,57,39,5,'k'),...poly([[14,56],[9,35],[16,29],[27,55]],'n'),...poly([[20,56],[20,20],[32,7],[43,21],[40,56]],'k'),...poly([[23,54],[23,21],[32,11],[39,22],[37,53]],'v'),...poly([[24,22],[32,12],[31,51],[24,53]],'p'),...poly([[32,12],[38,22],[36,51],[32,54]],'r'),L(25,23,25,43,'h'),...poly([[36,55],[46,33],[52,32],[49,52]],'p'),L(46,39,43,50,'r'),P(28+(i%3)*3,20+i*4,'w')]}),150);
seq(props,'crate',1,()=>({ops:[R(16,33,34,28,'k'),R(18,35,30,24,'q'),R(19,36,28,2,'u'),R(19,55,28,2,'u'),R(19,38,3,17,'u'),R(44,38,3,17,'u'),L(24,38,42,54,'k'),L(24,39,41,54,'u'),L(25,55,42,38,'u'),P(20,37,'z'),P(45,37,'z'),P(20,56,'z'),P(45,56,'z')]}));
seq(props,'vines',4,i=>{const ops=[];for(let j=0;j<5;j++){const x=13+j*8;ops.push(L(x,3,x+(j%2?3:-3),59,'t'),L(x+1,3,x+1,60,'g'));for(let y=10;y<60;y+=11)ops.push(E(x-4+(i%2),y,9,5,j%2?'g':'l'),P(x-2,y,'y'));}return {ops};},220);
seq(props,'grass',4,i=>{const ops=[];for(let j=0;j<16;j++){const x=5+j*3;ops.push(L(x,61,x-3+i%3,49-j%7,j%3?'t':'g'),L(x+1,61,x+4,54-j%5,'g'),P(x-3+i%3,49-j%7,'l'));}return {ops};},180);
seq(props,'grass-burned',1,()=>({ops:[E(6,60,47,3,'n'),...Array.from({length:14},(_,j)=>L(8+j*3,61,7+j*3,57-j%4,j%2?'d':'e'))]}));
seq(props,'checkpoint',6,i=>({ops:[E(10,59,46,4,'k'),R(17,55,33,6,'s'),R(23,49,22,7,'b'),R(27,22,13,29,'k'),R(29,24,9,25,'s'),R(30,24,3,24,'a'),...poly([[22,23],[22,15],[33,4],[45,15],[45,23],[34,33]],'k'),...poly([[25,21],[25,16],[33,8],[42,16],[42,22],[34,29]],'t'),E(29,13+(i>2?1:0),10,11,'c'),E(32,15+(i>2?1:0),4,7,'w'),L(20,56,47,56,'h')]}),160);
seq(props,'portal',8,i=>({ops:[E(6,5,52,58,'k'),E(9,8,46,54,'b'),E(14,11,36,50,'n'),E(17,13,30,46,'v'),E(20,17,24,38,'p'),E(24,22,16,28,'c'),E(29,25,7,22,'i'),R(4,58,56,6,'s'),L(7,59,54,59,'a'),...Array.from({length:7},(_,j)=>{const an=(j/7+i/16)*Math.PI*2;return R(31+Math.round(Math.cos(an)*20),33+Math.round(Math.sin(an)*23),2,3,'z');})]}),100);
recipes.push(props);

const fx=make('spellcraft',64,64);
for(const [name,outer,mid,inner] of [['ember','e','f','z'],['frost','b','c','i'],['storm','v','r','w']]){
 seq(fx,name,6,i=>({ops:[...poly([[9,31],[15,26+i%3],[29,28],[37,24],[46,28],[50,32],[46,37],[36,40],[28,36],[13,37-i%3]],outer),E(26,26,23,13,mid),E(35,28,12,8,inner),R(18,30,11,3,mid),P(7+i*2,29,mid)]}),65);
 seq(fx,`${name}-impact`,8,i=>{const r=4+i*3,ops=[];if(i<5)ops.push(E(32-r,32-r,r*2,r*2,outer),E(35-r,35-r,Math.max(1,r*2-6),Math.max(1,r*2-6),mid,i<2));for(let j=0;j<8;j++){const a=j*Math.PI/4;const x=32+Math.round(Math.cos(a)*(r+4)),y=32+Math.round(Math.sin(a)*(r+4));ops.push(R(x,y,i<5?3:1,i<5?3:1,i%2?mid:inner));}if(i<3)ops.push(E(27,27,11,11,inner));return {ops};},[35,45,50,60,65,75,80,90],false);
}
seq(fx,'dust',7,i=>({ops:Array.from({length:6},(_,j)=>E(13+j*6,43-Math.floor(i*1.4)-j%3,Math.max(2,8-i),Math.max(2,6-i),i<3?'a':'s'))}),60,false);
seq(fx,'shatter',8,i=>({ops:Array.from({length:11},(_,j)=>{const a=j*.71;return R(30+Math.round(Math.cos(a)*(6+i*2)),30+Math.round(Math.sin(a)*(6+i*2))+Math.floor(i*i/8),3-i%3,3-i%2,j%2?'h':'p');})}),65,false);
seq(fx,'rune',8,i=>({ops:[...poly([[32,19-i%2],[40,30],[32,42+i%2],[24,30]],'k'),...poly([[32,22],[37,30],[32,38],[27,30]],'y'),L(32,25,32,34,'w'),P(32,36,'u')]}),100);
recipes.push(fx);

const scenery=make('woodland',160,192);
function tree(offset){
 const savedSeed=seed;seed=377;
 const ops=[...poly([[77,37],[90,40],[90,117],[107,171],[127,187],[91,181],[80,167],[65,183],[35,186],[60,168],[72,114]],'k'),...poly([[80,47],[87,47],[82,124],[98,174],[111,182],[87,176],[77,153],[66,176],[48,182],[66,161],[75,108]],'n'),L(80,75,78,150,'s'),L(79,153,90,176,'s'),L(77,131,67,170,'b'),L(75,95,45,57,'k'),L(83,109,113,72,'k')];
 // One connected, jagged canopy; small leaf clusters follow its volume.
 const silhouette=[[15,62],[9,52],[18,43],[16,36],[31,32],[29,22],[42,20],[44,11],[60,13],[67,5],[82,9],[90,7],[105,16],[117,15],[123,27],[137,33],[136,44],[148,50],[142,63],[149,68],[137,76],[135,85],[121,85],[113,96],[99,91],[87,100],[73,92],[61,98],[47,91],[36,92],[30,81],[18,81],[21,72]];
 ops.push(...poly(silhouette.map(([x,y])=>[x+offset,y]),'k'));
 ops.push(...poly(silhouette.map(([x,y])=>[Math.round(79+(x-79)*.94)+offset,Math.round(53+(y-53)*.93)]),'t'));
 const clusters=[[45,19,34,25],[73,14,32,24],[98,26,33,30],[24,40,33,29],[51,37,43,31],[90,49,43,29],[40,63,36,25],[73,69,31,22]];
 for(const [x,y,w,h] of clusters){ops.push(...poly([[x,y+10],[x+7,y+4],[x+14,y+5],[x+20,y],[x+w-4,y+8],[x+w,y+17],[x+w-7,y+h],[x+8,y+h-3],[x,y+h-10]].map(([a,b])=>[a+offset,b]),'g'));
  for(let j=0;j<11;j++){const xx=x+4+Math.floor(rand()*(w-10))+offset,yy=y+8+Math.floor(rand()*(h-14));ops.push(L(xx,yy,xx+3,yy,j%3?'t':'l'),P(xx+1,yy-1,j%3?'g':'l'));}
  ops.push(L(x+12+offset,y+5,x+16+offset,y+5,'l'),L(x+8+offset,y+7,x+12+offset,y+7,'l'));
 }
 for(let j=0;j<9;j++){const x=45+j*8,y=88-j%3*4;ops.push(L(x,y,x-3,y+7,'t'),E(x-6,y+5,5,3,'g'));}
 ops.push(L(114,91,113,121,'t'),L(115,96,116,116,'g'),L(31,83,32,110,'t'),L(34,89,34,105,'g'));
 seed=savedSeed;return ops;
}
seq(scenery,'oak',3,i=>({ops:tree(i===1?1:0)}),400);
seq(scenery,'ruin',1,()=>{const ops=[];ops.push(R(27,39,24,147,'k'),R(111,31,24,155,'k'),R(30,41,18,143,'s'),R(114,33,18,152,'s'),R(25,39,30,10,'b'),R(108,29,30,10,'b'),R(31,50,5,129,'b'),R(116,40,5,139,'b'),R(24,179,33,9,'b'),R(108,179,31,9,'b'));for(let y=59;y<180;y+=19){ops.push(L(32,y,46,y,'k'),L(115,y-6,131,y-6,'k'));}ops.push(...poly([[26,40],[36,16],[59,5],[85,2],[109,10],[133,31],[119,36],[102,20],[80,16],[60,19],[48,28],[42,44]],'s'),L(54,15,76,8,'a'),L(85,9,107,17,'a'),R(72,4,12,9,'b'),L(34,49,35,73,'g'),L(118,39,123,78,'t'),L(36,51,36,67,'l'));return {ops};});
{
 const ops=scenery.frames.find(f=>f.name==='ruin-0').ops;
 for(const x of [32,116])for(let y=58;y<174;y+=19){ops.push(L(x,y+1,x+12,y+1,'b'),L(x+11,y+1,x+11,y+16,'n'),P(x+8,y+6,'b'),L(x+3,y+11,x+5,y+14,'n'));}
 for(let i=0;i<9;i++){const x=45+i*8,y=10+Math.round((i-4)**2*.9);ops.push(L(x,y,x-2,y+8,'n'),P(x+1,y,'h'));}
 ops.push(R(24,43,30,2,'a'),R(109,33,29,2,'a'),R(24,180,33,2,'a'),R(108,180,31,2,'a'),L(43,82,39,90,'n'),L(39,90,44,97,'n'),L(43,85,47,86,'n'),L(123,114,126,121,'n'),L(126,121,122,128,'n'));
 for(let j=0;j<14;j++){const y=49+j*8,x=32+Math.round(Math.sin(j*.7)*4);ops.push(L(x,y,x+2,y+8,'t'),E(x-3,y+1,7,3,j%3?'g':'l'));}
 for(let j=0;j<9;j++){const x=112+j*2,y=37+j*7;ops.push(E(x,y,6,3,'t'),L(x+2,y,x+3,y+7,'g'));}
}
seq(scenery,'shrub',2,i=>({ops:[E(10,159,74,30,'n'),E(44,152,95,38,'t'),E(57,152,69,15,'g'),...noise(20,169,111,16,110,['t','g','l']),...Array.from({length:8},(_,j)=>R(25+j*14,164+j%3+i,2,3,j%2?'r':'y'))]}),450);
recipes.push(scenery);

const details=make('wayfarer',80,80);
seq(details,'fern',4,i=>{const ops=[];for(let j=0;j<9;j++){const tipX=8+j*8,tipY=44-Math.round(Math.sin(j/8*Math.PI)*26);ops.push(L(40,76,tipX+i%2,tipY,'t'));for(let k=1;k<8;k++){const x=Math.round(40+(tipX-40)*k/8),y=Math.round(76+(tipY-76)*k/8);ops.push(L(x,y,x-6+k%3,y-5,j%2?'g':'t'),L(x,y,x+5-k%2,y-7,j%2?'l':'g'));}}return {ops};},260);
seq(details,'mushrooms',4,i=>({ops:[E(8,73,58,4,'n'),R(22,52,5,23,'u'),L(23,55,23,73,'h'),R(49,61,4,13,'a'),E(9,41,31,18,'k'),E(10,40,29,15,'e'),E(13,41,22,6,'o'),L(12,54,37,54,'u'),R(17,44,4,3,'z'),R(28,46,3,2,'z'),E(41,52,24,12,'k'),E(43,52,20,9,'v'),E(46,53,13,3,'p'),R(48,55,3,2,'i'),P(59,56,'h'),P(21+i*3,33-i%2,'f')]}),250);
seq(details,'lantern',6,i=>({ops:[L(39,0,39,23,'k'),L(40,0,40,23,'u'),R(33,23,15,4,'k'),...poly([[33,27],[29,33],[31,55],[49,55],[52,33],[47,27]],'k'),R(33,32,15,19,'q'),R(35,33,11,16,'o'),R(37,34,7,14,'f'),R(39,36+i%3,3,10,'z'),R(32,52,17,3,'u'),R(32,30,18,3,'u'),L(35,34,36,49,'k'),L(46,34,45,49,'k'),L(39,57,40,61,'u')]}),110);
seq(details,'banner',6,i=>{const wave=i%3;return {ops:[R(18,5,3,68,'k'),L(19,6,19,71,'u'),L(18,8,57,8,'k'),L(20,9,56,9,'y'),...poly([[24,10],[54,10],[54+wave,45],[45,43],[41,49],[32,46],[25,50]],'k'),...poly([[26,11],[52,11],[52+wave,42],[44,40],[40,46],[33,42],[27,45]],'v'),R(27,12,2,28,'p'),L(27,13,50,13,'u'),...poly([[39,21],[44,28],[40,36],[34,29]],'u'),L(39,24,39,32,'z')]};},140);
seq(details,'rubble',3,i=>({ops:[E(4,73,72,5,'n'),...poly([[8,72],[15,58],[30,55],[43,64],[41,75]],'s'),...poly([[15,58],[30,55],[39,63],[23,66],[8,72]],'b'),L(18,59,28,57,'a'),L(24,66,27,74,'n'),...poly([[45,75],[51,66],[65,65],[72,74]],'s'),L(53,67,64,66,'a'),R(33,68,8,3,'g'),L(10,73,12,65,'t'),P(36+i,68,'l')]}),350);
recipes.push(details);

const sky=make('horizon',256,144);
seq(sky,'moonrise',1,()=>{const ops=[R(0,0,256,144,'n'),R(0,46,256,98,'s'),R(0,82,256,62,'b'),E(174,14,37,37,'a'),E(176,14,34,34,'h'),E(179,15,28,29,'w'),E(182,27,5,5,'h'),E(197,20,7,5,'h'),...noise(0,0,256,67,85,['a','h','s'])];for(let i=0;i<9;i++){const x=i*36-20;ops.push(...poly([[x,117],[x+31,61+i%3*10],[x+56,97],[x+73,114]],'s'));}for(let i=0;i<6;i++){const x=25+i*44;ops.push(R(x,85-i%2*13,12,53+i%2*13,'n'),...poly([[x-2,85-i%2*13],[x+6,73-i%2*13],[x+14,85-i%2*13]],'n'),R(x+3,88-i%2*13,2,5,'a'));if(i<5)ops.push(R(x+10,109,36,34,'n'),R(x+14,105,6,5,'n'),R(x+27,105,6,5,'n'));}ops.push(...poly([[0,129],[26,120],[47,127],[84,115],[126,130],[157,120],[187,131],[235,117],[256,128],[256,144],[0,144]],'t'));return {ops};});
recipes.push(sky);

await mkdir(root,{recursive:true});
await mkdir(path.join(root,'recipes'),{recursive:true});
await mkdir(path.join(root,'assets'),{recursive:true});
const manifest=[];
for(const recipe of recipes){
 const start=performance.now();
 const bundle=await createBundle(recipe);
 if(bundle.project.warnings.length && recipe.name!=='horizon')throw new Error(`${recipe.name}: ${bundle.project.warnings.join('; ')}`);
 const dir=path.join(root,'assets',recipe.name);await mkdir(dir,{recursive:true});
 const write=(file,data)=>writeFile(file,data,{flag:force?'w':'wx'});
 await write(path.join(root,'recipes',`${recipe.name}.json`),JSON.stringify(recipe,null,2)+'\n');
 for(const filename of [`${recipe.name}.png`,`${recipe.name}.atlas.json`,`${recipe.name}.css`])await write(path.join(dir,filename),bundle.files.get(filename));
 await write(path.join(dir,'bundle.zip'),createZip(bundle.files));
 const view=inspectProject(bundle.project,{scale:2}).sheet;
 await write(path.join(dir,'contact.png'),encodePNG(view.data,view.width,view.height));
 for(const animation of Object.keys(recipe.animations))await write(path.join(dir,`${animation}.png`),bundle.files.get(`animations/${animation}.png`));
 manifest.push({name:recipe.name,width:recipe.width,height:recipe.height,frames:recipe.frames.length,animations:Object.keys(recipe.animations),bytes:[...bundle.files.values()].reduce((sum,b)=>sum+b.length,0)});
 console.log(`${recipe.name}: ${recipe.frames.length} frames, ${Object.keys(recipe.animations).length} animations, ${(performance.now()-start).toFixed(1)} ms`);
}
await writeFile(path.join(root,'assets','manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:force?'w':'wx'});
console.log(`Total: ${manifest.reduce((n,a)=>n+a.frames,0)} frames in ${manifest.length} recipes.`);
