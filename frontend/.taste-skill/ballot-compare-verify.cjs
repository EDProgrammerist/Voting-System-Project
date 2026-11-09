process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const {chromium}=require('C:/Users/ED/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.join(__dirname,'ballot-compare');
const report={checks:[],errors:[],measurements:[],limitation:'Comparison is tested in a standalone component harness with labelled sample candidates. No student password, candidate, or election record is changed.'};
const fixture={id:9,name:'President',max_selections:1,candidates:[
  {student_id:'qa-a',full_name:'Sample Alex Cruz',team:'TEAM_A',profile_photo_url:null,motto:'Student representation — QA example',profile:'Sample student leadership background.',achievements:'Sample leadership award\nSample community project'},
  {student_id:'qa-b',full_name:'Sample Bea Santos',team:'TEAM_B',profile_photo_url:null,motto:'Community participation — QA example',profile:null,achievements:'Sample academic award'},
  {student_id:'qa-c',full_name:'Sample Casey Reyes',team:'TEAM_A',profile_photo_url:null,motto:null,profile:null,achievements:null}
]};
(async()=>{
 const b=await chromium.launch({headless:true,args:['--disable-gpu'],executablePath:'C:/Users/ED/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));
 const go=route=>p.goto('http://localhost:5173'+route,{waitUntil:'domcontentloaded'});
 try{
  await go('/.taste-skill/ballot-compare/preview.html');await p.waitForFunction(()=>typeof window.renderComparison==='function');await p.evaluate(pos=>window.renderComparison(pos),fixture);
  const summary=p.locator('summary');await summary.waitFor();await summary.focus();await p.keyboard.press('Enter');assert.equal(await p.locator('details').getAttribute('open'),'');
  assert.equal(await p.locator('.lineup-party').count(),3);assert.equal(await p.getByRole('combobox').count(),0);
  for(const candidate of fixture.candidates){await p.getByRole('heading',{name:candidate.full_name,exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:candidate.full_name,exact:true}).count(),0);assert.equal(await p.getByRole('link',{name:candidate.full_name,exact:true}).count(),0);}
  report.checks.push('Every candidate has a static name and profile panel; no name dropdowns, links or buttons remain.');
  assert.equal(await p.locator('.lineup-party').nth(1).getAttribute('data-tone'),'blue');assert.equal(await p.locator('.lineup-party').nth(2).getByRole('heading',{name:'Profile',exact:true}).count(),0);await p.getByText('No achievements have been provided yet.').waitFor();await p.getByText('Sample student leadership background.').waitFor();report.checks.push('All candidates remain visible, with party colours, existing profile text, achievements and missing-data fallbacks.');
  await p.screenshot({path:path.join(out,'compare-all-1440.png'),fullPage:true,timeout:8000});
  await p.evaluate(pos=>window.renderComparison({...pos,candidates:pos.candidates.slice(0,2)}),fixture);await p.waitForFunction(()=>document.querySelectorAll('.lineup-party').length===2);
  for(const width of [1440,768,390]){
   await p.setViewportSize({width,height:1000});await p.screenshot({path:path.join(out,'compare-'+width+'.png'),fullPage:true,timeout:8000});
   const m=await p.evaluate(()=>{const panels=[...document.querySelectorAll('.lineup-party')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width}});return{width:innerWidth,document:document.documentElement.scrollWidth,panels};});assert.ok(m.document<=width);if(width===1440)assert.equal(m.panels[0].y,m.panels[1].y);else assert.ok(m.panels[1].y>m.panels[0].y);report.measurements.push(m);
  }
  report.checks.push('Responsive comparison panels and overflow checked at 1440/768/390; desktop is paired and narrow layouts stack.');
  await p.evaluate(pos=>window.renderComparison({...pos,candidates:pos.candidates.slice(0,1)}),fixture);await p.waitForFunction(()=>!document.querySelector('details'));await p.evaluate(pos=>window.renderComparison({...pos,candidates:[]}),fixture);assert.equal(await p.locator('details').count(),0);report.checks.push('Comparison remains hidden with fewer than two candidates.');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}
 finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await b.close();}
})();
