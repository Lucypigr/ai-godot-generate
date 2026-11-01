// Real requestAnimationFrame measurements, separate from deterministic gameplay QA.
import {pathToFileURL} from 'node:url';
import {writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.argv[2]?pathToFileURL(process.argv[2]).href:'playwright');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
const results=[];
try{
 await page.goto(process.argv[3]||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).render.ready);await page.click('#start-btn');
 for(const count of [0,160,400]){
  await page.selectOption('#stress',String(count));
  const result=await page.evaluate(()=>new Promise(resolve=>{
   const samples=[];let start=performance.now(),last=start;
   function sample(now){samples.push(now-last);last=now;if(now-start<3500){requestAnimationFrame(sample);return;}const sorted=samples.slice(3).sort((a,b)=>a-b);resolve({frames:samples.length,seconds:+((now-start)/1000).toFixed(3),averageFps:+(samples.length/(now-start)*1000).toFixed(1),p95FrameMs:+sorted[Math.floor(sorted.length*.95)].toFixed(2),state:JSON.parse(window.render_game_to_text()).render});}requestAnimationFrame(sample);
  }));results.push({extraActors:count,...result});
 }
 const report={browser:browser.version(),viewport:[1440,1080],headless:true,note:'Local desktop measurement; not a mobile or cross-device performance guarantee. Deterministic advanceTime was not used.',results};
 const out=new URL('../output/emberfall/benchmark.json',import.meta.url);await mkdir(new URL('./',out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
