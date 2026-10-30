'use strict';
const config=window.KNECK_CONFIG||{};
const base=(config.apiBase||'').replace(/\/$/,'');
const $=s=>document.querySelector(s);
let usingSnapshot=false;
let frontendText={};
function copy(text){return Object.hasOwn(frontendText,text)?frontendText[text]:text;}
window.setFrontendCopy=function(values){frontendText=values||{};window.applyFrontendCopy?.();};
let subjects=[],exams=[],selectedSubject='',selectedPaper='',view='dashboard',toastTimer;
function stored(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
let saved=new Set(stored('kneck-saved',[]));let recent=stored('kneck-recent',[]);
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function toast(text){const n=$('#toast');n.textContent=text;n.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.hidden=true,4500);}
function setStatus(text,ok){const n=$('#connection-status');n.replaceChildren(el('i'),document.createTextNode(text));n.classList.toggle('offline',!ok);}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(location.protocol==='file:'?8000:60000),cache:'no-store'});if(!r.ok)throw new Error('The API returned '+r.status+'. Check that the backend is live and its FRONTEND_ORIGINS includes this exact Vercel URL.');return r.json();}
async function load(){
 $('#error-panel').hidden=true;setStatus('Loading library',false);
 try{
  let settings;
  usingSnapshot=false;
  if(config.demo){const local=window.KNEC_LOCAL_DATA;if(!local)throw new Error('Local library snapshot is missing. Extract the complete project ZIP.');subjects=local.subjects;exams=local.exams;settings=local.settings;usingSnapshot=true;}
  else{
   if(!base)throw new Error('The API URL has not been configured. Set PUBLIC_API_BASE in Vercel and redeploy the frontend.');
   try{
    const results=await Promise.all([get(base+'/api/catalog'),get(base+'/api/exams'),get(base+'/api/settings')]);subjects=results[0].subjects;exams=results[1].exams;settings=results[2];
   }catch(error){
    if(location.protocol!=='file:'||!window.KNEC_LOCAL_DATA)throw error;
    const local=window.KNEC_LOCAL_DATA;subjects=local.subjects;exams=local.exams;settings=local.settings;usingSnapshot=true;
    toast('Local snapshot: the live backend is unavailable. Uploaded papers and admin changes require the live connection.');
   }
  }
  if(!Array.isArray(subjects)||!Array.isArray(exams))throw new Error('Unexpected library response. Check the API deployment.');
  exams=exams.filter(e=>e.published!==false);
  window.setFrontendCopy(settings.frontendText);
  if(settings.brandName){$('#brand-name').textContent=settings.brandName;document.title=settings.brandName+' • '+copy('Revision dashboard');}
  if(settings.instructions)$('#instructions').textContent=settings.instructions;
  if(settings.logoUrl){const img=$('#brand-logo');img.onload=()=>{$('#brand-monogram').hidden=true;img.hidden=false;};img.onerror=()=>{img.hidden=true;$('#brand-monogram').hidden=false;};img.src=base+settings.logoUrl+'?v='+Date.now();}
  $('#price-summary').textContent='KSh '+Number(settings.defaultPrice||515).toLocaleString('en-KE');
  $('#stat-subjects').textContent=subjects.length;$('#stat-papers').textContent=exams.length;$('#subject-select').replaceChildren(...subjects.map(s=>new Option(s.name,s.id)));
  setStatus(usingSnapshot?'Local snapshot':'Library ready',true);updateSavedCount();renderDropdown();render();
 }catch(e){setStatus('Connection needed',false);$('#error-panel').hidden=false;$('#error-message').textContent=e.name==='TimeoutError'?'The backend is taking longer than expected. Wait a moment and try again.':e.message;$('#library-grid').replaceChildren();}
}
const shortNames={'mathematics':'Mx','chemistry':'Ch','biology':'Bi','cre':'CR','kiswahili':'Ks','geography':'Ge','computer-studies':'CS','history':'Hi','german':'De','french':'Fr','english':'En','business-studies':'Bs','agriculture':'Ag','woodwork':'Wd','home-science':'Hs'};
const aliases={'maths':'mathematics','math':'mathematics','chemestry':'chemistry','france':'french','bussiness':'business','hoodwork':'woodwork','cre':'christian religious education'};
function matches(text,q){return text.toLowerCase().includes(aliases[q]||q);}
function renderDropdown(){const q=$('#dropdown-search').value.toLowerCase().trim();const items=$('#dropdown-items');items.replaceChildren();for(const s of subjects.filter(s=>matches(s.name+' '+s.id,q))){const b=el('button',s.name);b.type='button';b.onclick=()=>{selectSubject(s.id);closeDropdown();};items.append(b);}if(!items.children.length)items.append(el('p','No matching subject.','empty-note'));}
function closeDropdown(){$('#subject-dropdown').hidden=true;$('#browse-button').setAttribute('aria-expanded','false');}
function selectSubject(id){selectedSubject=id;selectedPaper='';view='dashboard';$('#library-search').value='';$('#subject-select').value=id;updatePapers();updateNav();render();$('#library').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
function updatePapers(){const s=subjects.find(s=>s.id===selectedSubject);$('#paper-select').replaceChildren(new Option('Select a paper',''),...(s?s.papers:[]).map(p=>new Option(`Paper ${p.number} — ${p.component}`,p.number)));$('#paper-select').value=selectedPaper;}
function updateSavedCount(){$('#saved-count').textContent=[...saved].filter(id=>exams.some(e=>e.id===id)).length;}
function updateNav(){for(const [id,kind] of [['nav-dashboard','dashboard'],['nav-saved','saved'],['nav-recent','recent']])$('#'+id).classList.toggle('active',view===kind);$('#view-name').textContent=view==='dashboard'?'Dashboard':view==='saved'?'Saved papers':'Recent downloads';}
function empty(message){const n=el('div',undefined,'empty-state');n.append(el('span','◇'),el('h3',message));return n;}
function render(){
 const grid=$('#library-grid');grid.replaceChildren();const q=$('#library-search').value.trim().toLowerCase();$('#paper-selector').hidden=view!=='dashboard'||!selectedSubject;
 const subj=subjects.find(s=>s.id===selectedSubject);
 $('#library-eyebrow').textContent=view==='saved'?'YOUR COLLECTION':view==='recent'?'YOUR HISTORY':'THE LIBRARY';
 $('#library-title').textContent=view==='saved'?'Saved papers.':view==='recent'?'Recent downloads.':subj?subj.name+(selectedPaper?' · Paper '+selectedPaper:''):'Find your subject.';
 if(view==='dashboard'&&!selectedSubject){
  const filtered=subjects.filter(s=>matches(s.name+' '+s.id,q)||exams.some(e=>e.subjectId===s.id&&matches(e.title,q)));
  for(const s of filtered){const count=exams.filter(e=>e.subjectId===s.id).length;const card=el('button',undefined,'subject-card');card.type='button';const top=el('div',undefined,'card-top');top.append(el('span',shortNames[s.id]||s.code,'subject-icon'),el('span','↗','card-arrow'));const title=el('h3',s.name);const tags=el('div',undefined,'paper-tags');for(const p of s.papers)tags.append(el('span','Paper '+p.number));card.append(top,title,tags,el('div',count+' '+(count===1?'paper':'papers')+' available','card-count'));card.onclick=()=>selectSubject(s.id);grid.append(card);}
  if(!filtered.length)grid.append(empty('No matching subject.'));return;
 }
 if(view==='dashboard'&&subj&&!selectedPaper){
  for(const p of subj.papers){const card=el('button',undefined,'paper-choice');card.type='button';card.append(el('span',String(p.number).padStart(2,'0'),'paper-number'),el('h3','Paper '+p.number),el('p',p.component),el('span','Download exam →','paper-choice-link'));card.onclick=()=>{selectedPaper=String(p.number);$('#paper-select').value=selectedPaper;render();};grid.append(card);}return;
 }
 let filtered=exams.filter(e=>{const s=subjects.find(s=>s.id===e.subjectId);return s&&matches(s.name+' '+e.title+' '+e.year,q);});
 if(view==='saved')filtered=filtered.filter(e=>saved.has(e.id));else if(view==='recent'){filtered=recent.map(r=>filtered.find(e=>e.id===r.id)).filter(Boolean);}else filtered=filtered.filter(e=>e.subjectId===selectedSubject&&e.paper===Number(selectedPaper));
 for(const e of filtered){const s=subjects.find(s=>s.id===e.subjectId);const card=el('article',undefined,'exam-card');const top=el('div',undefined,'card-top');top.append(el('span','PDF','pdf-label'));const save=el('button',saved.has(e.id)?'◆':'◇','save-button');save.type='button';save.setAttribute('aria-label',(saved.has(e.id)?'Unsave ':'Save ')+s.name+' Paper '+e.paper);save.setAttribute('aria-pressed',saved.has(e.id));save.onclick=()=>{if(saved.has(e.id))saved.delete(e.id);else saved.add(e.id);store('kneck-saved',[...saved]);updateSavedCount();render();};top.append(save);card.append(top,el('span',s.name+' · Paper '+e.paper,'exam-subject'),el('h3',e.title),el('p',e.year+' · '+(e.duration||'PDF document')+(e.bytes?' · '+(e.bytes/1024).toFixed(0)+' KB':''),'exam-meta'));
  const download=el('button',undefined,'download-link');download.type='button';download.append(el('span','Download exam'+' · KSh '+Number(e.price||515).toLocaleString('en-KE')),el('span','↓'));download.onclick=()=>window.openCheckout(e);card.append(download);grid.append(card);
 }
 if(!filtered.length)grid.append(empty(view==='saved'?'Save a paper using the diamond icon.':view==='recent'?'Your downloaded papers will appear here.':'No matching PDFs are published yet.'));
}
$('#browse-button').onclick=()=>{const open=$('#subject-dropdown').hidden;$('#subject-dropdown').hidden=!open;$('#browse-button').setAttribute('aria-expanded',String(open));if(open){$('#dropdown-search').value='';renderDropdown();$('#dropdown-search').focus();}};
$('#dropdown-search').oninput=renderDropdown;
document.addEventListener('click',e=>{if(!e.target.closest('.browse-wrap'))closeDropdown();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDropdown();if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('#library-search').focus();}});
$('#subject-select').onchange=()=>selectSubject($('#subject-select').value);
$('#paper-select').onchange=()=>{selectedPaper=$('#paper-select').value;render();};
$('#back-subjects').onclick=()=>{selectedSubject='';selectedPaper='';$('#library-search').value='';render();};
$('#library-search').oninput=render;
for(const [id,kind] of [['nav-dashboard','dashboard'],['nav-saved','saved'],['nav-recent','recent']])$('#'+id).onclick=()=>{view=kind;selectedSubject='';selectedPaper='';$('#library-search').value='';updateNav();render();};
$('#retry-button').onclick=load;
let theme=stored('kneck-theme',null)|| (matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
function applyTheme(){document.documentElement.dataset.theme=theme;$('#theme-button').setAttribute('aria-pressed',theme==='dark');}
$('#theme-button').onclick=()=>{theme=theme==='dark'?'light':'dark';store('kneck-theme',theme);applyTheme();};applyTheme();
$('#copyright-year').textContent=new Date().getFullYear();load();
