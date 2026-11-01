// Optional browser verification; use an externally installed Playwright, never a toolkit dependency.
// Start scene on 4781 and sprite studio on 4782. Pass the path to playwright/index.mjs.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { browserChannel } from './environment.mjs';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const sceneURL = process.argv[3] ?? 'http://127.0.0.1:4781', studioURL = process.argv[4] ?? 'http://127.0.0.1:4782';
const outputRoot = fileURLToPath(new URL('../output/quality-qa/', import.meta.url)); await mkdir(outputRoot, { recursive: true });
const out = await mkdtemp(outputRoot + '/run-');
const channel = browserChannel();
const browser = await chromium.launch({ headless: true, ...(channel && { channel }) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const errors = [], checks = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text()); });
try {
  await page.goto(sceneURL); await page.waitForLoadState('networkidle');
  assert.match(await page.locator('h1').innerText(), /listening hollow/); assert.equal(await page.locator('#error').innerText(), '');
  const canvas = () => page.locator('#scene').evaluate(c => c.toDataURL());
  const initial = await canvas();
  await page.locator('#time').fill('1500'); const impact = await canvas(); assert.notEqual(impact, initial);
  await page.locator('#time').fill('2200'); assert.notEqual(await canvas(), impact); checks.push('scene scrub reaches reaction and settled state');
  await page.locator('#time').fill('0'); assert.equal(await canvas(), initial); checks.push('scene reset is deterministic');
  await page.locator('#density').check(); assert.notEqual(await canvas(), initial); await page.locator('#density').uncheck();
  await page.locator('#lit').uncheck(); assert.notEqual(await canvas(), initial); await page.locator('#lit').check(); checks.push('density and lighting controls affect the image');
  await page.locator('#light-x').fill('24'); assert.notEqual(await canvas(), initial); checks.push('moving a light changes hand-authored material response');
  await page.screenshot({ path: out + '/scene.png', fullPage: true });
  const benchmark = await page.evaluate(async () => {
    const { prepareScene, renderScene } = await import('/scene.js');
    const scene = prepareScene(await (await fetch('/scene.json')).json()), samples = [];
    for (let i = 0; i < 120; i++) { const start = performance.now(); renderScene(scene, { time: i * 17 }); if (i >= 20) samples.push(performance.now() - start); }
    samples.sort((a,b) => a-b); return { medianMs: samples[50], p95Ms: samples[95], samples: 100, note: 'CPU scene renderer after 20 warm-up samples, one desktop Chromium; not game FPS or mobile performance.' };
  });
  await page.locator('#play').click(); const start = await page.locator('#time').inputValue();
  await page.waitForFunction(start => document.querySelector('#time').value !== start, start); await page.locator('#play').click(); checks.push('requestAnimationFrame playback advances');
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: out + '/scene-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks.push('narrow layout contains the integer-scale scene in a scrollable stage');
  await page.setViewportSize({ width: 1440, height: 1080 }); await page.goto(studioURL); await page.waitForLoadState('networkidle');
  const recipe = { version:1, name:'neighbors', width:4, height:1, frames:['a','b','skipped','c'].map((name,i)=>({name,duration:80,ops:[{op:'pixel',x:i,color:'#fff'}]})), animations:{back:{frames:['a','b','b','c'],direction:'reverse',loop:false},ping:{frames:['a','b','c'],direction:'pingpong'}} };
  await page.locator('#source').fill(JSON.stringify(recipe)); await page.waitForFunction(() => document.querySelector('#project-name').textContent === 'Neighbors');
  assert.equal(await page.locator('.frame').count(), 4);
  await page.locator('#onion').click(); assert.match(await page.locator('#onion').getAttribute('title'), /Previous \(pink\): none; next \(cyan\): b/);
  await page.locator('.frame').nth(1).click(); assert.match(await page.locator('#onion').getAttribute('title'), /Previous \(pink\): c; next \(cyan\): b/);
  await page.locator('.frame').nth(2).click(); assert.match(await page.locator('#onion').getAttribute('title'), /Previous \(pink\): b; next \(cyan\): a/);
  await page.locator('.frame').nth(3).click(); assert.match(await page.locator('#onion').getAttribute('title'), /next \(cyan\): none/);
  checks.push('reverse sparse sequence and repeated holds use playback-position onion neighbors');
  await page.locator('#animation').selectOption('ping');
  assert.match(await page.locator('#onion').getAttribute('title'), /Previous \(pink\): b; next \(cyan\): b/);
  await page.locator('.frame').nth(2).click(); assert.match(await page.locator('#canvas').getAttribute('aria-label'), /frame c/); checks.push('pingpong endpoints select the correct pose and neighbors');
  await page.locator('#review-view').selectOption('silhouette');
  const values = await page.locator('#canvas').evaluate(c => [...c.getContext('2d').getImageData(0,0,4,1).data]);
  for(let i=0;i<values.length;i+=4) if(values[i+3]) assert.deepEqual(values.slice(i,i+4), [240,240,240,255]);
  checks.push('studio silhouette is solid and native preview is present');
  assert.equal(await page.locator('#native-canvas').getAttribute('width'),'4');
  await page.screenshot({ path: out + '/onion.png', fullPage: true });
  assert.deepEqual(errors, []);
  const report = { browser: browser.version(), checks, errors, benchmark, evidenceDirectory: out };
  await writeFile(out + '/results.json', JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report,null,2));
} finally { await browser.close(); }
