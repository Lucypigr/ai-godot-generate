// Optional browser QA. Install Playwright separately; keep Pixelbolt dependency-free.
// node scripts/qa-emberfall.mjs C:/path/to/playwright/index.mjs [url]
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.argv[2]?pathToFileURL(process.argv[2]).href:'playwright');
const url=process.argv[3]||'http://127.0.0.1:4173';
const out=new URL('../output/emberfall/browser/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const step=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const shot=async name=>page.screenshot({path:new URL(`${name}.png`,out).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
try{
 await page.goto(url);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).render.ready);
 await shot('title');
 await page.click('#start-btn');await step(16);let s=await state();assert.equal(s.mode,'playing');const startX=s.player.x;
 await page.keyboard.down('ArrowRight');await step(500);await page.keyboard.up('ArrowRight');s=await state();assert.ok(s.player.x>startX+70);results.push('keyboard movement');
 await page.keyboard.down('Space');await step(180);await page.keyboard.up('Space');s=await state();assert.ok(s.player.y<280);const firstY=s.player.y;
 await page.keyboard.down('Space');await step(180);await page.keyboard.up('Space');s=await state();assert.equal(s.player.jumps,2);assert.ok(s.player.y<firstY);results.push('double jump');
 await step(1400);await page.keyboard.press('Digit2');assert.equal((await state()).player.spell,'frost');
 await page.keyboard.down('KeyJ');await step(800);await page.keyboard.up('KeyJ');s=await state();assert.ok(s.shots.some(p=>p.charged));results.push('spell switch and charge release');
 await step(250);s=await state();assert.equal(s.props.find(p=>p.type==='brazier').state,'frozen');results.push('frost freezes brazier');await shot('frost');
 await page.keyboard.press('Digit1');await page.keyboard.press('KeyJ');await step(250);assert.equal((await state()).props.find(p=>p.type==='brazier').state,'whole');results.push('ember rekindles brazier');
 await page.keyboard.press('KeyP');let paused=await state();await step(2000);assert.equal((await state()).seconds,paused.seconds);await page.keyboard.press('KeyP');assert.equal((await state()).mode,'playing');results.push('pause/resume');
 const beforeDash=(await state()).player.x;await page.keyboard.press('ShiftLeft');await step(150);assert.ok((await state()).player.x>beforeDash+50);results.push('dash');
 await page.click('#sound');assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');await page.click('#sound');assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');results.push('sound toggle');
 await page.click('#fullscreen');await page.waitForFunction(()=>document.fullscreenElement?.id==='game-shell');await page.click('#fullscreen');await page.waitForFunction(()=>!document.fullscreenElement);results.push('fullscreen round trip');
 await shot('gameplay');
 await page.selectOption('#stress','400');await step(1000);assert.equal((await state()).stressActors,400);await shot('stress');results.push('400 actors');
 await page.selectOption('#stress','0');
 await page.locator('[data-asset="warden"]').click();await page.selectOption('#animation','attack');assert.ok((await page.locator('#sprite-preview').getAttribute('src')).endsWith('/attack.png'));results.push('asset gallery');
 await page.click('#restart');assert.equal((await state()).checkpoint,80);assert.equal((await state()).score,0);results.push('restart resets world');
 await page.reload();await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).render.ready);await page.click('#tour-btn');
 await step(14500);await shot('aqueduct');await step(7800);await shot('boss');await step(18000);assert.equal((await state()).mode,'won');await shot('victory');results.push('guided complete level / boss / portal');
 // Mouse and touch use the same game actions as the keyboard.
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url);await mobile.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).render.ready);await mobile.click('#start-btn');await mobile.evaluate(()=>window.advanceTime(16));
 const right=await mobile.locator('[data-key="right"]').boundingBox();await mobile.mouse.move(right.x+right.width/2,right.y+right.height/2);await mobile.mouse.down();await mobile.evaluate(()=>window.advanceTime(350));await mobile.mouse.up();assert.ok((await mobile.evaluate(()=>JSON.parse(window.render_game_to_text()))).player.x>120);
 assert.ok(await mobile.locator('.touch-controls').isVisible());await mobile.locator('[data-key="jump"]').tap();await mobile.evaluate(()=>window.advanceTime(150));assert.ok((await mobile.evaluate(()=>JSON.parse(window.render_game_to_text()))).player.y<290);results.push('visible touch controls and touch jump');
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:new URL('mobile.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});results.push('touch movement and mobile overflow');await mobile.close();
 assert.deepEqual(errors,[]);
 await writeFile(new URL('results.json',out),JSON.stringify({passed:results,errors},null,2));console.log(JSON.stringify({passed:results,errors},null,2));
}finally{await browser.close();}
