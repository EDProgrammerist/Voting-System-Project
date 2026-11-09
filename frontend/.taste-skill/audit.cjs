const { chromium } = require('C:/Users/ED/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const phase = process.argv[2] || 'before';
const root = path.join(__dirname, phase);
fs.mkdirSync(root, {recursive:true});
const base = 'http://localhost:5173';
async function measure(page) {
  return page.evaluate(() => {
    const box = (selector) => { const el=document.querySelector(selector); if(!el)return null; const r=el.getBoundingClientRect();const s=getComputedStyle(el);return {x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,fontFamily:s.fontFamily,color:s.color,background:s.backgroundColor}; };
    const visible = [...document.querySelectorAll('button,a,input,select')].filter(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&r.right>0&&r.left<innerWidth;});
    return {width:innerWidth,height:innerHeight,documentHeight:document.documentElement.scrollHeight,horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),heading:box('h1'),summary:box('.overview-metrics, .dashboard-summary'),chart:box('.overview-participation, .voters-card'),results:box('.overview-results, .candidate-table-card'),content:box('.admin-dashboard__content'),smallTargets:visible.filter(el=>{const r=el.getBoundingClientRect();return r.width<44||r.height<44;}).map(el=>({name:el.getAttribute('aria-label')||el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})),text:document.querySelector('main')?.innerText};
  });
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Users/ED/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe'});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const responses=[];page.on('response',async r=>{if(r.url().includes('/api/admin/dashboard')&&r.ok())responses.push(await r.json());});
  try {
    await page.goto(base+'/admin/login',{waitUntil:'domcontentloaded'});
    await page.getByLabel('Email',{exact:true}).fill('admin@ssg.local');
    await page.getByLabel('Password',{exact:true}).fill('Admin123!');
    await page.getByRole('button',{name:'Login',exact:true}).click();
    await page.waitForURL('**/admin/dashboard');
    await page.waitForResponse(r=>r.url().includes('/api/admin/dashboard')&&r.ok());
    await page.waitForTimeout(800);
    const report={phase,capturedAt:new Date().toISOString(),authentication:'Real login through existing admin form; no guard bypass',viewports:[],errors};
    for(const width of [1440,768,390]){
      await page.setViewportSize({width,height:width===1440?900:width===768?1024:844});
      await page.waitForTimeout(400);
      await page.screenshot({path:path.join(root,`dashboard-${width}.png`),fullPage:true});
      report.viewports.push(await measure(page));
    }
    fs.writeFileSync(path.join(root,'dashboard-response.json'),JSON.stringify(responses.at(-1),null,2));
    report.otherPages=[];
    for(const route of ['/admin/votes','/admin/voters','/admin/candidates']){
      await page.setViewportSize({width:1440,height:900});await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.waitForTimeout(900);
      const filename=route==='/'?'public-home':route.slice(1).replaceAll('/','-');
      await page.screenshot({path:path.join(root,filename+'.png'),fullPage:true});
      report.otherPages.push({route,url:page.url(),measurement:await measure(page)});
    }
    report.otherPageCaptureNote = 'Initial before admin-votes/admin-voters snapshots caught loading, so they are not used as populated pixel comparisons. Initial before admin-login/public-home captures redirected to dashboard due an active session; verification.json records actual signed-out access separately.';
    fs.writeFileSync(path.join(root,'measurements.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({phase,viewports:report.viewports.map(({text,...rest})=>rest),errors,realData:responses.at(-1)},null,2));
  } finally {await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
