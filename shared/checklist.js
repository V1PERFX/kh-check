/* Motor comum dos checklists. Espera window.KH_CONFIG (no index.html) e window.KH_DATA (data.js). */
(function(){
const C = window.KH_CONFIG, D = window.KH_DATA;
const A = D.assets || window.KH_ASSETS || {};
const KEY = C.storageKey;
const TIPS_ID = "tips";
const GROUPS = C.groups.slice();
if(D.tips && D.tips.length) GROUPS.push(Object.assign({id:TIPS_ID, name:"More Tips", sub:"Tips & strategies", emoji:"✦"}, C.tips||{}));

/* ---------- esqueleto da página ---------- */
document.body.insertAdjacentHTML("afterbegin", `
<header>
  ${A.banner?`<div class="banner" style="background-image:url('${A.banner}')"></div>`:""}
  <a class="home" href="../index.html">◂ All games</a>
  <div class="logo">
    ${A.logo && !C.textLogo ? `<img src="${A.logo}" alt="${esc(C.name)}">` :
      `<small>${esc(C.logoText?.small||"KINGDOM HEARTS")}</small><h1>${esc(C.logoText?.title||C.name)}</h1>`}
    <span>${esc(C.logoText?.tag||"CHECKLIST")}</span>
  </div>
  <div class="overall">
    <div class="lbl"><span>Total progress</span><b id="ovTxt">0%</b></div>
    <div class="gauge gold" id="ovBar"><i></i></div>
  </div>
</header>
<div class="chars" id="chars"></div>
<div class="layout">
  <nav class="cmd"><div class="cmd-title" id="cmdTitle"></div><ul id="menu"></ul></nav>
  <main><div class="panel" id="panel"></div></main>
</div>
<footer>
  <span>Data from the original guide/checklist by <a href="https://xenodusk.carrd.co/" target="_blank" rel="noopener">xenodusk</a>. Your progress is saved in this browser.</span>
  <span class="sp"></span>
  <button class="btn" id="exportBtn">⬇ Export progress</button>
  <button class="btn" id="importBtn">⬆ Import</button>
  <button class="btn" id="resetBtn">↺ Reset</button>
  <input type="file" id="importFile" accept="application/json" hidden>
</footer>
<div class="toast" id="toast"></div>`);

/* ---------- estado ---------- */
let state = load();
let ui = Object.assign({group:GROUPS[0].id, list:{}, hide:false, collapsed:{}}, safeParse(localStorage.getItem(KEY+"-ui")));
ui.q = "";

function safeParse(s){ try{ return JSON.parse(s)||{}; }catch(e){ return {}; } }
function load(){ const s = safeParse(localStorage.getItem(KEY)); return Object.keys(s).length || localStorage.getItem(KEY) ? s : defaults(); }
function defaults(){
  const s = {};
  D.lists.forEach(l=>l.items.forEach(i=>{
    if(i.id && i.done) s[i.id]=true;
    (i.cells||[]).forEach(c=>{ if(c && c.x && c.v) s[c.x]=true; });
  }));
  return s;
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); saveHub(); }
function saveUi(){
  const l = currentList();
  history.replaceState(null,"","#"+ui.group+(ui.group!==TIPS_ID && l ? "/"+l.id : ""));
  localStorage.setItem(KEY+"-ui", JSON.stringify({group:ui.group,list:ui.list,hide:ui.hide,collapsed:ui.collapsed}));
}
function saveHub(){
  const hub = safeParse(localStorage.getItem("kh-hub-progress"));
  const s = stats(D.lists.flatMap(l=>l.items));
  hub[C.slug] = {d:s.d, t:s.t, at:Date.now()};
  localStorage.setItem("kh-hub-progress", JSON.stringify(hub));
}
const isDone = id => !!state[id];
function esc(s){ return String(s??"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
const cellText = c => (c && typeof c==="object") ? "" : c;

function stats(items){ let t=0,d=0; items.forEach(i=>{ if(i.id){t++; if(isDone(i.id)) d++;} }); return {t,d}; }
const listsOf = g => D.lists.filter(l=>l.group===g);
function currentList(){ const ls = listsOf(ui.group); return ls.find(l=>l.id===ui.list[ui.group]) || ls[0]; }
const groupOf = id => GROUPS.find(g=>g.id===id) || GROUPS[0];

function applyTheme(){
  const g = groupOf(ui.group);
  const st = document.body.style;
  if(g.accent){ st.setProperty("--accent", g.accent); st.setProperty("--accent2", g.accent2||g.accent);
    st.setProperty("--glow", `color-mix(in srgb, ${g.accent} 35%, transparent)`); }
  else ["--accent","--accent2","--glow"].forEach(v=>st.removeProperty(v));
  document.body.dataset.group = ui.group;
}

/* ---------- render ---------- */
function faceOf(g){
  const src = g.face || (g.faceIndex && A.index && A.index[g.faceIndex]);
  if(src) return `<div class="face ${g.face?"":"contain"}" style="background-image:url('${src}')"></div>`;
  return `<div class="face">${g.emoji||"✦"}</div>`;
}
function renderChars(){
  const el = document.getElementById("chars");
  if(GROUPS.length<2){ el.style.display="none"; return; }
  el.innerHTML = GROUPS.map(g=>{
    let sub = g.sub||"";
    if(g.id!==TIPS_ID){ const s = stats(listsOf(g.id).flatMap(l=>l.items)); sub = `${s.d}/${s.t} · ${s.t?Math.floor(s.d*100/s.t):0}%`; }
    return `<div class="char ${ui.group===g.id?"on":""}" data-g="${g.id}" style="--c:${g.accent||"var(--accent)"}">
      ${faceOf(g)}<div><b>${esc(g.name)}</b><small>${esc(sub)}</small></div></div>`;
  }).join("");
  el.querySelectorAll(".char").forEach(c=>c.onclick=()=>{ ui.group=c.dataset.g; ui.q=""; saveUi(); renderAll(); });
}
function renderOverall(){
  const s = stats(D.lists.flatMap(l=>l.items)); const p = s.t ? s.d*100/s.t : 0;
  document.getElementById("ovTxt").textContent = `${s.d} / ${s.t} · ${p.toFixed(1)}%`;
  const bar = document.getElementById("ovBar"); bar.querySelector("i").style.width = p+"%"; bar.classList.toggle("full", s.t>0 && s.d===s.t);
}
function renderMenu(){
  const menu = document.getElementById("menu");
  document.getElementById("cmdTitle").textContent = groupOf(ui.group).name;
  if(ui.group===TIPS_ID){
    menu.innerHTML = D.tips.map((t,i)=>`<li><button data-i="${i}"><span>${esc(t.title)}</span></button></li>`).join("");
    menu.querySelectorAll("button").forEach(b=>b.onclick=()=>{ const d=document.querySelectorAll("details.tip")[b.dataset.i]; d.open=true; d.scrollIntoView({behavior:"smooth",block:"start"}); });
    return;
  }
  const cur = currentList();
  menu.innerHTML = listsOf(ui.group).map(l=>{
    const s = stats(l.items);
    const n = l.ref ? "📖" : `${s.d}/${s.t}`;
    const ic = menuIcon(l);
    return `<li><button data-id="${l.id}" class="${l===cur?"on":""} ${!l.ref&&s.d===s.t?"done":""}">${ic?`<img src="${ic}" alt="">`:""}<span>${esc(l.title)}</span><span class="n">${n}</span></button></li>`;
  }).join("");
  menu.querySelectorAll("button").forEach(b=>b.onclick=()=>{ ui.list[ui.group]=b.dataset.id; ui.q=""; saveUi(); renderMenu(); renderPanel(); });
}
function menuIcon(l){
  const idx = A.index || {}; if(!l.sheet) return null;
  const norm = t => t.toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\b(the|files?|collection|ship|list)\b/g,"").replace(/s\b/g,"").replace(/\s+/g," ").trim();
  if(idx[l.sheet]) return idx[l.sheet];
  const want = norm(l.sheet), wantBase = norm(l.sheet.replace(/\s*\(.*\)$/,""));
  const keys = Object.keys(idx).filter(k=>!k.startsWith("@"));
  const k = keys.find(k=>norm(k)===want) || keys.find(k=>norm(k)===wantBase)
    || keys.find(k=>norm(k).split(" ")[0]===wantBase.split(" ")[0] && wantBase.split(" ")[0].length>3);
  return k ? idx[k] : null;
}
function cellHtml(col, v){
  if(v && typeof v==="object") return `<span class="xck ${isDone(v.x)?"on":""}" data-x="${v.x}" title="${esc(col)}"></span>`;
  if(col==="Rarity") return `<span class="badge r-${esc(v)}">${esc(v)}</span>`;
  if(/^\s*[★☆]+\s*$/.test(v)) return `<span class="stars">${esc(v.trim())}</span>`;
  return esc(v);
}
function renderPanel(){
  const panel = document.getElementById("panel");
  if(ui.group===TIPS_ID){
    panel.innerHTML = `<div class="phead"><div class="row1"><div><div class="sub">Tips & strategies</div><h2>More Tips</h2></div></div></div>
      <div class="tips">${D.tips.map(t=>`<details class="tip"><summary>${esc(t.title)}</summary>
        <div class="body">${esc(t.body)}${t.link?`\n\n<a href="${esc(t.link)}" target="_blank" rel="noopener">→ Open reference link ↗</a>`:""}</div></details>`).join("")}</div>`;
    return;
  }
  const l = currentList();
  panel.innerHTML = `
    <div class="phead">
      <div class="row1"><div><div class="sub">${esc(l.subtitle)}</div><h2>${esc(l.title)}</h2></div><div class="count" id="cnt"></div></div>
      ${l.ref?"":`<div class="gauge" id="bar"><i></i></div>`}
      ${l.note?`<div class="note">${esc(l.note)} ${l.link?`<a href="${esc(l.link)}" target="_blank" rel="noopener">Open link ↗</a>`:""}</div>`:""}
    </div>
    <div class="tools">
      <label class="search"><input id="q" type="search" placeholder="Search this list…" value="${esc(ui.q)}"></label>
      ${l.ref?"":`<label class="toggle"><input type="checkbox" id="hide" ${ui.hide?"checked":""}> Hide completed</label>
      <button class="btn" id="allBtn">Check visible</button><button class="btn" id="noneBtn">Uncheck visible</button>`}
    </div>
    <table><thead><tr>${l.ref?"":"<th>✓</th>"}${l.hasIcon?"<th></th>":""}${l.columns.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody id="tb"></tbody></table>
    ${l.footer?`<div class="note footnote">${esc(l.footer)}</div>`:""}`;
  const q = panel.querySelector("#q");
  q.oninput = ()=>{ ui.q=q.value; renderRows(); };
  if(!l.ref){
    panel.querySelector("#hide").onchange = e=>{ ui.hide=e.target.checked; saveUi(); renderRows(); };
    panel.querySelector("#allBtn").onclick = ()=>bulk(true);
    panel.querySelector("#noneBtn").onclick = ()=>bulk(false);
  }
  renderRows();
}
function matches(i, q){ return !q || i.cells.map(cellText).join(" ").toLowerCase().includes(q); }
function visibleItems(l){ const q = ui.q.trim().toLowerCase(); return l.items.filter(i=>i.id && (!ui.hide || !isDone(i.id)) && matches(i,q)); }

function renderRows(){
  const l = currentList(), tb = document.getElementById("tb");
  const ncol = l.columns.length + (l.ref?0:1) + (l.hasIcon?1:0);
  const q = ui.q.trim().toLowerCase();
  const hide = ui.hide && !l.ref;
  const mainCol = l.columns.findIndex((c,ci)=>!["Rarity","Category","No.","#"].includes(c) && typeof (l.items.find(i=>i.cells)||{cells:[]}).cells[ci] !== "object");
  const groups = []; let cur = {sec:null, items:[]};
  l.items.forEach(i=>{ if(i.section){ groups.push(cur); cur={sec:i,items:[]}; } else cur.items.push(i); });
  groups.push(cur);
  let html = "", shown = 0;
  groups.forEach((g,gi)=>{
    const vis = g.items.filter(i=>(!hide || !isDone(i.id)) && matches(i,q));
    const ckey = l.id+"#"+gi, collapsed = !q && ui.collapsed[ckey];
    if(g.sec){
      if(!vis.length && (q || hide)) return;
      const s = stats(g.items);
      html += `<tr class="sec ${collapsed?"collapsed":""}" data-k="${ckey}"><td colspan="${ncol}"><div class="sech">
        <span class="arrow">▼</span>${g.sec.icon?`<img src="${g.sec.icon}" alt="">`:""}<b>${esc(g.sec.section)}</b>
        ${g.sec.link?`<a href="${esc(g.sec.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">▶ video</a>`:""}
        ${l.ref?"":`<span class="sc">${s.d}/${s.t}</span><div class="gauge mini ${s.t&&s.d===s.t?"full":""}"><i style="width:${s.t?s.d*100/s.t:0}%"></i></div>`}</div>${g.sec.comment?`<div class="cmt">ⓘ ${esc(g.sec.comment)}</div>`:""}</td></tr>`;
    }
    if(collapsed) return;
    vis.forEach(i=>{
      shown++;
      html += `<tr class="${l.ref?"ref":"item"} ${i.id&&isDone(i.id)?"done":""}" ${i.id?`data-id="${i.id}"`:""}>
        ${l.ref?"":`<td class="ck"><span class="box"></span></td>`}
        ${l.hasIcon?`<td class="ic">${i.icon?`<img src="${i.icon}" alt="" loading="lazy">`:""}</td>`:""}
        ${i.cells.map((c,ci)=>`<td class="${ci===mainCol?"main":""} ${c&&typeof c==="object"?"xc":""}">${cellHtml(l.columns[ci],c)}${i.comment&&ci===i.cells.length-1?`<div class="cmt">ⓘ ${esc(i.comment)}</div>`:""}</td>`).join("")}</tr>`;
    });
  });
  if(!shown && !html.includes('class="sec')) html = `<tr><td colspan="${ncol}" class="empty">${hide?"All done here! ✦":"Nothing found."}</td></tr>`;
  tb.innerHTML = html;
  tb.querySelectorAll("tr.item").forEach(tr=>tr.onclick=e=>{
    const x = e.target.closest(".xck");
    if(x){ toggleExtra(x); return; }
    toggle(tr.dataset.id);
  });
  tb.querySelectorAll("tr.ref .xck").forEach(x=>x.onclick=()=>toggleExtra(x));
  tb.querySelectorAll("tr.sec").forEach(tr=>tr.onclick=()=>{ ui.collapsed[tr.dataset.k]=!ui.collapsed[tr.dataset.k]; saveUi(); renderRows(); });
  renderCount();
}
function renderCount(){
  const l = currentList(), cnt = document.getElementById("cnt");
  if(l.ref){ cnt.innerHTML = `${l.items.filter(i=>i.cells).length}<small> items · reference</small>`; return; }
  const s = stats(l.items);
  cnt.innerHTML = `${s.d}<small> / ${s.t}</small>`;
  const bar = document.getElementById("bar");
  bar.querySelector("i").style.width = (s.t?s.d*100/s.t:0)+"%"; bar.classList.toggle("full", s.t>0 && s.d===s.t);
}
function toggleExtra(x){
  const id = x.dataset.x; if(state[id]) delete state[id]; else state[id]=true;
  save(); x.classList.toggle("on", isDone(id));
}
function toggle(id){
  if(state[id]) delete state[id]; else state[id]=true;
  save();
  const y = window.scrollY; renderRows(); window.scrollTo(0,y);
  renderMenu(); renderChars(); renderOverall();
  const l = currentList(), s = stats(l.items);
  if(isDone(id) && s.d===s.t) toast(`✦ ${l.title} complete! ✦`);
}
function bulk(v){
  const vis = visibleItems(currentList()); if(!vis.length) return;
  if(!confirm(`${v?"Check":"Uncheck"} ${vis.length} visible item(s)?`)) return;
  vis.forEach(i=>{ if(v) state[i.id]=true; else delete state[i.id]; });
  save(); renderAll();
}
function renderAll(){ applyTheme(); renderChars(); renderOverall(); renderMenu(); renderPanel(); }

let tt; function toast(m){ const t=document.getElementById("toast"); t.textContent=m; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("show"),2200); }

/* ---------- exportar / importar ---------- */
document.getElementById("exportBtn").onclick = ()=>{
  const blob = new Blob([JSON.stringify({app:KEY, game:C.name, date:new Date().toISOString(), progress:state},null,1)],{type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `${C.slug}-progress-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
};
document.getElementById("importBtn").onclick = ()=>document.getElementById("importFile").click();
document.getElementById("importFile").onchange = async e=>{
  const f = e.target.files[0]; if(!f) return;
  try{
    const j = JSON.parse(await f.text());
    if(j.app && j.app!==KEY && !confirm(`This file looks like it belongs to another game (${j.game||j.app}). Import anyway?`)) return;
    state = j.progress || j; save(); renderAll(); toast("Progress imported!");
  }catch(err){ alert("Invalid file."); }
  e.target.value = "";
};
document.getElementById("resetBtn").onclick = ()=>{
  if(!confirm(`Erase ALL progress for ${C.name}?\n\nTip: use "Export progress" first if you want to keep a backup.`)) return;
  state = {}; save(); renderAll(); toast("Progress reset.");
};

function fromHash(){
  const [g,l] = decodeURIComponent(location.hash.slice(1)).split("/");
  if(GROUPS.some(x=>x.id===g)){ ui.group=g; if(l) ui.list[g]=l; }
  if(!GROUPS.some(x=>x.id===ui.group)) ui.group = GROUPS[0].id;
}
fromHash();
window.addEventListener("hashchange",()=>{ fromHash(); renderAll(); });
saveHub();
renderAll();
})();
