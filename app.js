// ===== Geçici debug paneli (Mac olmadan konsol loglarını telefon ekranında görmek için) =====
(function(){
  const _origLog=console.log, _origWarn=console.warn, _origError=console.error;
  const _debugLines=[];
  function _pushDebug(kind,args){
    const text=args.map(a=>{
      if(typeof a==='object'){try{return JSON.stringify(a);}catch(e){return String(a);}}
      return String(a);
    }).join(' ');
    _debugLines.push({kind,text,time:new Date().toLocaleTimeString('tr-TR')});
    if(_debugLines.length>200)_debugLines.shift();
    _renderDebugPanel();
  }
  console.log=function(...args){_origLog.apply(console,args);_pushDebug('log',args);};
  console.warn=function(...args){_origWarn.apply(console,args);_pushDebug('warn',args);};
  console.error=function(...args){_origError.apply(console,args);_pushDebug('error',args);};

  function _renderDebugPanel(){
    const body=document.getElementById('debugPanelBody');
    if(!body)return;
    body.innerHTML=_debugLines.map(l=>{
      const color=l.kind==='error'?'#f87171':l.kind==='warn'?'#fbbf24':'#a7f3d0';
      return `<div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.08);font-family:monospace;font-size:10.5px;color:${color};white-space:pre-wrap;word-break:break-all;"><span style="opacity:.5;">${l.time}</span> ${l.text.replace(/</g,'&lt;')}</div>`;
    }).join('');
    body.scrollTop=body.scrollHeight;
  }

  window.addEventListener('DOMContentLoaded',()=>{
    const btn=document.createElement('div');
    btn.id='debugPanelToggle';
    btn.textContent='⚙️';
    btn.style.cssText='position:fixed;bottom:14px;left:14px;width:40px;height:40px;border-radius:20px;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;z-index:99999;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4);';
    btn.onclick=()=>{
      const panel=document.getElementById('debugPanel');
      if(panel)panel.style.display=panel.style.display==='none'?'flex':'none';
    };
    document.body.appendChild(btn);

    const panel=document.createElement('div');
    panel.id='debugPanel';
    panel.style.cssText='display:none;position:fixed;inset:auto 8px 62px 8px;max-height:50vh;background:rgba(10,5,15,.96);border:1px solid rgba(255,255,255,.15);border-radius:12px;z-index:99999;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,.6);';
    panel.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.12);">
        <span style="color:#fff;font-size:12px;font-weight:600;">Debug Konsolu</span>
        <div style="display:flex;gap:6px;">
          <button id="debugPanelCopy" style="background:rgba(124,58,237,.3);border:1px solid rgba(124,58,237,.5);color:#c4b5fd;font-size:10.5px;padding:4px 8px;border-radius:6px;">Kopyala</button>
          <button id="debugPanelClear" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:10.5px;padding:4px 8px;border-radius:6px;">Temizle</button>
        </div>
      </div>
      <div id="debugPanelBody" style="overflow-y:auto;flex:1;"></div>`;
    document.body.appendChild(panel);

    document.getElementById('debugPanelClear').onclick=()=>{_debugLines.length=0;_renderDebugPanel();};
    document.getElementById('debugPanelCopy').onclick=()=>{
      const text=_debugLines.map(l=>`[${l.time}] [${l.kind}] ${l.text}`).join('\n');
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(()=>{
          const b=document.getElementById('debugPanelCopy');
          b.textContent='Kopyalandı!';
          setTimeout(()=>{b.textContent='Kopyala';},1500);
        }).catch(()=>{alert(text);});
      } else {
        alert(text);
      }
    };
  });
})();
function esc(s){if(!s)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
const _coverColorCache={};
function extractCoverColors(src){
  return new Promise((resolve)=>{
    if(!src){resolve(null);return;}
    if(_coverColorCache[src]){resolve(_coverColorCache[src]);return;}
    const img=new Image();
    img.crossOrigin='anonymous';
    img.onload=()=>{
      try{
        const canvas=document.createElement('canvas');
        const sz=32; // küçük örnekleme yeterli, performans için
        canvas.width=sz;canvas.height=sz;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0,sz,sz);
        const data=ctx.getImageData(0,0,sz,sz).data;
        let r=0,g=0,b=0,n=0;
        let rDark=0,gDark=0,bDark=0,nDark=0;
        for(let i=0;i<data.length;i+=4){
          const rr=data[i],gg=data[i+1],bb=data[i+2],aa=data[i+3];
          if(aa<128)continue;
          r+=rr;g+=gg;b+=bb;n++;
          // Ayrıca en koyu %30'u da ayrı ortalayalım (gradient alt tonu için)
          const lum=(rr*0.299+gg*0.587+bb*0.114);
          if(lum<110){rDark+=rr;gDark+=gg;bDark+=bb;nDark++;}
        }
        if(n===0){resolve(null);return;}
        const avg={r:Math.round(r/n),g:Math.round(g/n),b:Math.round(b/n)};
        const dark=nDark>0?{r:Math.round(rDark/nDark),g:Math.round(gDark/nDark),b:Math.round(bDark/nDark)}:{r:Math.round(avg.r*0.4),g:Math.round(avg.g*0.4),b:Math.round(avg.b*0.4)};
        const result={avg,dark};
        _coverColorCache[src]=result;
        resolve(result);
      }catch(e){
        // CORS ya da başka bir okuma hatası olursa sessizce null dön, çağıran taraf varsayılan renge düşer
        resolve(null);
      }
    };
    img.onerror=()=>resolve(null);
    img.src=src;
  });
}

const THEME_KEY='megami_theme';
function getTheme(){return localStorage.getItem(THEME_KEY)||'dark';}
function applyTheme(t){
  if(t==='light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  const metaTheme=document.querySelector('meta[name="theme-color"]');
  if(metaTheme) metaTheme.setAttribute('content',t==='light'?'#f7f5fb':'#050507');
}
let _themeToggleTimes=[];
function toggleTheme(){
  const next=getTheme()==='light'?'dark':'light';
  localStorage.setItem(THEME_KEY,next);
  applyTheme(next);
  updateThemeToggleIcon();
  const now=Date.now();
  _themeToggleTimes.push(now);
  _themeToggleTimes=_themeToggleTimes.filter(t=>now-t<4000);
  if(_themeToggleTimes.length>=6){
    _themeToggleTimes=[];
    setTimeout(()=>{
      showToast('star',['💡 Karar veremedin mi? İkisi de güzel!','🔦 Işıkları açıp kapatmayı bırak artık!','🌗 Ay evreleri gibi... Karar ver!'][Math.floor(Math.random()*3)]);
    },100);
  }
}
function updateThemeToggleIcon(){
  const btn=document.getElementById('themeToggleBtn');
  if(!btn)return;
  const isLight=getTheme()==='light';
  const isSidebarItem=btn.classList.contains('sidebar-item');
  btn.title=isLight?'Aydınlık Tema (değiştir)':'Karanlık Tema (değiştir)';
  btn.innerHTML=(isLight?ic('sun',15):ic('moon',15))+(isSidebarItem?`<span class="sidebar-label">${isLight?' Aydınlık Tema':' Karanlık Tema'}</span>`:'');
}
applyTheme(getTheme());
const IC={book:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,zap:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,box:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,pause:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,xcirc:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,checkcirc:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,bookmark:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,moon:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,grid4:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,tr:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/><circle cx="8" cy="10" r="1.5" fill="currentColor" stroke="none"/></svg>`,globe:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="3.6" y1="9" x2="20.4" y2="9"/><line x1="3.6" y1="15" x2="20.4" y2="15"/><path d="M11.5 3a17 17 0 0 0 0 18"/><path d="M12.5 3a17 17 0 0 1 0 18"/></svg>`,edit:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,pin:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>`,pinFill:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="#e85d75" stroke="#e85d75" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22" stroke="#e85d75" stroke-width="2"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>`,star:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,starFill:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="#c9a227" stroke="#c9a227" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,check:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,warn:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,layers:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,users:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,bolt:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,img:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,chevron:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`,chevronLeft:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>`,more:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>`,clock:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,fire:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,close:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,trash:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,sun:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="4.2" y1="4.2" x2="5.9" y2="5.9"/><line x1="18.1" y1="18.1" x2="19.8" y2="19.8"/><line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/><line x1="4.2" y1="19.8" x2="5.9" y2="18.1"/><line x1="18.1" y1="5.9" x2="19.8" y2="4.2"/></svg>`,sparkle:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="#c9a227"><path d="M12 1 C10.2 7 7 10 1 12 C7 14 10.2 17 12 23 C13.8 17 17 14 23 12 C17 10 13.8 7 12 1 Z"/></svg>`,share:`<svg width="SZ" height="SZ" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>`,};
const _icCache={};
function ic(n,s=13){
  const k=n+'_'+s;
  if(_icCache[k]) return _icCache[k];
  const v=IC[n]?.replace(/SZ/g,s)||'';
  _icCache[k]=v; return v;
}
const SK='mangavault_v3';
const DB_NAME='MegamiDB', DB_VER=1, STORE='series';
let db=null;
function openDB(){
  return new Promise((resolve,reject)=>{
    if(db){resolve(db);return;}
    const req=indexedDB.open(DB_NAME,DB_VER);
    req.onupgradeneeded=e=>{
      const d=e.target.result;
      if(!d.objectStoreNames.contains(STORE))
        d.createObjectStore(STORE,{keyPath:'id'});
    };
    req.onsuccess=e=>{db=e.target.result;resolve(db);};
    req.onerror=e=>{console.error('IndexedDB error',e);reject(e);};
  });
}
async function save(){
  const d=await openDB();
  const tx=d.transaction(STORE,'readwrite');
  const st=tx.objectStore(STORE);
  st.clear();
  series.forEach(s=>st.put(s));
  return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=rej;});
}
async function load(){
  try{
    const d=await openDB();
    const tx=d.transaction(STORE,'readonly');
    const st=tx.objectStore(STORE);
    const req=st.getAll();
    await new Promise((res,rej)=>{req.onsuccess=res;req.onerror=rej;});
    series=req.result||[];
    const old=localStorage.getItem(SK);
    if(old&&series.length===0){
      try{
        const migrated=JSON.parse(old);
        if(migrated&&migrated.length>0){
          series=migrated;
          await save();
          localStorage.removeItem(SK);
          showToast('check','Veriler yeni depoya taşındı!');
        }
      } catch(e){}
    }
  } catch(e){
    try{series=JSON.parse(localStorage.getItem(SK))||[];}catch{series=[];}
  }
}
let series=[],editingId=null,currentPage='home',currentCat='all',searchQ='',currentSort=localStorage.getItem('megami_sort')||'default',currentDetailId=null;
// Safari'de input[type=text].value 512KB'ta sessizce kesildiği için, dosyadan yüklenen
// büyük base64 kapak verisini input'a değil, bu değişkene yazıyoruz.
let _pendingCoverData=null;
let selectionMode=false,selectedIds=new Set();
let altNames=[],oldCovers=[],fansubList=[],formFav=false,formPin=false,formRating=0;
let quickId=null,quickCat=null;
const SECTIONS=[
  {key:'pinned',  label:'Sabitlenmiş',                      icon:'pin',      cats:null, pinnedOnly:true},
  {key:'active',  label:'Okumaya Devam Ettiklerim',         icon:'book',     cats:['reading','current','current_en','current_both']},
  {key:'stock',   label:'Bölüm Biriktirenler',              icon:'box',      cats:['stockpile']},
  {key:'cont',    label:'Okumaya Devam Edilecek & Plan',    icon:'bookmark', cats:['paused','planned']},
  {key:'season',  label:'Sezon Arası',                      icon:'moon',     cats:['season']},
  {key:'done',    label:'Bitti',                            icon:'checkcirc',cats:['completed']},
  {key:'dropped', label:'Bırakılanlar',                     icon:'xcirc',    cats:['dropped']},
  {key:'favs',    label:'Favoriler',                        icon:'starFill', cats:null, favsOnly:true},
];
const CATS={
  all:      {label:'Tümü',          icon:'grid4',    badge:''},
  reading:  {label:'Okuyorum',      icon:'book',     badge:'b-reading'},
  current:      {label:'TR Güncel',   icon:'zap',      badge:'b-current'},
  current_en:   {label:'EN Güncel',   icon:'zap',      badge:'b-current-en'},
  current_both: {label:'TR+EN Güncel',icon:'zap',      badge:'b-current-both'},
  stockpile:{label:'Biriktiriyorum',icon:'box',      badge:'b-stockpile'},
  paused:   {label:'Ara Verdim',    icon:'pause',    badge:'b-paused'},
  dropped:  {label:'Bıraktım',      icon:'xcirc',    badge:'b-dropped'},
  completed:{label:'Bitti',         icon:'checkcirc',badge:'b-completed'},
  planned:  {label:'Planlıyorum',   icon:'bookmark', badge:'b-planned'},
  season:   {label:'Sezon Arası',   icon:'moon',     badge:'b-season'},
};
// ══ SIDEBAR TOGGLE ══
function updateStreak(){
  const today=new Date().toDateString();
  let data=JSON.parse(localStorage.getItem('mv_streak')||'{}');
  if(data.last===today){}
  else if(data.last===new Date(Date.now()-86400000).toDateString()){data.count=(data.count||0)+1;data.last=today;}
  else{data.count=1;data.last=today;}
  localStorage.setItem('mv_streak',JSON.stringify(data));
  const streakNumEl=document.getElementById('streakNum');
  if(streakNumEl)streakNumEl.textContent=data.count||1;
  const streakSidebarNumEl=document.getElementById('streakSidebarNum');
  if(streakSidebarNumEl)streakSidebarNumEl.textContent=data.count||1;
  if(data.count===7)  setTimeout(()=>{spawnConfetti();showToast('fire','7 günlük seri! Bir hafta boyunca buradayken! 🔥');},800);
  if(data.count===30) setTimeout(()=>{spawnConfetti();showToast('fire','30 gün! Sen artık bir efsanesin! 👑');},800);
  if(data.count===100)setTimeout(()=>{spawnConfetti();spawnConfetti();showToast('fire','100 GÜN! Bu gerçekten inanılmaz! 🏆');},800);
  if(data.count===365)setTimeout(()=>{spawnConfetti();spawnConfetti();spawnConfetti();showToast('fire','365 GÜN! Tam bir yıl! Sen artık bir efsane değil, bir destansın! 🐉👑');},800);
}
function showStreak(){
  const data=JSON.parse(localStorage.getItem('mv_streak')||'{}');
  showToast('fire',`${data.count||1} günlük seri çalışması! 🔥`);
}
let logoTaps=0,logoTimer=null;
function logoTap(){
  logoTaps++;
  clearTimeout(logoTimer);
  if(logoTaps>=7){logoTaps=0;triggerKonamiEffect();}
  else{
    logoTimer=setTimeout(()=>logoTaps=0,3000);
    if(logoTaps===3) showToast('star',['Devam et... 🤔','Hmm, bir şey mi arıyorsun?','İlginç... 👀'][Math.floor(Math.random()*3)]);
    if(logoTaps===5) showToast('star',['Neredeyse... ✨','Az kaldı!','Sabrın takdire şayan 🙂'][Math.floor(Math.random()*3)]);
  }
}
const KONAMI_SEQUENCE=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let _konamiProgress=[];
function checkKonamiSequence(key){
  const k=key.length===1?key.toLowerCase():key;
  _konamiProgress.push(k);
  if(_konamiProgress.length>KONAMI_SEQUENCE.length)_konamiProgress.shift();
  if(_konamiProgress.length===KONAMI_SEQUENCE.length&&_konamiProgress.every((v,i)=>v===KONAMI_SEQUENCE[i])){
    _konamiProgress=[];
    triggerRealKonamiEffect();
  }
}
function triggerRealKonamiEffect(){
  spawnConfetti();spawnConfetti();
  const el=document.createElement('div');
  el.className='konami-flash';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),700);
  showToast('star','🎮 GERÇEK KONAMI KODU! Sen bir efsanesin, 30 can hakkın var! 🕹️');
}
function triggerKonamiEffect(){
  const el=document.createElement('div');
  el.className='konami-flash';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),700);
  spawnConfetti();
  const msgs=[
    '✨ Gizli modu buldun! Okuma ruhu seninle! 📚',
    '🐉 7 kez tıkladın... Bu sabır bir manga kahramanına yakışır!',
    '🌸 Gizli bahçeyi keşfettin! Tebrikler!',
    "📖 Megami'nin kalbini açtın!"
  ];
  showToast('star',msgs[Math.floor(Math.random()*msgs.length)]);
}
function spawnConfetti(){
  const colors=['#7c3aed','#a78bfa','#c9a227','#e85d75','#34d399','#60a5fa'];
  for(let i=0;i<36;i++){
    const el=document.createElement('div');
    el.className='confetti-piece';
    el.style.cssText=`left:${Math.random()*100}%;top:-10px;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${1.2+Math.random()*1.8}s;animation-delay:${Math.random()*.5}s;transform:rotate(${Math.random()*360}deg);border-radius:${Math.random()>0.5?'50%':'2px'};`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),3500);
  }
}
function easterEggCheck(){
  const count=series.length;
  const completed=series.filter(s=>s.category==='completed').length;
  const msgs={
    10:  ['star','10 seri! Kütüphanen büyümeye başladı 📚'],
    25:  ['star','25 seri! Ciddi bir koleksiyoncu olmaya başladın 🎯'],
    50:  ['star','50 SERİ! Sen artık bir koleksiyon ustasisin! 🏅'],
    100: ['star','100 SERİ!!! Bu bir efsane! 👑'],
  };
  const completedMsgs={
    5:  ['check','5 seri bitirdin! İlk rozet: "Manga Başlangıcı" 🥉'],
    10: ['star','10 seri bitirdin! Rozet: "Sayfaları Fırçalayan" 🥈'],
    25: ['star','25 seri bitirdin! Rozet: "Manga Koleksiyoncusu" 🥇'],
    50: ['star','50 seri bitirdin! Efsane seviye: "Manga Tanrısı" 👑'],
  };
  if(msgs[count]){spawnConfetti();showToast(msgs[count][0],msgs[count][1]);}
  if(completedMsgs[completed]){setTimeout(()=>showToast(completedMsgs[completed][0],completedMsgs[completed][1]),1200);}
}
function checkMidnightEgg(){
  const h=new Date().getHours();
  const isLight=getTheme()==='light';
  if(h>=0&&h<4){
    const msgs=isLight?[
      'Gece yarısı ama tema aydınlık mı? Gözlerine acı 😅',
      '🌙 Saat '+h+'... Karanlık temaya geçmeyi düşünsene?',
      'Bu saatte hâlâ okuyorsun, en azından temanı karart 👀',
      '🦉 Gece kuşu modu aktif! Uyumak yok, manga var!',
    ]:[
      'Gece yarısı manga mı okuyorsun? 🌙 Uyku düşmanı!',
      '🦉 Gece kuşu modu aktif! Uyumak yok, manga var!',
      'Saat gece '+h+' ve hâlâ buradasın... Bağımlısın 😄',
      '🌙 Karanlık tema tam da bu saatler için var.',
    ];
    setTimeout(()=>showToast('moon',msgs[Math.floor(Math.random()*msgs.length)]),1500);
  } else if(h>=5&&h<7){
    const msgs=[
      '☀️ Sabahın köründe manga mı? Efsanesin!',
      '🐓 Horoz ötmeden önce buradasın, saygılar!',
      '☕ Kahve mi manga mı, ikisi de olsun?',
      '🌅 Gün doğumunu manga ile karşılamak farklı bir keyif.',
    ];
    setTimeout(()=>showToast('star',msgs[Math.floor(Math.random()*msgs.length)]),1500);
  }
}
function checkSearchEgg(q){
  if(!q||q.length<2) return;
  const match=series.find(s=>s.name.toLowerCase().includes(q));
  if(match&&Math.random()<0.25){
    const msgs=[
      `👀 "${match.name}" aklında mı?`,
      `📖 "${match.name}" seni bekliyor!`,
      `✨ Ah, "${match.name}"! Güzel zevk!`,
      `🔍 "${match.name}" bulundu!`,
    ];
    showToast('star',msgs[Math.floor(Math.random()*msgs.length)]);
  }
}
function expandUpcoming(){
  document.querySelectorAll('.upcoming-row').forEach(el=>el.style.display='flex');
  const btn=document.getElementById('upcomingMoreBtn');
  if(btn) btn.remove();
}
function luckyPick(){
  const pool=series.filter(s=>s.category==='planned'||s.category==='paused');
  if(!pool.length){showToast('warn','Planlanmış veya bekleyen seri yok!');return;}
  const pick=pool[Math.floor(Math.random()*pool.length)];
  const btn=document.querySelector('[onclick="luckyPick()"]');
  if(btn){
    btn.style.transform='scale(0.95)';
    btn.style.borderColor='var(--purple2)';
    btn.style.color='var(--purple3)';
    setTimeout(()=>{btn.style.transform='';btn.style.borderColor='';btn.style.color='';},300);
  }
  showToast('star',`🎲 Bugünkü serin: "${pick.name}"!`);
  setTimeout(()=>openDetail(pick.id),600);
}
function switchPage(p){
  if(currentPage==='detail'&&p!=='detail'){
    currentDetailId=null;
    _detailReturnState=null;
    history.pushState({},'',location.pathname);
  }
  currentPage=p;
  document.getElementById('searchWrap').style.display=p==='home'?'':'none';
  document.getElementById('catTabs').style.display=p==='home'?'':'none';
  renderContent();
  if(typeof updateRadialActive==='function') updateRadialActive();
  if(typeof closeRadial==='function') closeRadial();
}
const TAB_USAGE_KEY='megami_tab_usage';
let TAB_PRIORITY_COUNT_OVERRIDE=null; // Her layout kendi script'inde bu değeri ayarlayabilir
function getTabPriorityCount(){
  if(TAB_PRIORITY_COUNT_OVERRIDE!==null)return TAB_PRIORITY_COUNT_OVERRIDE;
  // Varsayılan: catTabsActions elementi varsa (masaüstü düzeni) 2, yoksa 0.
  return document.getElementById('catTabsActions')?2:0;
}
function getTabUsage(){
  try{return JSON.parse(localStorage.getItem(TAB_USAGE_KEY)||'{}');}catch(e){return {};}
}
function bumpTabUsage(cat){
  if(cat==='all')return; // Tümü zaten her zaman sabit, sayaç gereksiz
  const usage=getTabUsage();
  usage[cat]=(usage[cat]||0)+1;
  localStorage.setItem(TAB_USAGE_KEY,JSON.stringify(usage));
}
let _otherTabsOpen=false;
function renderTabs(){
  const tabPriorityCount=getTabPriorityCount();
  const usage=getTabUsage();
  const keys=Object.keys(CATS).filter(k=>k!=='all');
  const sorted=keys.slice().sort((a,b)=>(usage[b]||0)-(usage[a]||0));
  const priority=sorted.slice(0,tabPriorityCount);
  const rest=sorted.slice(tabPriorityCount);
  const currentInRest=rest.includes(currentCat);

  function tabBtn(k){
    const v=CATS[k];
    const n=k==='all'?series.length:series.filter(s=>s.category===k).length;
    const cnt=n>0?` <span style="opacity:.5;font-size:9px;">(${n})</span>`:'';
    return `<button class="cat-tab ${currentCat===k?'active':''}" onclick="setCat('${k}')">${ic(v.icon)} ${v.label}${cnt}</button>`;
  }

  let tabsHtml=tabBtn('all')+priority.map(tabBtn).join('');
  let menuHtml='';
  if(rest.length){
    const otherLabel=currentInRest?CATS[currentCat].label:'Diğer';
    const otherIcon=currentInRest?CATS[currentCat].icon:'chevron';
    tabsHtml+=`<button id="otherTabsBtn" class="cat-tab ${currentInRest?'active':''}" onclick="toggleOtherTabs(event)">${ic(otherIcon,10)} ${otherLabel} ${ic('chevron',9)}</button>`;
    menuHtml=`<div id="otherTabsMenu" class="autocomplete-dropdown ${_otherTabsOpen?'':'hidden'}" style="top:calc(100% + 4px);min-width:180px;max-height:220px;">
        ${rest.map(k=>{
          const v=CATS[k];
          const n=series.filter(s=>s.category===k).length;
          return `<div class="autocomplete-item ${currentCat===k?'active':''}" onclick="setCat('${k}');toggleOtherTabs()">${ic(v.icon,11)} ${v.label}${n>0?`<span style="margin-left:auto;opacity:.5;font-size:10px;">${n}</span>`:''}</div>`;
        }).join('')}
      </div>`;
  }
  document.getElementById('catTabs').innerHTML=tabsHtml;
  const row=document.getElementById('catTabsRow');
  let menuHost=document.getElementById('otherTabsMenuHost');
  if(row&&!menuHost){
    menuHost=document.createElement('div');
    menuHost.id='otherTabsMenuHost';
    menuHost.style.cssText='position:relative;width:0;height:0;overflow:visible;';
    row.appendChild(menuHost);
  }
  if(menuHost){
    menuHost.innerHTML=menuHtml;
    // Menü konumunu tetikleyici butona göre ayarla (cat-tabs kaydırmalı olduğu için sabit sol konum yanlış olabilir)
    if(_otherTabsOpen&&rest.length){
      const btn=document.getElementById('otherTabsBtn');
      const menu=document.getElementById('otherTabsMenu');
      if(btn&&menu&&row){
        const btnRect=btn.getBoundingClientRect();
        menu.style.position='fixed';
        menu.style.top=(btnRect.bottom+4)+'px';
        menu.style.left=btnRect.left+'px';
      }
    }
  }
}
function toggleOtherTabs(e){
  if(e)e.stopPropagation();
  _otherTabsOpen=!_otherTabsOpen;
  renderTabs();
  if(_otherTabsOpen){
    setTimeout(()=>{
      document.addEventListener('click',closeOtherTabsOnce,{once:true});
    },0);
  }
}
function closeOtherTabsOnce(){
  if(_otherTabsOpen){_otherTabsOpen=false;renderTabs();}
}
function setCat(c){
  currentCat=c;selectionMode=false;selectedIds.clear();
  bumpTabUsage(c);
  _otherTabsOpen=false;
  renderTabs();renderHome();
}
function toggleSelectionMode(){
  selectionMode=!selectionMode;
  if(!selectionMode)selectedIds.clear();
  renderHome();
}
function toggleSelect(id){
  if(selectedIds.has(id))selectedIds.delete(id);
  else selectedIds.add(id);
  renderHome();
}
function renderBulkBar(){
  const n=selectedIds.size;
  const hasRadial=!!document.getElementById('radialTrigger');
  const bottomOffset=hasRadial?'calc(96px + env(safe-area-inset-bottom,0px))':'calc(var(--nav-h,0px) + 12px)';
  return `<div id="bulkActionBar" style="position:fixed;left:12px;right:12px;bottom:${bottomOffset};z-index:150;background:rgba(20,10,32,.85);backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:10px 12px;display:flex;align-items:center;gap:8px;box-shadow:0 10px 30px rgba(0,0,0,.5);">
    <span style="font-size:12px;color:rgba(255,255,255,.7);white-space:nowrap;flex-shrink:0;">${n} seçili</span>
    <select class="form-select" style="flex:1;font-size:12px;padding:7px 9px;min-width:0;" onchange="if(this.value){bulkSetCategory(this.value);this.value='';}"><option value="">Kategori…</option>${Object.entries(CATS).filter(([k])=>k!=='all').map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select>
    <button class="hdr-btn" title="Sabitle" onclick="bulkPin()">${ic('pin',15)}</button>
    <button class="hdr-btn" title="Favorile" onclick="bulkFavorite()">${ic('star',15)}</button>
    <button class="hdr-btn" title="Sil" style="color:#f87171;" onclick="bulkDelete()">${ic('trash',15)}</button>
  </div>`;
}
function bulkPin(){
  if(selectedIds.size===0)return;
  series.forEach(s=>{if(selectedIds.has(s.id)){s.pinned=true;s.updatedAt=Date.now();}});
  save().then(()=>{
    showToast('check',`${selectedIds.size} seri sabitlendi.`);
    selectionMode=false;selectedIds.clear();
    renderTabs();renderHome();
  });
}
function bulkSetCategory(cat){
  if(selectedIds.size===0)return;
  series.forEach(s=>{if(selectedIds.has(s.id)){s.category=cat;s.updatedAt=Date.now();}});
  save().then(()=>{
    showToast('check',`${selectedIds.size} seri "${CATS[cat].label}" olarak güncellendi.`);
    selectionMode=false;selectedIds.clear();
    renderTabs();renderHome();
  });
}
function bulkFavorite(){
  if(selectedIds.size===0)return;
  series.forEach(s=>{if(selectedIds.has(s.id)){s.favorited=true;s.updatedAt=Date.now();}});
  save().then(()=>{
    showToast('star',`${selectedIds.size} seri favorilere eklendi.`);
    selectionMode=false;selectedIds.clear();
    renderTabs();renderHome();
  });
}
function bulkDelete(){
  if(selectedIds.size===0)return;
  const n=selectedIds.size;
  showConfirm(`${n} seriyi silmek istediğine emin misin?`,async()=>{
    const deletedSeries=series.filter(s=>selectedIds.has(s.id));
    series=series.filter(s=>!selectedIds.has(s.id));
    await save();
    selectionMode=false;selectedIds.clear();
    renderTabs();renderHome();
    showUndoBanner(`${n} seri silindi.`,async()=>{
      series=series.concat(deletedSeries);
      await save();renderTabs();renderHome();
      showToast('check','Seriler geri getirildi.');
    });
  });
}
let _searchDebounceTimer=null;
function handleSearch(){
  clearTimeout(_searchDebounceTimer);
  _searchDebounceTimer=setTimeout(()=>{
    searchQ=document.getElementById('searchInput').value.toLowerCase();
    if(searchQ.length>2) checkSearchEgg(searchQ);
    renderHome();
  },180);
}
const SORT_OPTIONS={
  default:{label:'Varsayılan',fn:null},
  updated:{label:'Son Güncellenen',fn:(a,b)=>(b.updatedAt||0)-(a.updatedAt||0)},
  name_az:{label:'İsim (A-Z)',fn:(a,b)=>a.name.localeCompare(b.name,'tr')},
  name_za:{label:'İsim (Z-A)',fn:(a,b)=>b.name.localeCompare(a.name,'tr')},
  rating:{label:'Puan (Yüksek-Düşük)',fn:(a,b)=>(b.rating||0)-(a.rating||0)},
  newest:{label:'Yeni Eklenen',fn:(a,b)=>b.id.localeCompare(a.id)},
};
function setSort(val){
  currentSort=val;
  localStorage.setItem('megami_sort',val);
  renderHome();
}
function sortSeries(arr){
  const opt=SORT_OPTIONS[currentSort];
  if(!opt||!opt.fn)return arr;
  return [...arr].sort(opt.fn);
}
function syncCatTabsActions(){
  const bar=document.getElementById('catTabsActions');
  if(!bar)return; // mobile'da bu element yok, orada eski inline davranış kullanılır
  document.getElementById('selBtnLabel').innerHTML=`${selectionMode?ic('close',12):ic('check',12)} ${selectionMode?'Vazgeç':'Seç'}`;
  const sel=document.getElementById('homeSortSelect');
  if(sel)sel.innerHTML=Object.entries(SORT_OPTIONS).map(([k,v])=>`<option value="${k}" ${currentSort===k?'selected':''}>${v.label}</option>`).join(''); // mobile.html'de artık bu select yok
}
function renderHome(){
  const el=document.getElementById('mainContent');
  const hasFixedActions=!!document.getElementById('catTabsActions');
  if(hasFixedActions)syncCatTabsActions();
  let filtered=series.filter(s=>{
    const mc=currentCat==='all'||s.category===currentCat;
    const ms=!searchQ||s.name.toLowerCase().includes(searchQ)||(s.altNames||[]).some(a=>a.toLowerCase().includes(searchQ))||(s.fansubList||[]).some(f=>f.toLowerCase().includes(searchQ));
    return mc&&ms;
  });
  const banner='';
  if(!filtered.length){
    el.innerHTML=(banner?'<div style="padding:0">'+banner+'</div>':'')+`<div class="empty"><div class="empty-icon">${ic('book',48)}</div><h3>${series.length===0?'Kütüphane Boş':'Sonuç Bulunamadı'}</h3><p>${series.length===0?'+ butonuna basarak ilk serini ekleyebilirsin.':'Farklı bir arama veya kategori dene.'}</p></div>`;
    return;
  }
  if(searchQ||currentCat!=='all'){
    const sorted=sortSeries(filtered);
    const sortBar=hasFixedActions?'':`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:0 12px 8px;"><button class="btn-secondary" style="width:auto;padding:6px 12px;" onclick="toggleSelectionMode()">${selectionMode?ic('close',12):ic('check',12)} ${selectionMode?'Vazgeç':'Seç'}</button><select class="form-select" style="width:auto;font-size:11px;padding:5px 9px;" onchange="setSort(this.value)">${Object.entries(SORT_OPTIONS).map(([k,v])=>`<option value="${k}" ${currentSort===k?'selected':''}>${v.label}</option>`).join('')}</select></div>`;
    const bulkBar=selectionMode?renderBulkBar():'';
    el.innerHTML=(banner?'<div style="padding:0">'+banner+'</div>':'')+sortBar+`<div class="flat-grid">${sorted.map((s,i)=>flatCard(s,i)).join('')}</div>`+bulkBar;
    return;
  }
  let html=banner?`<div style="padding:0">${banner}</div>`:'';
  if(!hasFixedActions){
    html+=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:0 12px 8px;"><button class="btn-secondary" style="width:auto;padding:6px 12px;" onclick="toggleSelectionMode()">${selectionMode?ic('close',12):ic('check',12)} ${selectionMode?'Vazgeç':'Seç'}</button><select class="form-select" style="width:auto;font-size:11px;padding:5px 9px;" onchange="setSort(this.value)">${Object.entries(SORT_OPTIONS).map(([k,v])=>`<option value="${k}" ${currentSort===k?'selected':''}>${v.label}</option>`).join('')}</select></div>`;
  }
  SECTIONS.forEach(sec=>{
    let items;
    if(sec.pinnedOnly) items=filtered.filter(s=>s.pinned);
    else if(sec.favsOnly) items=filtered.filter(s=>s.favorited&&!s.pinned);
    else items=filtered.filter(s=>!s.pinned&&!s.favorited&&sec.cats.includes(s.category));
    if(!items.length) return;
    const canReorder=sec.pinnedOnly&&currentSort==='default'&&!searchQ&&currentCat==='all';
    items=sortSeries(items);
    const MAX_SHOW = 9;
    const seeAllCat = sec.cats ? sec.cats[0] : 'all';
    const shown = items.slice(0, MAX_SHOW);
    const extra = items.length - MAX_SHOW;
    const moreCard = extra > 0 ? `
      <div onclick="setCat('${seeAllCat}')" style="flex-shrink:0;width:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--black3);border:1px dashed var(--line2);border-radius:var(--r);cursor:pointer;color:var(--text3);padding:12px 8px;transition:all .18s;" onmouseenter="this.style.color='var(--purple3)'" onmouseleave="this.style.color='var(--text3)'"><div style="width:36px;height:36px;border-radius:50%;background:var(--black5);border:1px solid var(--line2);display:flex;align-items:center;justify-content:center;">${ic('chevron',16)}</div><span style="font-size:10px;font-weight:600;text-align:center;">+${extra}<br>daha</span></div>` : '';
    const reorderHint=canReorder&&shown.length>1?`<span style="font-size:9.5px;color:var(--text3);margin-left:6px;">(sürükleyerek sırala)</span>`:'';
    html+=`<div class="home-sec"><div class="sec-header"><div class="sec-header-left"><div class="sec-title">${ic(sec.icon,11)} ${sec.label}</div><span class="sec-count-pill">${items.length}</span>${reorderHint}</div>
        ${items.length > MAX_SHOW ? `<div class="sec-see-all" onclick="setCat('${seeAllCat}')">Tümü ${ic('chevron',11)}</div>` : ''}
      </div><div class="carousel-wrap"><button class="carousel-arrow left" onclick="scrollCarousel(this,-1)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></button><div class="carousel" id="car-${sec.key}">${shown.map((s,i)=>carouselCard(s,i,canReorder)).join('')}${moreCard}</div><button class="carousel-arrow right" onclick="scrollCarousel(this,1)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></button></div></div>`;
  });
  const homeBulkBar=selectionMode?renderBulkBar():'';
  el.innerHTML=(html||`<div class="empty"><div class="empty-icon">${ic('book',48)}</div><h3>Kütüphane Boş</h3><p>+ butonuna basarak ilk serini ekleyebilirsin.</p></div>`)+homeBulkBar;
  initPinnedDragSort();
}
function carouselCard(s,i,canReorder){
  const cat=CATS[s.category]||CATS.reading;
  const cover=s.cover
    ?`<img class="card-cover" src="${esc(s.cover)}" loading="lazy" onerror="console.warn('[Megami] Kapak yüklenemedi:', this.src);this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="card-cover-ph" style="display:none">${ic('img',18)}</div>`
    :`<div class="card-cover-ph">${ic('img',18)}</div>`;
  const chTR=parseInt(s.chapterTR)||0,total=parseInt(s.chapterTotal)||0;
  const pct=total>0&&chTR>0?Math.min(100,Math.round((chTR/total)*100)):0;
  const pinB=s.pinned?`<div class="pin-badge">${ic('pin',8)}</div>`:'<div></div>';
  const favB=s.favorited?`<div class="fav-badge">${ic('star',8)}</div>`:'';
  const ratingDots=s.rating?'<div style="display:flex;gap:2px;margin-top:2px;">'+[1,2,3,4,5].map(n=>'<div style="width:5px;height:5px;border-radius:50%;background:'+(n<=s.rating?'var(--gold)':'var(--line2)')+';"></div>').join('')+'</div>':'';
  const isSel=selectedIds.has(s.id);
  const clickAction=selectionMode?`toggleSelect('${s.id}')`:`openDetail('${s.id}',event)`;
  const selCheck=selectionMode?`<div style="position:absolute;top:5px;right:5px;z-index:6;width:19px;height:19px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid ${isSel?'var(--purple2)':'rgba(255,255,255,.5)'};background:${isSel?'var(--purple2)':'rgba(0,0,0,.35)'};">${isSel?ic('check',11):''}</div>`:'';
  const dragAttrs=canReorder&&!selectionMode?`draggable="true" data-series-id="${s.id}" ondragstart="pinDragStart(event)" ondragend="pinDragEnd(event)"`:'';
  return `<div class="series-card ${s.pinned?'pinned':''} ${s.favorited&&!s.pinned?'favorited':''} ${isSel?'selected-card':''}" ${dragAttrs} style="animation-delay:${i*.03}s;${isSel?'outline:2px solid var(--purple2);outline-offset:-1px;':''}${canReorder&&!selectionMode?'cursor:grab;':''}" onclick="${clickAction}"><div class="card-cover-wrap">
      ${cover}
      ${selCheck}
      <div class="card-overlay-badges">${pinB}<div style="flex:1"></div>${favB}</div>
      ${s.newChapter?'<div class="new-chapter-badge">Yeni Bölüm</div>':''}${selectionMode?'':`<div class="card-quick-btn" onclick="event.stopPropagation();openQuick('${s.id}')">${ic('more',14)}</div>`}</div>
    ${pct>0?`<div class="card-progress"><div class="card-progress-fill" style="width:${pct}%"></div></div>`:'<div class="card-progress"></div>'}
    <div class="card-body"><div class="card-cat-badge ${cat.badge}">${ic(cat.icon,8)} ${cat.label}</div><div class="card-title">${esc(s.name)}</div>
      ${s.chapterTR?`<div class="card-ch">${ic('tr',9)} Böl.${s.chapterTR}${total>0?' /'+total:''}</div>`:''}
      ${ratingDots}
    </div></div>`;
}
function flatCard(s,i){
  const cat=CATS[s.category]||CATS.reading;
  const cover=s.cover
    ?`<img class="card-cover" src="${esc(s.cover)}" loading="lazy" onerror="console.warn('[Megami] Kapak yüklenemedi:', this.src);this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="card-cover-ph" style="display:none">${ic('img',18)}</div>`
    :`<div class="card-cover-ph">${ic('img',18)}</div>`;
  const chTR=parseInt(s.chapterTR)||0,total=parseInt(s.chapterTotal)||0;
  const pct=total>0&&chTR>0?Math.min(100,Math.round((chTR/total)*100)):0;
  const pinB=s.pinned?`<div class="pin-badge">${ic('pin',8)}</div>`:'<div></div>';
  const favB=s.favorited?`<div class="fav-badge">${ic('star',8)}</div>`:'';
  const isSel=selectedIds.has(s.id);
  const clickAction=selectionMode?`toggleSelect('${s.id}')`:`openDetail('${s.id}',event)`;
  const selCheck=selectionMode?`<div style="position:absolute;top:5px;right:5px;z-index:6;width:19px;height:19px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid ${isSel?'var(--purple2)':'rgba(255,255,255,.5)'};background:${isSel?'var(--purple2)':'rgba(0,0,0,.35)'};">${isSel?ic('check',11):''}</div>`:'';
  return `<div class="series-card ${s.pinned?'pinned':''} ${s.favorited&&!s.pinned?'favorited':''} ${isSel?'selected-card':''}" style="animation-delay:${i*.025}s;width:100%;${isSel?'outline:2px solid var(--purple2);outline-offset:-1px;':''}" onclick="${clickAction}"><div class="card-cover-wrap">
      ${cover}
      ${selCheck}
      <div class="card-overlay-badges">${pinB}<div style="flex:1"></div>${favB}</div>${selectionMode?'':`<div class="card-quick-btn" onclick="event.stopPropagation();openQuick('${s.id}')">${ic('more',14)}</div>`}</div>
    ${pct>0?`<div class="card-progress"><div class="card-progress-fill" style="width:${pct}%"></div></div>`:'<div class="card-progress"></div>'}
    <div class="card-body"><div class="card-cat-badge ${cat.badge}">${ic(cat.icon,8)} ${cat.label}</div><div class="card-title">${esc(s.name)}</div>
      ${s.chapterTR?`<div class="card-ch">${ic('tr',9)} Böl.${s.chapterTR}${total>0?' /'+total:''}</div>`:''}
    </div></div>`;
}
function openQuick(id){
  const s=series.find(x=>x.id===id);if(!s)return;
  quickId=id;quickCat=s.category;quickSkipping=false;
  document.getElementById('quickTitle').textContent=s.name;
  document.getElementById('quickSub').textContent=
    [CATS[s.category]?.label, s.releaseDay?`📅 ${s.releaseDay}`:''].filter(Boolean).join(' · ');
  document.getElementById('quickTR').value=s.chapterTR||0;
  document.getElementById('quickEN').value=s.chapterEN||0;
  document.getElementById('statusGrid').innerHTML=Object.entries(CATS).filter(([k])=>k!=='all').map(([k,v])=>
    `<div class="status-chip ${quickCat===k?'active':''}" onclick="selectQuickCat('${k}')">${ic(v.icon,12)} ${v.label}</div>`
  ).join('');
  const skipWrap=document.getElementById('skipWrap');
  const btn=document.getElementById('skipBtn');
  if(s.autoIncrFreq&&s.autoIncrAmt>0){
    skipWrap.style.display='';
    btn.style.background='';btn.style.borderColor='';btn.style.color='';
    const freqLabel={daily:'Günü',weekly:'Haftayı',monthly:'Ayı'}[s.autoIncrFreq]||'Periyodu';
    btn.innerHTML=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Bu ${freqLabel} Atla`;
  } else {
    skipWrap.style.display='none';
  }
  document.getElementById('quickOverlay').classList.remove('hidden');
}
function selectQuickCat(k){
  quickCat=k;
  document.querySelectorAll('.status-chip').forEach(el=>el.classList.remove('active'));
  event.currentTarget.classList.add('active');
}
function stepCh(lang,delta){
  const inp=document.getElementById('quick'+lang);
  inp.value=Math.max(0,(parseInt(inp.value)||0)+delta);
}
async function saveQuick(){
  const s=series.find(x=>x.id===quickId);if(!s)return;
  const prevCat=s.category;
  const prevTR=s.chapterTR;
  s.chapterTR=document.getElementById('quickTR').value||'';
  s.chapterEN=document.getElementById('quickEN').value||'';
  s.category=quickCat;
  s.updatedAt=Date.now();
  if(quickSkipping&&s.autoIncrFreq){
    const pk=periodKey(s.autoIncrFreq);
    s.autoIncrSkips=s.autoIncrSkips||[];
    if(!s.autoIncrSkips.includes(pk)) s.autoIncrSkips.push(pk);
    s.autoIncrSkips=s.autoIncrSkips.slice(-20);
    addLog(s.id,`Otomatik artırma bu periyot atlandı.`);
  }
  if(s.chapterTR!==prevTR) addLog(s.id,`TR bölüm ${prevTR||0}→${s.chapterTR}`);
  if(quickCat==='completed'&&prevCat!=='completed'){
    setTimeout(()=>{spawnConfetti();showToast('star','Tebrikler! Seriyi bitirdin! 🎉');},300);
  }
  await save();closeSheet('quickOverlay');renderTabs();
  if(currentPage==='detail'&&currentDetailId===s.id)openDetail(s.id,true);else renderContent();
  if(quickCat!=='completed'||prevCat==='completed') showToast('check','Güncellendi.');
}
const ALT_LIMIT=3, FANSUB_LIMIT=3, LOG_LIMIT=3;
function buildCountdown(s){
  if(s.category!=='season'||!s.returnDate) return '';
  const diff=Math.ceil((new Date(s.returnDate)-new Date())/(1000*60*60*24));
  if(diff<=0) return '<div class="countdown-box"><div><div class="countdown-label">Geri Dönüş</div><div class="countdown-days" style="color:var(--green);">Bugün!</div><div class="countdown-sub">'+esc(s.returnDate)+'</div></div><div class="countdown-icon">'+ic('checkcirc',28)+'</div></div>';
  return '<div class="countdown-box"><div><div class="countdown-label">Sezon Dönüşüne</div><div class="countdown-days">'+diff+'</div><div class="countdown-sub">gün kaldı · '+esc(s.returnDate)+'</div></div><div class="countdown-icon">'+ic('clock',28)+'</div></div>';
}

function getSeriesDetailSections(s){
  const id=s.id;
  const chTR=parseInt(s.chapterTR)||0, total=parseInt(s.chapterTotal)||0;
  const pct=total>0&&chTR>0?Math.min(100,Math.round((chTR/total)*100)):0;
  const alts=s.altNames||[];
  const altH=alts.length?`<div><div class="detail-sec-title">${ic('layers',10)} Alternatif Adlar</div><div class="alt-tags-wrap" id="altWrap-${id}">
      ${alts.slice(0,ALT_LIMIT).map(a=>`<span class="alt-tag">${esc(a)}</span>`).join('')}
      ${alts.length>ALT_LIMIT?`<span class="alt-tag more-toggle" onclick="expandTags('altWrap-${id}','${id}','alts')" style="cursor:pointer;border-color:var(--purple);color:var(--purple3);">+${alts.length-ALT_LIMIT} daha</span>`:''}
    </div></div>`:'';
  const fans=s.fansubList||[];
  const fanH=fans.length?`<div><div class="detail-sec-title">${ic('users',10)} Fansub / Çeviri Ekibi</div><div class="alt-tags-wrap" id="fanWrap-${id}">
      ${fans.slice(0,FANSUB_LIMIT).map(f=>`<span class="fansub-tag">${ic('bolt',9)} ${esc(f)}</span>`).join('')}
      ${fans.length>FANSUB_LIMIT?`<span class="fansub-tag more-toggle" onclick="expandTags('fanWrap-${id}','${id}','fans')" style="cursor:pointer;opacity:.8;">+${fans.length-FANSUB_LIMIT} daha</span>`:''}
    </div></div>`:'';
  const oldC=s.oldCovers||[];
  const oldCH=oldC.length?`<div><div class="detail-sec-title">${ic('img',10)} Eski Kapaklar</div><div class="old-covers-row" id="oldCRow-${id}">
      ${oldC.slice(0,4).map(c=>`<img class="old-cover-thumb" src="${esc(c)}" loading="lazy" onclick="openLightbox('${esc(c)}')" style="cursor:zoom-in;">`).join('')}
      ${oldC.length>4?`<div class="old-cover-more" onclick="expandOldCovers('${id}')" style="flex-shrink:0;width:60px;height:84px;border-radius:7px;border:1px dashed var(--line2);background:var(--black3);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text3);font-size:11px;font-weight:600;">+${oldC.length-4}</div>`:''}
    </div></div>`:'';
  const noteH=s.note?`<div><div class="detail-sec-title">${ic('edit',10)} Kişisel Not</div><div class="note-box">${formatNote(s.note)}</div></div>`:'';
  const ratingH=s.rating?`<div style="display:flex;align-items:center;gap:6px;">
    ${[1,2,3,4,5].map(n=>`<span style="font-size:18px;line-height:1;">${n<=s.rating?'★':'☆'}</span>`).join('')}
    <span style="font-size:11px;color:var(--text3);">${s.rating}/5</span></div>`:'';
  const log=JSON.parse(localStorage.getItem('mv_log_'+id)||'[]').reverse();
  const logH=log.length?`<div><div class="detail-sec-title">${ic('clock',10)} Son Güncellemeler</div><div style="background:var(--black4);border:1px solid var(--line);border-radius:10px;padding:10px 12px;" id="logWrap-${id}">
      ${log.slice(0,LOG_LIMIT).map(l=>`<div class="log-entry"><div class="log-dot"></div><div class="log-text">${esc(l.text)}</div><div class="log-time">${timeAgo(l.ts)}</div></div>`).join('')}
      ${log.length>LOG_LIMIT?`<div onclick="expandLog('${id}')" style="text-align:center;padding:6px 0 2px;font-size:11px;color:var(--purple3);cursor:pointer;">+${log.length-LOG_LIMIT} daha göster</div>`:''}
    </div></div>`:'';
  const countdownH=buildCountdown(s);
  return {chTR,total,pct,altH,fanH,oldCH,noteH,ratingH,logH,countdownH};
}
let _detailReturnState=null; // detay sayfasına girmeden önceki sayfa/scroll durumu
function openDetail(id,skipHistory){
  const s=series.find(x=>x.id===id); if(!s) return;
  if(s.newChapter){ s.newChapter=false; save(); }
  if(currentPage!=='detail'){
    _detailReturnState={page:currentPage};
  }
  currentPage='detail';
  currentDetailId=id;
  const cat=CATS[s.category]||CATS.reading;
  const bgS=s.cover?`background-image:url('${esc(s.cover)}')`:'background:var(--black4)';
  const coverImg=s.cover
    ?`<img class="detail-cover-img" src="${esc(s.cover)}" onerror="this.style.display='none'" onclick="openLightbox('${esc(s.cover)}')">`
    :``;
  const {chTR,total,pct,altH,fanH,oldCH,noteH,ratingH,logH,countdownH}=getSeriesDetailSections(s);
  const el=document.getElementById('mainContent');
  el.innerHTML=`
    <div class="detail-page-backbtn" onclick="closeDetail()">${ic('chevronLeft',15)} <span>Geri</span></div>
    <div class="detail-cover-wrap">
      <div class="detail-cover-bg" style="${bgS}"></div>
      <div class="detail-cover-gradient"></div>
      <div class="detail-badges-row">
        ${s.pinned?`<span class="detail-pill" style="background:var(--pinG);color:var(--pin);">${ic('pin',9)} Sabitli</span>`:''}
        ${s.favorited?`<span class="detail-pill" style="background:var(--gold2);color:var(--gold);">${ic('star',9)} Favori</span>`:''}
      </div>
      <div class="detail-cover-info">
        <div class="detail-cover-title">${esc(s.name)}</div>
        <div class="detail-cover-meta">
          <span class="card-cat-badge ${cat.badge}">${ic(cat.icon)} ${cat.label}</span>
          ${s.releaseDay?`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:3px 8px;font-size:10px;color:rgba(255,255,255,.85);backdrop-filter:blur(8px);">${ic('clock',10)} ${esc(s.releaseDay)}</span>`:''}
          ${s.chapterTR?`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:3px 8px;font-size:10px;color:rgba(255,255,255,.75);backdrop-filter:blur(8px);">${ic('tr',10)} ${s.chapterTR}${total>0?' / '+total:''}</span>`:''}
          ${s.chapterEN?`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:3px 8px;font-size:10px;color:rgba(255,255,255,.75);backdrop-filter:blur(8px);">${ic('globe',10)} ${s.chapterEN}</span>`:''}
        </div>
      </div>
      ${coverImg}
    </div>
    <div class="detail-body">
      ${ratingH}
      ${pct>0?`<div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:5px;"><span>İlerleme</span><span>%${pct}</span></div>
        <div style="height:5px;background:var(--black3);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--purple),var(--purple3));border-radius:3px;"></div></div>
      </div>`:''}
      ${countdownH}${altH}${fanH}${oldCH}${noteH}${logH}
      <div class="detail-action-row">
        <div class="action-chip ${s.pinned?'chip-pin':''}" onclick="togglePin('${s.id}')">${s.pinned?ic('pinFill',13):ic('pin',13)} ${s.pinned?'Sabiti Kaldır':'Sabitle'}</div>
        <div class="action-chip ${s.favorited?'chip-fav':''}" onclick="toggleFav('${s.id}')">${s.favorited?ic('starFill',13):ic('star',13)} ${s.favorited?'Favoriden Çıkar':'Favorile'}</div>
      </div>
      <button class="btn-primary" onclick="openEditSheet('${s.id}')">${ic('edit',13)} Düzenle</button>
      <button class="btn-ghost" onclick="openQuick('${s.id}')">${ic('bolt',13)} Hızlı Düzenle</button>
    </div>`;
  el.scrollTop=0;
  document.getElementById('searchWrap').style.display='none';
  document.getElementById('catTabs').style.display='none';
  if(!skipHistory){
    history.pushState({megamiDetail:id},'',location.pathname+'?seri='+encodeURIComponent(id));
  }
}
function closeDetail(){
  const returnPage=(_detailReturnState&&_detailReturnState.page)||'home';
  _detailReturnState=null;
  currentDetailId=null;
  currentPage=returnPage;
  history.pushState({},'',location.pathname);
  const navHomeEl=document.getElementById('navHome');
  const navStatsEl=document.getElementById('navStats');
  if(navHomeEl)navHomeEl.classList.toggle('active',returnPage==='home');
  if(navStatsEl)navStatsEl.classList.toggle('active',returnPage==='stats');
  document.getElementById('searchWrap').style.display=returnPage==='home'?'':'none';
  document.getElementById('catTabs').style.display=returnPage==='home'?'':'none';
  renderContent();
  if(typeof updateRadialActive==='function') updateRadialActive();
}
window.addEventListener('popstate',()=>{
  // Mobile'a özel: Seri Ekle/Düzenle formu açıksa, geri tuşu önce onu kapatmalı.
  if(typeof _formPageWasOpen!=='undefined'&&_formPageWasOpen){
    const addEl=document.getElementById('addOverlay');
    if(addEl&&!addEl.classList.contains('hidden')){
      _formPageWasOpen=false;
      addEl.classList.add('closing');
      setTimeout(()=>{addEl.classList.add('hidden');addEl.classList.remove('closing');},260);
      return;
    }
  }
  const params=new URLSearchParams(location.search);
  const seriId=params.get('seri');
  if(seriId&&series.find(x=>x.id===seriId)){
    openDetail(seriId,true);
  } else if(currentPage==='detail'){
    closeDetail();
  }
});
function expandTags(wrapId, seriesId, type){
  const s=series.find(x=>x.id===seriesId); if(!s) return;
  const items=type==='alts'?(s.altNames||[]):(s.fansubList||[]);
  const wrap=document.getElementById(wrapId); if(!wrap) return;
  if(type==='alts'){
    wrap.innerHTML=items.map(a=>`<span class="alt-tag">${esc(a)}</span>`).join('');
  } else {
    wrap.innerHTML=items.map(f=>`<span class="fansub-tag">${ic('bolt',9)} ${esc(f)}</span>`).join('');
  }
}
function expandOldCovers(id){
  const s=series.find(x=>x.id===id); if(!s) return;
  const row=document.getElementById('oldCRow-'+id); if(!row) return;
  row.innerHTML=(s.oldCovers||[]).map(c=>`<img class="old-cover-thumb" src="${esc(c)}" loading="lazy" onclick="openLightbox('${esc(c)}')" style="cursor:zoom-in;">`).join('');
}
function expandLog(id){
  const log=JSON.parse(localStorage.getItem('mv_log_'+id)||'[]').reverse();
  const wrap=document.getElementById('logWrap-'+id); if(!wrap) return;
  wrap.innerHTML=log.map(l=>`<div class="log-entry"><div class="log-dot"></div><div class="log-text">${esc(l.text)}</div><div class="log-time">${timeAgo(l.ts)}</div></div>`).join('');
}
function timeAgo(ts){
  const d=Date.now()-ts;
  if(d<60000)return 'Az önce';
  if(d<3600000)return Math.floor(d/60000)+' dk önce';
  if(d<86400000)return Math.floor(d/3600000)+' saat önce';
  return Math.floor(d/86400000)+' gün önce';
}
function addLog(id,text){
  const log=JSON.parse(localStorage.getItem('mv_log_'+id)||'[]');
  log.push({text,ts:Date.now()});
  if(log.length>20)log.shift();
  localStorage.setItem('mv_log_'+id,JSON.stringify(log));
}
async function togglePin(id){
  const s=series.find(x=>x.id===id);if(!s)return;
  s.pinned=!s.pinned;await save();renderTabs();
  if(currentPage==='detail'&&currentDetailId===id)openDetail(id,true);else renderContent();
  showToast('check',s.pinned?'Seri sabitlendi.':'Sabitleme kaldırıldı.');
}
async function toggleFav(id){
  const s=series.find(x=>x.id===id);if(!s)return;
  s.favorited=!s.favorited;await save();renderTabs();
  if(currentPage==='detail'&&currentDetailId===id)openDetail(id,true);else renderContent();
  showToast(s.favorited?'star':'check',s.favorited?'Favorilere eklendi.':'Favorilerden çıkarıldı.');
  if(s.favorited)checkFavoriteMilestone();
}
function checkFavoriteMilestone(){
  const favCount=series.filter(x=>x.favorited).length;
  const msgs={5:'⭐ 5 favori! Zevkin belli oluyor.',15:'🌟 15 favori! Seçici bir okuyucusun.',30:'💫 30 favori! Favori listen de bir kütüphane oldu.'};
  if(msgs[favCount])setTimeout(()=>showToast('star',msgs[favCount]),900);
}
function showAddOverlay(){
  document.getElementById('addOverlay').classList.remove('hidden');
  if(typeof onAddOverlayShown==='function') onAddOverlayShown();
}
function openAddSheet(){
  editingId=null;altNames=[];oldCovers=[];fansubList=[];formFav=false;formPin=false;formRating=0;
  _pendingCoverData=null;
  document.getElementById('addSheetTitle').textContent='Yeni Seri';
  ['seriesName','altNameInput','fansubInput','coverUrlInput','seriesNote','chapterTotal','autoIncrAmt'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('autoIncrFreq').value='';
  document.getElementById('autoIncrDay').value='1';
  document.getElementById('autoIncrDate').value='1';
  document.getElementById('releaseDayNote').value='';
  document.getElementById('incrDayWrap').style.display='none';
  document.getElementById('incrDateWrap').style.display='none';
  document.getElementById('incrIrregularWrap').style.display='none';
  document.getElementById('returnDate').value='';
  document.getElementById('returnDateWrap').style.display='none';
  document.getElementById('incrAmtWrap').style.opacity='0.35';
  document.getElementById('incrAmtWrap').style.pointerEvents='none';
  document.getElementById('altTagsWrap').innerHTML='';document.getElementById('fansubTagsWrap').innerHTML='';hideFansubSuggestions();
  document.getElementById('oldCoversPreviews').innerHTML='';
  document.getElementById('seriesCategory').value='reading';
  document.getElementById('chapterTR').value='';document.getElementById('chapterEN').value='';
  resetCoverPreview();updateFormToggles();renderRatingStars(0);
  document.getElementById('deleteBtn').classList.add('hidden');
  showAddOverlay();
}
function openEditSheet(id){
  const s=series.find(x=>x.id===id);if(!s)return;
  editingId=id;altNames=[...(s.altNames||[])];oldCovers=[...(s.oldCovers||[])];fansubList=[...(s.fansubList||[])];
  formFav=!!s.favorited;formPin=!!s.pinned;formRating=s.rating||0;
  document.getElementById('addSheetTitle').textContent='Seriyi Düzenle';
  document.getElementById('seriesName').value=s.name||'';
  document.getElementById('seriesCategory').value=s.category||'reading';
  document.getElementById('chapterTR').value=s.chapterTR||'';
  document.getElementById('chapterEN').value=s.chapterEN||'';
  document.getElementById('chapterTotal').value=s.chapterTotal||'';
  document.getElementById('seriesNote').value=s.note||'';
  // Safari'nin input[type=text] için 512KB kesme sorunu nedeniyle, büyük (data: ile başlayan)
  // kapak verisini input'a yazmıyoruz, _pendingCoverData'da tutuyoruz. Kısa URL'ler input'a yazılabilir.
  if(s.cover&&s.cover.startsWith('data:')&&s.cover.length>500000){
    _pendingCoverData=s.cover;
    document.getElementById('coverUrlInput').value='';
  } else {
    _pendingCoverData=null;
    document.getElementById('coverUrlInput').value=s.cover||'';
  }
  document.getElementById('altNameInput').value='';document.getElementById('fansubInput').value='';
  document.getElementById('autoIncrAmt').value=s.autoIncrAmt||'';
  document.getElementById('autoIncrFreq').value=s.autoIncrFreq||'';
  document.getElementById('autoIncrDay').value=s.autoIncrDay??1;
  document.getElementById('autoIncrDate').value=s.autoIncrDate??1;
  document.getElementById('releaseDayNote').value=s.releaseDayNote||'';
  document.getElementById('returnDate').value=s.returnDate||'';
  document.getElementById('returnDateWrap').style.display=s.category==='season'?'':'none';
  document.getElementById('incrDayWrap').style.display=s.autoIncrFreq==='weekly'?'':'none';
  document.getElementById('incrDateWrap').style.display=s.autoIncrFreq==='monthly'?'':'none';
  document.getElementById('incrIrregularWrap').style.display=s.autoIncrFreq==='irregular'?'':'none';
  const noIncr=!s.autoIncrFreq||s.autoIncrFreq==='irregular'||s.autoIncrFreq==='completed';
  document.getElementById('incrAmtWrap').style.opacity=noIncr?'0.35':'1';
  document.getElementById('incrAmtWrap').style.pointerEvents=noIncr?'none':'';
  renderAltTags();renderFansubTags();renderOldCoverPreviews();
  if(s.cover)showCoverPreview(s.cover);else resetCoverPreview();
  updateFormToggles();renderRatingStars(formRating);
  document.getElementById('deleteBtn').classList.remove('hidden');
  showAddOverlay();
}
function toggleFormFav(){formFav=!formFav;updateFormToggles();}
function toggleFormPin(){formPin=!formPin;updateFormToggles();}
function updateFormToggles(){
  document.getElementById('favToggle').className='btn-secondary'+(formFav?' fav-active':'');
  document.getElementById('pinToggle').className='btn-secondary'+(formPin?' pin-active':'');
}
function renderRatingStars(cur){
  document.getElementById('ratingStars').innerHTML=[1,2,3,4,5].map(n=>
    `<div class="star-pick ${n<=cur?'lit':''}" onclick="setRating(${n})">${n<=cur?'★':'☆'}</div>`
  ).join('');
}
function setRating(n){formRating=formRating===n?0:n;renderRatingStars(formRating);}
async function saveSeries(){
  const name=document.getElementById('seriesName').value.trim();
  if(!name){showToast('warn','Seri adı zorunludur!');return;}
  // Öncelik sırası: (1) dosyadan yüklenen büyük veri (_pendingCoverData),
  // (2) kullanıcının URL alanına yazdığı metin, (3) önizlemedeki img.src (son çare).
  const ci=document.getElementById('coverUrlInput').value.trim();
  const cimg=document.getElementById('coverPreviewWrap').querySelector('img');
  const cover=_pendingCoverData||ci||(cimg?cimg.src:'');
  console.log('[Megami] saveSeries kapak:',_pendingCoverData?'_pendingCoverData':(ci?'coverUrlInput':(cimg?'img.src':'yok')),'uzunluk:',cover.length);
  const prevTR=editingId?(series.find(x=>x.id===editingId)?.chapterTR||0):0;
  const newTR=document.getElementById('chapterTR').value||'';
  const autoAmt=parseInt(document.getElementById('autoIncrAmt').value)||0;
  const autoFreq=document.getElementById('autoIncrFreq').value||'';
  const autoDay=parseInt(document.getElementById('autoIncrDay').value)||1;
  const autoDate=parseInt(document.getElementById('autoIncrDate').value)||1;
  const releaseDayNote=document.getElementById('releaseDayNote').value.trim();
  const dayNames=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  let releaseDay='';
  if(autoFreq==='weekly') releaseDay=dayNames[autoDay]||'';
  else if(autoFreq==='monthly') releaseDay=`Ayın ${autoDate}. günü`;
  else if(autoFreq==='daily') releaseDay='Her gün';
  else if(autoFreq==='irregular') releaseDay=releaseDayNote?`Düzensiz (${releaseDayNote})`:'Düzensiz';
  else if(autoFreq==='completed') releaseDay='Tamamlandı';
  const data={
    id:editingId||Date.now().toString(),name,
    altNames:[...altNames],fansubList:[...fansubList],
    cover:normalizeCoverUrl(cover),
    oldCovers:[...oldCovers],
    category:document.getElementById('seriesCategory').value,
    chapterTR:newTR,chapterEN:document.getElementById('chapterEN').value||'',
    chapterTotal:document.getElementById('chapterTotal').value||'',
    note:document.getElementById('seriesNote').value.trim(),
    favorited:formFav,pinned:formPin,rating:formRating,updatedAt:Date.now(),
    releaseDay,releaseDayNote,returnDate:document.getElementById('returnDate').value||'',
    autoIncrAmt:autoAmt||0,
    autoIncrFreq:autoFreq,
    autoIncrDay:autoDay,
    autoIncrDate:autoDate,
    autoIncrNext:(autoFreq&&autoFreq!=='irregular'&&autoFreq!=='completed')?calcNextIncr(autoFreq,autoDay,autoDate):null,
    autoIncrSkips:[],
  };
  if(editingId){
    const old=series.find(x=>x.id===editingId);
    if(old) data.autoIncrSkips=old.autoIncrSkips||[];
  }
  const isNew=!editingId;
  const prevState=isNew?null:series.find(x=>x.id===editingId);
  const prevIdx=series.findIndex(x=>x.id===data.id);
  if(editingId){
    const idx=series.findIndex(x=>x.id===editingId);if(idx>=0)series[idx]=data;
    if(newTR&&newTR!==String(prevTR)) addLog(editingId,`TR bölüm ${prevTR}→${newTR}`);
  } else series.unshift(data);
  try{
    await save();
  } catch(err){
    console.error('[Megami] Kaydetme başarısız:',err);
    // Değişikliği geri al, tutarsız durumda bırakma
    if(isNew) series=series.filter(x=>x.id!==data.id);
    else if(prevState&&prevIdx>=0) series[prevIdx]=prevState;
    showToast('warn','Kaydedilemedi! Kapak görseli çok büyük olabilir, daha küçük bir dosya dene.');
    return;
  }
  closeSheet('addOverlay');renderTabs();
  if(currentPage==='detail'&&currentDetailId===data.id)openDetail(data.id,true);else renderContent();
  showToast('check',editingId?'Seri güncellendi.':'Seri eklendi.');
  if(!editingId&&series.length===1){setTimeout(()=>{spawnConfetti();showToast('star','İlk serini ekledin! Hoş geldin! 🎉');},400);}
  easterEggCheck();
}
async function deleteSeries(){
  if(!editingId)return;
  const id=editingId;
  showConfirm('Bu seriyi silmek istediğine emin misin?',async()=>{
    const deletedSeries=series.find(x=>x.id===id);
    const deletedIndex=series.findIndex(x=>x.id===id);
    const wasDetailPage=currentPage==='detail'&&currentDetailId===id;
    series=series.filter(x=>x.id!==id);
    await save();closeSheet('addOverlay');renderTabs();
    if(wasDetailPage){closeDetail();}else{renderContent();}
    if(deletedSeries){
      showUndoBanner(`"${deletedSeries.name}" silindi.`,async()=>{
        series.splice(Math.min(deletedIndex,series.length),0,deletedSeries);
        await save();renderTabs();renderContent();
        showToast('check','Seri geri getirildi.');
      });
    } else {
      showToast('check','Seri silindi.');
    }
  });
}
function toggleReturnDate(){
  const cat=document.getElementById('seriesCategory').value;
  document.getElementById('returnDateWrap').style.display=cat==='season'?'':'none';
}
function updateIncrExtra(){
  const freq=document.getElementById('autoIncrFreq').value;
  document.getElementById('incrDayWrap').style.display=freq==='weekly'?'':'none';
  document.getElementById('incrDateWrap').style.display=freq==='monthly'?'':'none';
  document.getElementById('incrIrregularWrap').style.display=freq==='irregular'?'':'none';
  document.getElementById('incrAmtWrap').style.opacity=(freq==='irregular'||freq==='completed'||freq==='')?'0.35':'1';
  document.getElementById('incrAmtWrap').style.pointerEvents=(freq==='irregular'||freq==='completed'||freq==='')?'none':'';
}
function calcNextIncr(freq, day, date){
  const now=new Date();
  if(freq==='daily'){
    const d=new Date(now); d.setDate(d.getDate()+1); d.setHours(9,0,0,0); return d.getTime();
  }
  if(freq==='weekly'){
    const target=parseInt(day)||1;
    const d=new Date(now);
    d.setHours(9,0,0,0);
    let diff=(target-d.getDay()+7)%7;
    if(diff===0) diff=7;
    d.setDate(d.getDate()+diff);
    return d.getTime();
  }
  if(freq==='monthly'){
    const target=parseInt(date)||1;
    const d=new Date(now);
    d.setHours(9,0,0,0);
    d.setDate(target);
    if(d<=now) d.setMonth(d.getMonth()+1);
    return d.getTime();
  }
  return null;
}
function periodKey(freq, day, date){
  const d=new Date();
  if(freq==='daily') return `d-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if(freq==='weekly'){
    const wd=d.getDay();
    const diff=((parseInt(day)||1)-wd+7)%7;
    const weekStart=new Date(d); weekStart.setDate(d.getDate()-wd);
    return `w-${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}-${day}`;
  }
  if(freq==='monthly') return `m-${d.getFullYear()}-${d.getMonth()}-${date}`;
  return '';
}
async function runAutoIncrement(){
  const now=Date.now();
  let changed=false;
  series.forEach(s=>{
    if(!s.autoIncrFreq||!s.autoIncrAmt||s.autoIncrAmt<=0) return;
    if(s.category==='season') return;
    if(!s.autoIncrNext||now<s.autoIncrNext) return;
    const pk=periodKey(s.autoIncrFreq,s.autoIncrDay,s.autoIncrDate);
    if((s.autoIncrSkips||[]).includes(pk)){
      s.autoIncrNext=calcNextIncr(s.autoIncrFreq,s.autoIncrDay,s.autoIncrDate);
      changed=true; return;
    }
    const prev=parseInt(s.chapterTotal)||0;
    s.chapterTotal=String(prev+s.autoIncrAmt);
    s.autoIncrNext=calcNextIncr(s.autoIncrFreq,s.autoIncrDay,s.autoIncrDate);
    s.autoIncrSkips=(s.autoIncrSkips||[]).slice(-10);
    addLog(s.id,`Otomatik: Toplam bölüm ${prev}→${s.chapterTotal}`);
    s.newChapter=true;
    changed=true;
  });
  if(changed){ await save(); renderContent(); }
}
let quickSkipping=false;
function toggleSkip(){
  quickSkipping=!quickSkipping;
  const btn=document.getElementById('skipBtn');
  if(quickSkipping){
    btn.style.background='var(--pinG)'; btn.style.borderColor='var(--pin)'; btn.style.color='var(--pin)';
    btn.innerHTML=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Bu Periyot Atlanacak ✓`;
  } else {
    btn.style.background=''; btn.style.borderColor=''; btn.style.color='';
    btn.innerHTML=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Bu Periyodu Atla`;
  }
}
function addAltName(){const v=document.getElementById('altNameInput').value.trim();if(!v)return;altNames.push(v);document.getElementById('altNameInput').value='';renderAltTags();}
document.getElementById('altNameInput').addEventListener('keydown',e=>{if(e.key==='Enter')addAltName();});
function removeAltName(i){altNames.splice(i,1);renderAltTags();}
function renderAltTags(){document.getElementById('altTagsWrap').innerHTML=altNames.map((a,i)=>`<span class="alt-tag">${esc(a)}<button onclick="removeAltName(${i})">&#x2715;</button></span>`).join('');}
function addFansub(value){
  const v=(value!==undefined?value:document.getElementById('fansubInput').value).trim();
  if(!v)return;
  if(fansubList.some(f=>f.toLowerCase()===v.toLowerCase())){
    document.getElementById('fansubInput').value='';
    hideFansubSuggestions();
    return;
  }
  fansubList.push(v);
  document.getElementById('fansubInput').value='';
  renderFansubTags();
  hideFansubSuggestions();
}
document.getElementById('fansubInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addFansub();}if(e.key==='Escape')hideFansubSuggestions();});
document.addEventListener('click',e=>{
  const wrap=document.getElementById('fansubSuggestWrap');
  const input=document.getElementById('fansubInput');
  if(wrap&&input&&e.target!==input&&!wrap.contains(e.target))hideFansubSuggestions();
});
function removeFansub(i){fansubList.splice(i,1);renderFansubTags();}
function renderFansubTags(){document.getElementById('fansubTagsWrap').innerHTML=fansubList.map((f,i)=>`<span class="fansub-tag">${ic('bolt',9)} ${esc(f)}<button onclick="removeFansub(${i})">&#x2715;</button></span>`).join('');}
function getAllKnownFansubs(){
  const set=new Set();
  series.forEach(s=>(s.fansubList||[]).forEach(f=>{if(f&&f.trim())set.add(f.trim());}));
  return Array.from(set).sort((a,b)=>a.localeCompare(b,'tr'));
}
function renderFansubSuggestions(){
  const input=document.getElementById('fansubInput');
  const wrap=document.getElementById('fansubSuggestWrap');
  if(!input||!wrap)return;
  const q=input.value.trim().toLowerCase();
  const known=getAllKnownFansubs().filter(f=>!fansubList.some(existing=>existing.toLowerCase()===f.toLowerCase()));
  const matches=q?known.filter(f=>f.toLowerCase().includes(q)):known;
  if(matches.length===0){hideFansubSuggestions();return;}
  wrap.innerHTML=matches.slice(0,8).map(f=>`<div class="autocomplete-item" onclick="addFansub('${esc(f).replace(/'/g,"\\'")}')">${ic('bolt',11)} ${esc(f)}</div>`).join('');
  wrap.classList.remove('hidden');
}
function hideFansubSuggestions(){
  const wrap=document.getElementById('fansubSuggestWrap');
  if(wrap)wrap.classList.add('hidden');
}
function compressImage(src, maxW, maxH, quality){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width, h=img.height;
      if(w>maxW||h>maxH){
        const ratio=Math.min(maxW/w, maxH/h);
        w=Math.round(w*ratio); h=Math.round(h*ratio);
      }
      const c=document.createElement('canvas');
      c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror=()=>resolve(src);
    img.src=src;
  });
}
function previewCoverUrl(){
  const u=document.getElementById('coverUrlInput').value.trim();
  // Kullanıcı manuel olarak URL alanına yazdıysa, önceden dosyadan yüklenmiş olabilecek
  // _pendingCoverData artık geçersiz sayılır; input alanındaki değer önceliklidir.
  _pendingCoverData=null;
  if(u)showCoverPreview(u);else resetCoverPreview();
}
const EXT_TO_MIME={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',avif:'image/avif',heic:'image/heic',heif:'image/heif',bmp:'image/bmp',svg:'image/svg+xml'};
function readImageFileAsDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Dosya okunamadı'));
    reader.onload=e=>{
      let result=e.target.result;
      // iOS Safari bazı kaynaklardan seçilen dosyalarda (özellikle AVIF/HEIC) MIME type'ı
      // boş bırakabiliyor; bu durumda data URL "data:;base64,..." ya da "data:application/
      // octet-stream;base64,..." gibi generic bir başlıkla gelir ve <img> bunu gösteremez.
      // Dosya uzantısından doğru MIME type'ı tahmin edip başlığı düzeltiyoruz.
      const needsFix=!file.type||file.type==='application/octet-stream';
      if(needsFix){
        const ext=(file.name||'').split('.').pop().toLowerCase();
        const mime=EXT_TO_MIME[ext];
        if(mime){
          const commaIdx=result.indexOf(',');
          if(commaIdx>-1) result='data:'+mime+';base64,'+result.slice(commaIdx+1);
        }
      }
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}
const IMAGE_EXTENSIONS=['jpg','jpeg','png','gif','webp','avif','heic','heif','bmp','svg'];
function isImageFile(f){
  if(f.type&&f.type.startsWith('image/'))return true;
  // iOS Safari bazı kaynaklardan (Dosyalar, iCloud, üçüncü parti uygulamalar) seçilen
  // dosyalarda, özellikle AVIF/HEIC gibi daha yeni formatlarda file.type'ı boş bırakabiliyor.
  // Bu durumda dosya uzantısına bakarak karar veriyoruz.
  const ext=(f.name||'').split('.').pop().toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}
function handleCoverFile(){
  const f=document.getElementById('coverFileInput').files[0];if(!f)return;
  if(!isImageFile(f)){showToast('warn','Lütfen bir görsel dosyası seç.');return;}
  const sizeMB=f.size/1024/1024;
  if(sizeMB>10){
    showToast('warn',`Görsel ${sizeMB.toFixed(1)}MB — telefonda kaydetme sorunlu olabilir. Sorun yaşarsan daha küçük bir dosya dene.`);
  }
  readImageFileAsDataUrl(f).then(dataUrl=>{
    // Safari'nin input[type=text] için 512KB'ta sessizce kesme yaptığı bilinen bir sorun
    // olduğundan, büyük base64 veriyi input'a yazmıyoruz, ayrı bir değişkende tutuyoruz.
    _pendingCoverData=dataUrl;
    document.getElementById('coverUrlInput').value='';
    showCoverPreview(dataUrl);
  }).catch(err=>{showToast('warn',err.message||'Görsel yüklenemedi.');});
}
function showCoverPreview(src){
  const w=document.getElementById('coverPreviewWrap');
  const p=document.getElementById('coverPlaceholder');if(p)p.remove();
  let img=w.querySelector('img.cover-preview');
  if(!img){img=document.createElement('img');img.className='cover-preview';w.appendChild(img);}
  img.src=src;
}
function resetCoverPreview(){document.getElementById('coverPreviewWrap').innerHTML=`<div class="cover-preview-ph" id="coverPlaceholder">${ic('img',20)}</div>`;}
function handleOldCoverFile(){
  const files=Array.from(document.getElementById('oldCoverFileInput').files);
  const imageFiles=files.filter(isImageFile);
  if(imageFiles.length<files.length){showToast('warn','Bazı dosyalar görsel değil, atlandı.');}
  Promise.all(imageFiles.map(f=>readImageFileAsDataUrl(f).catch(err=>{showToast('warn',err.message||'Bir görsel yüklenemedi.');return null;}))).then(results=>{
    results.filter(Boolean).forEach(dataUrl=>oldCovers.push(dataUrl));
    renderOldCoverPreviews();
  });
}
function renderOldCoverPreviews(){
  document.getElementById('oldCoversPreviews').innerHTML=oldCovers.map((c,i)=>`
    <div style="position:relative;flex-shrink:0;"><img src="${esc(c)}" style="width:52px;height:73px;border-radius:7px;object-fit:cover;border:1px solid var(--line);"><button onclick="removeOldCover(${i})" style="position:absolute;top:-5px;right:-5px;width:15px;height:15px;border-radius:50%;background:#8b3a3a;border:none;color:#fff;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;">&#x2715;</button></div>`).join('');
}
function removeOldCover(i){oldCovers.splice(i,1);renderOldCoverPreviews();}
function closeSheet(id){
  if(id==='addOverlay'&&typeof onAddOverlayHide==='function'){
    onAddOverlayHide();
    return;
  }
  document.getElementById(id).classList.add('hidden');
}
function closeOnOverlay(e,id){
  if(e.target.id!==id)return;
  if(id==='confirmOverlay'){resolveConfirm(false);return;}
  closeSheet(id);
}
let _confirmCallback=null;
function showConfirm(message,onConfirm,opts){
  opts=opts||{};
  _confirmCallback=onConfirm;
  document.getElementById('confirmMsg').textContent=message;
  const okBtn=document.getElementById('confirmOkBtn');
  okBtn.textContent=opts.okLabel||'Evet, Sil';
  okBtn.className=opts.danger===false?'btn-primary':'btn-danger';
  document.getElementById('confirmOverlay').classList.remove('hidden');
}
function resolveConfirm(result){
  document.getElementById('confirmOverlay').classList.add('hidden');
  const cb=_confirmCallback;
  _confirmCallback=null;
  if(result&&cb)cb();
}
let toastTimer;
function showToast(iconName,msg){
  clearTimeout(toastTimer);
  const icons={check:ic('check',15),warn:ic('warn',15),star:ic('sparkle',15),fire:ic('fire',15),moon:ic('moon',15)};
  document.getElementById('toastIcon').innerHTML=icons[iconName]||icons.check;
  document.getElementById('toastMsg').textContent=msg;
  const t=document.getElementById('toast');t.classList.remove('hidden');
  toastTimer=setTimeout(()=>t.classList.add('hidden'),2800);
}
window._deferredPrompt=null;window._dismissed=false;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window._deferredPrompt=e;renderContent();});
function triggerInstall(){if(!window._deferredPrompt)return;window._deferredPrompt.prompt();window._deferredPrompt.userChoice.then(()=>{window._dismissed=true;window._deferredPrompt=null;renderContent();});}
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').then(reg=>{
      // Yeni bir service worker sürümü kontrol edilip aktif olduğunda,
      // kullanıcı eski (cache'lenmiş) sürümde takılı kalmasın diye sayfa otomatik yenilenir.
      reg.addEventListener('updatefound',()=>{
        const newWorker=reg.installing;
        if(!newWorker)return;
        newWorker.addEventListener('statechange',()=>{
          if(newWorker.state==='activated'&&navigator.serviceWorker.controller){
            location.reload();
          }
        });
      });
    }).catch(err=>console.warn('[Megami] Service worker kaydı başarısız:',err));
    // Kontrolcü değiştiğinde (yeni SW devraldığında) de güvenlik amaçlı yenile
    let _swRefreshed=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(_swRefreshed)return;
      _swRefreshed=true;
      location.reload();
    });
  });
}
function openSheet(id){ document.getElementById(id).classList.remove('hidden'); }
const lbState={scale:1,x:0,y:0,minScale:1,maxScale:5};
let lbDragging=false,lbDragStart={x:0,y:0},lbStartPos={x:0,y:0};
let lbPinchStartDist=0,lbPinchStartScale=1;
let lbLastTapTime=0;
function openLightbox(src){
  document.getElementById('lightboxImg').src=src;
  document.getElementById('lightboxOverlay').classList.remove('hidden');
  lightboxZoomReset();
}
function closeLightbox(){
  document.getElementById('lightboxOverlay').classList.add('hidden');
  document.getElementById('lightboxImg').src='';
}
function closeLightboxIfBg(e){
  // Sadece arka plana (imaj/butonlara değil) tıklanırsa kapat
  if(e.target.id==='lightboxOverlay'||e.target.id==='lightboxStage')closeLightbox();
}
function lbApplyTransform(){
  const img=document.getElementById('lightboxImg');
  if(!img)return;
  img.style.transform=`translate(${lbState.x}px,${lbState.y}px) scale(${lbState.scale})`;
  img.style.cursor=lbState.scale>1?'grab':'zoom-in';
  const pctEl=document.getElementById('lightboxZoomPct');
  if(pctEl)pctEl.textContent=Math.round(lbState.scale*100)+'%';
}
function lbClampPan(){
  // Görsel yakınlaştırıldığında ekrandan çok fazla taşmaması için basit bir sınırlama
  const maxPan=200*(lbState.scale-1);
  lbState.x=Math.max(-maxPan,Math.min(maxPan,lbState.x));
  lbState.y=Math.max(-maxPan,Math.min(maxPan,lbState.y));
}
function lightboxZoomIn(){
  lbState.scale=Math.min(lbState.maxScale,lbState.scale+0.5);
  lbClampPan();lbApplyTransform();
}
function lightboxZoomOut(){
  lbState.scale=Math.max(lbState.minScale,lbState.scale-0.5);
  if(lbState.scale===1){lbState.x=0;lbState.y=0;}
  lbClampPan();lbApplyTransform();
}
function lightboxZoomReset(){
  lbState.scale=1;lbState.x=0;lbState.y=0;
  lbApplyTransform();
}
function lbToggleZoom(clientX,clientY){
  if(lbState.scale>1){
    lightboxZoomReset();
  } else {
    const wrap=document.getElementById('lightboxImgWrap');
    const rect=wrap.getBoundingClientRect();
    const offsetX=(clientX-rect.left-rect.width/2);
    const offsetY=(clientY-rect.top-rect.height/2);
    lbState.scale=2.5;
    lbState.x=-offsetX*(lbState.scale-1)/lbState.scale;
    lbState.y=-offsetY*(lbState.scale-1)/lbState.scale;
    lbClampPan();
  }
  lbApplyTransform();
}
function lbInitEvents(){
  const wrap=document.getElementById('lightboxImgWrap');
  const img=document.getElementById('lightboxImg');
  if(!wrap||wrap._lbInit)return;
  wrap._lbInit=true;

  // Mouse wheel zoom
  wrap.addEventListener('wheel',e=>{
    e.preventDefault();
    const delta=e.deltaY<0?0.25:-0.25;
    const newScale=Math.max(lbState.minScale,Math.min(lbState.maxScale,lbState.scale+delta));
    if(newScale===lbState.scale)return;
    lbState.scale=newScale;
    if(lbState.scale===1){lbState.x=0;lbState.y=0;}
    lbClampPan();lbApplyTransform();
  },{passive:false});

  // Çift tık / çift dokunuş zoom
  img.addEventListener('dblclick',e=>{
    e.stopPropagation();
    lbToggleZoom(e.clientX,e.clientY);
  });

  // Mouse sürükleme (pan)
  img.addEventListener('mousedown',e=>{
    if(lbState.scale<=1)return;
    e.preventDefault();
    lbDragging=true;
    lbDragStart={x:e.clientX,y:e.clientY};
    lbStartPos={x:lbState.x,y:lbState.y};
    img.style.cursor='grabbing';
  });
  window.addEventListener('mousemove',e=>{
    if(!lbDragging)return;
    lbState.x=lbStartPos.x+(e.clientX-lbDragStart.x);
    lbState.y=lbStartPos.y+(e.clientY-lbDragStart.y);
    lbClampPan();lbApplyTransform();
  });
  window.addEventListener('mouseup',()=>{
    if(lbDragging){lbDragging=false;img.style.cursor=lbState.scale>1?'grab':'zoom-in';}
  });

  // Touch: pinch-zoom + tek parmak pan + çift dokunuş
  wrap.addEventListener('touchstart',e=>{
    if(e.touches.length===2){
      e.preventDefault();
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      lbPinchStartDist=Math.hypot(dx,dy);
      lbPinchStartScale=lbState.scale;
    } else if(e.touches.length===1){
      const now=Date.now();
      if(now-lbLastTapTime<300){
        lbToggleZoom(e.touches[0].clientX,e.touches[0].clientY);
      }
      lbLastTapTime=now;
      if(lbState.scale>1){
        lbDragging=true;
        lbDragStart={x:e.touches[0].clientX,y:e.touches[0].clientY};
        lbStartPos={x:lbState.x,y:lbState.y};
      }
    }
  },{passive:false});
  wrap.addEventListener('touchmove',e=>{
    if(e.touches.length===2){
      e.preventDefault();
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.hypot(dx,dy);
      const newScale=Math.max(lbState.minScale,Math.min(lbState.maxScale,lbPinchStartScale*(dist/lbPinchStartDist)));
      lbState.scale=newScale;
      lbClampPan();lbApplyTransform();
    } else if(e.touches.length===1&&lbDragging){
      e.preventDefault();
      lbState.x=lbStartPos.x+(e.touches[0].clientX-lbDragStart.x);
      lbState.y=lbStartPos.y+(e.touches[0].clientY-lbDragStart.y);
      lbClampPan();lbApplyTransform();
    }
  },{passive:false});
  wrap.addEventListener('touchend',e=>{
    if(e.touches.length===0){
      lbDragging=false;
      if(lbState.scale<1.05&&lbState.scale!==1){lightboxZoomReset();}
    }
  });
}
async function exportBackup(){
  const data={ version:2, exportedAt:new Date().toISOString(), series };
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const date=new Date().toISOString().slice(0,10);
  a.href=url; a.download=`mangavault-yedek-${date}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('check','Yedek dosyası indiriliyor…');
}
function validateSeriesShape(arr){
  // Her elemanın gerçek bir "seri" objesi olduğunu doğrular.
  // id ve name zorunlu; diğer alanlar eksikse makul varsayılanlarla tamamlanır.
  const cleaned=[];
  let skipped=0;
  for(const item of arr){
    if(!item||typeof item!=='object'){skipped++;continue;}
    const id=item.id;
    const name=typeof item.name==='string'?item.name.trim():'';
    if(!id||!name){skipped++;continue;}
    cleaned.push(item);
  }
  return {cleaned,skipped};
}
let _lastBackupBeforeImport=null;
function importBackup(e){
  const file=e.target.files[0]; if(!file){return;}
  showConfirm('Mevcut verilerinin üzerine yazılacak. Emin misin?',async()=>{
    const text=await file.text();
    try{
      const data=JSON.parse(text);
      const imported=data.series||data;
      if(!Array.isArray(imported)) throw new Error('Geçersiz format');
      const {cleaned,skipped}=validateSeriesShape(imported);
      if(cleaned.length===0) throw new Error('Dosyada geçerli seri bulunamadı');
      // Geri alınabilmesi için mevcut veriyi bellekte sakla (sayfa açıkken geçerli)
      _lastBackupBeforeImport=JSON.parse(JSON.stringify(series));
      series=cleaned;
      await save();
      if(currentPage==='detail'){currentPage='home';currentDetailId=null;history.pushState({},'',location.pathname);}
      renderTabs(); renderContent();
      closeSheet('backupOverlay');
      const skipMsg=skipped>0?` (${skipped} geçersiz kayıt atlandı)`:'';
      if(_lastBackupBeforeImport&&_lastBackupBeforeImport.length>0){
        showUndoBanner(`${series.length} seri geri yüklendi!${skipMsg}`,undoImport);
      } else {
        showToast('check',`${series.length} seri geri yüklendi!${skipMsg}`);
      }
    } catch(err){
      showToast('warn','Geçersiz yedek dosyası!');
    }
  },{okLabel:'Evet, İçe Aktar'});
  e.target.value='';
}
async function undoImport(){
  if(!_lastBackupBeforeImport)return;
  series=_lastBackupBeforeImport;
  _lastBackupBeforeImport=null;
  await save();
  if(currentPage==='detail'){currentPage='home';currentDetailId=null;history.pushState({},'',location.pathname);}
  renderTabs(); renderContent();
  showToast('check','Önceki verilerine geri dönüldü.');
}
function showUndoBanner(message,onUndo){
  let b=document.getElementById('undoBanner');
  if(!b){
    b=document.createElement('div');
    b.id='undoBanner';
    b.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);max-width:420px;width:calc(100% - 32px);background:var(--black5);border:1px solid var(--purple2);border-radius:11px;padding:10px 13px;font-size:12px;font-weight:500;color:var(--text);z-index:998;box-shadow:0 6px 24px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:space-between;gap:8px;';
    document.body.appendChild(b);
  }
  b.innerHTML=`<span></span><button style="background:var(--purple);border:none;color:#fff;font-size:12px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;">Geri Al</button>`;
  b.querySelector('span').textContent=message;
  b.querySelector('button').onclick=()=>{onUndo();hideUndoBanner();};
  b.style.display='flex';
  clearTimeout(window._undoBannerTimer);
  window._undoBannerTimer=setTimeout(hideUndoBanner,10000);
}
function hideUndoBanner(){
  const b=document.getElementById('undoBanner');
  if(b)b.style.display='none';
}
function openInstallPrompt(){
  if(window._deferredPrompt){triggerInstall();return;}
  const ua=navigator.userAgent;
  let msg=/Chrome/.test(ua)&&!/Edg/.test(ua)?'Chrome menüsü (⋮) → "Ana ekrana ekle" seçeneğini kullan.':/Safari/.test(ua)?'Paylaş → "Ana Ekrana Ekle" seçeneğini kullan.':'Tarayıcı menüsünden "Ana Ekrana Ekle" seçeneğini kullan.';
  showToast('check',msg);
}
function scrollCarousel(btn, dir){
  const wrap = btn.closest('.carousel-wrap');
  const car = wrap.querySelector('.carousel');
  const cardW = 120 + 9;
  car.scrollBy({left: dir * cardW * 3, behavior: 'smooth'});
}
let _pinDragId=null;
function pinDragStart(e){
  _pinDragId=e.target.closest('[data-series-id]').dataset.seriesId;
  e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain',_pinDragId);}catch(err){}
  setTimeout(()=>e.target.closest('.series-card').style.opacity='0.4',0);
}
function pinDragEnd(e){
  const card=e.target.closest('.series-card');
  if(card)card.style.opacity='';
  _pinDragId=null;
  document.querySelectorAll('.series-card.drag-over').forEach(el=>el.classList.remove('drag-over'));
}
function initPinnedDragSort(){
  const car=document.getElementById('car-pinned');
  if(!car||car._dragInit)return;
  car._dragInit=true;
  // Masaüstü: native HTML5 drag & drop
  car.addEventListener('dragover',e=>{
    if(!_pinDragId)return;
    e.preventDefault();
    e.dataTransfer.dropEffect='move';
    const target=e.target.closest('[data-series-id]');
    document.querySelectorAll('.series-card.drag-over').forEach(el=>el.classList.remove('drag-over'));
    if(target&&target.dataset.seriesId!==_pinDragId)target.classList.add('drag-over');
  });
  car.addEventListener('drop',e=>{
    e.preventDefault();
    const target=e.target.closest('[data-series-id]');
    document.querySelectorAll('.series-card.drag-over').forEach(el=>el.classList.remove('drag-over'));
    if(!target||!_pinDragId||target.dataset.seriesId===_pinDragId)return;
    reorderPinned(_pinDragId,target.dataset.seriesId);
  });
  // Mobil: touch tabanlı basılı-tut-sürükle
  initPinnedTouchDrag(car);
}
// --- Mobil touch sürükleme ---
let _touchDragState=null; // {id, longPressTimer, ghost, startX, startY, active, originalCard}
function initPinnedTouchDrag(car){
  car.addEventListener('touchstart',e=>{
    const cardEl=e.target.closest('[data-series-id]');
    if(!cardEl||selectionMode)return;
    const id=cardEl.dataset.seriesId;
    const touch=e.touches[0];
    _touchDragState={
      id, originalCard:cardEl,
      startX:touch.clientX, startY:touch.clientY,
      active:false, moved:false,
      longPressTimer:setTimeout(()=>startTouchDrag(cardEl,touch),350)
    };
  },{passive:true});
  car.addEventListener('touchmove',e=>{
    if(!_touchDragState)return;
    const touch=e.touches[0];
    const dx=Math.abs(touch.clientX-_touchDragState.startX);
    const dy=Math.abs(touch.clientY-_touchDragState.startY);
    if(!_touchDragState.active){
      // Belirgin hareket varsa (kaydırma niyeti) uzun-basma iptal edilir
      if(dx>8||dy>8){
        clearTimeout(_touchDragState.longPressTimer);
        _touchDragState.moved=true;
      }
      return;
    }
    e.preventDefault();
    moveTouchGhost(touch);
    highlightTouchTarget(touch);
  },{passive:false});
  car.addEventListener('touchend',e=>{
    if(!_touchDragState)return;
    clearTimeout(_touchDragState.longPressTimer);
    if(_touchDragState.active)endTouchDrag(e.changedTouches[0]);
    _touchDragState=null;
  });
  car.addEventListener('touchcancel',()=>{
    if(_touchDragState){
      clearTimeout(_touchDragState.longPressTimer);
      cleanupTouchGhost();
    }
    _touchDragState=null;
  });
}
function startTouchDrag(cardEl,touch){
  if(!_touchDragState||_touchDragState.moved)return;
  _touchDragState.active=true;
  if(navigator.vibrate)navigator.vibrate(12);
  cardEl.style.opacity='0.35';
  const rect=cardEl.getBoundingClientRect();
  const ghost=cardEl.cloneNode(true);
  ghost.id='touchDragGhost';
  ghost.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:9999;opacity:0.92;transform:scale(1.06) rotate(-2deg);box-shadow:0 12px 32px rgba(0,0,0,.7);border-radius:var(--r);transition:none;`;
  document.body.appendChild(ghost);
  _touchDragState.ghost=ghost;
  _touchDragState.offsetX=touch.clientX-rect.left;
  _touchDragState.offsetY=touch.clientY-rect.top;
}
function moveTouchGhost(touch){
  const st=_touchDragState;
  if(!st||!st.ghost)return;
  st.ghost.style.left=(touch.clientX-st.offsetX)+'px';
  st.ghost.style.top=(touch.clientY-st.offsetY)+'px';
}
function highlightTouchTarget(touch){
  const ghost=_touchDragState.ghost;
  ghost.style.display='none';
  const el=document.elementFromPoint(touch.clientX,touch.clientY);
  ghost.style.display='';
  const target=el&&el.closest('[data-series-id]');
  document.querySelectorAll('.series-card.drag-over').forEach(c=>c.classList.remove('drag-over'));
  if(target&&target.dataset.seriesId!==_touchDragState.id)target.classList.add('drag-over');
}
function endTouchDrag(touch){
  const st=_touchDragState;
  if(!st)return;
  const ghost=st.ghost;
  if(ghost)ghost.style.display='none';
  const el=document.elementFromPoint(touch.clientX,touch.clientY);
  if(ghost)ghost.style.display='';
  const target=el&&el.closest('[data-series-id]');
  cleanupTouchGhost();
  if(st.originalCard)st.originalCard.style.opacity='';
  if(target&&target.dataset.seriesId!==st.id){
    reorderPinned(st.id,target.dataset.seriesId);
  }
}
function cleanupTouchGhost(){
  const ghost=document.getElementById('touchDragGhost');
  if(ghost)ghost.remove();
  document.querySelectorAll('.series-card.drag-over').forEach(c=>c.classList.remove('drag-over'));
}
async function reorderPinned(draggedId,targetId){
  const draggedIdx=series.findIndex(s=>s.id===draggedId);
  const targetIdx=series.findIndex(s=>s.id===targetId);
  if(draggedIdx<0||targetIdx<0)return;
  const [dragged]=series.splice(draggedIdx,1);
  const newTargetIdx=series.findIndex(s=>s.id===targetId);
  series.splice(newTargetIdx,0,dragged);
  await save();
  renderContent();
}
function computeExtraStats(){
  const rated=series.filter(s=>s.rating>0);
  const avgRating=rated.length?(rated.reduce((a,s)=>a+s.rating,0)/rated.length):0;
  const totEN=series.reduce((a,s)=>a+(parseInt(s.chapterEN)||0),0);
  const totTR=series.reduce((a,s)=>a+(parseInt(s.chapterTR)||0),0);
  // Fansub sıklığı
  const fansubCount={};
  series.forEach(s=>(s.fansubList||[]).forEach(f=>{const key=f.trim();if(key)fansubCount[key]=(fansubCount[key]||0)+1;}));
  const topFansub=Object.entries(fansubCount).sort((a,b)=>b[1]-a[1])[0];
  // Bu ay eklenenler (id zaman damgalı, Date.now().toString())
  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1).getTime();
  const addedThisMonth=series.filter(s=>{const t=parseInt(s.id);return !isNaN(t)&&t>=monthStart;}).length;
  // En uzun seri (toplam bölüm bilgisine göre)
  const withTotal=series.filter(s=>parseInt(s.chapterTotal)>0);
  const longest=withTotal.sort((a,b)=>(parseInt(b.chapterTotal)||0)-(parseInt(a.chapterTotal)||0))[0];
  // En çok okunan (TR bölüm sayısına göre)
  const mostRead=[...series].sort((a,b)=>(parseInt(b.chapterTR)||0)-(parseInt(a.chapterTR)||0))[0];
  const pinnedCount=series.filter(s=>s.pinned).length;
  return {avgRating,ratedCount:rated.length,totEN,totTR,totAll:totEN+totTR,topFansub,addedThisMonth,longest,mostRead,pinnedCount};
}
function formatNote(s){
  if(!s)return '';
  let out=esc(s);
  // Önce esc() ile güvenli hale getirildi, şimdi hafif markdown biçimlendirmesi uygulanıyor.
  out=out.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
  out=out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,'<i>$1</i>');
  out=out.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--purple3);text-decoration:underline;">$1</a>');
  out=out.replace(/\n/g,'<br>');
  return out;
}
function normalizeCoverUrl(u){
  if(!u)return '';
  u=String(u).trim();
  if(!u)return '';
  if(u.startsWith('data:'))return u;
  if(u.startsWith('//'))return 'https:'+u;
  if(u.startsWith('http://')||u.startsWith('https://'))return u;
  if(u.startsWith('/'))return u;
  if(/^[\w.-]+\.[a-z]{2,}\/.+/i.test(u))return 'https://'+u;
  console.warn('[Megami] Geçersiz kapak URL formatı, kaydedilmedi:',u);
  return '';
}
// ═══════════════════════════════════════════
// RADIAL MENU
// ═══════════════════════════════════════════
var radialOpen=false, radialTimer=null, radialHovered=-1;
var radialDefs=[
  {label:'Ana Sayfa', page:'home', icon:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', action:function(){switchPage('home');}},
  {label:'Arama',     page:null,   icon:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', action:function(){switchPage('home');setTimeout(function(){var i=document.getElementById('searchInput');if(i){i.focus();i.select();}},250);}},
  {label:'Seri Ekle', page:null,   icon:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>', action:function(){openAddSheet();}},
  {label:'Ekstra',    page:null,   icon:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>', action:function(){showToast('star','Yakında! ✨');}},
  {label:'İstatistik',page:'stats', icon:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', action:function(){switchPage('stats');}}
];

// Arama ve Ekstra, kullanıcı isteğiyle orta-üste (Seri Ekle) doğru çok hafif kaydırıldı (127->124, 53->56).
var RADIAL_ANGLES=[165,124,90,56,15];
var RADIAL_R=120;

var radialItemCenters=[];

function buildRadialItems(){
  var menu=document.getElementById('radialMenu');
  if(!menu) return;
  menu.innerHTML='';
  radialItemCenters=[];
  var trigger=document.getElementById('radialTrigger');
  if(!trigger) return;
  var tr=trigger.getBoundingClientRect();
  // Trigger merkezi
  var cx=tr.left+tr.width/2;
  var cy=tr.top+tr.height/2;
  // Ekran genişliği — sağa taşmayı önle
  var sw=window.innerWidth;

  radialDefs.forEach(function(def,i){
    var angleRad=RADIAL_ANGLES[i]*Math.PI/180;
    var ix=cx+RADIAL_R*Math.cos(angleRad);
    var iy=cy-RADIAL_R*Math.sin(angleRad);
    // Ekran sınırı kontrolü — etiketler butondan geniş olabildiği için (~90px'e kadar)
    // yarısı kadar (45-50px) pay bırakıyoruz, aksi halde ekran kenarındaki etiketler taşabilir.
    var margin=50;
    ix=Math.max(margin, Math.min(sw-margin, ix));
    radialItemCenters.push({x:ix,y:iy,r:40});

    var el=document.createElement('div');
    el.className='radial-item';
    el.id='ri-'+i;
    el.style.left=ix+'px';
    el.style.top=iy+'px';
    el.innerHTML='<div class="radial-btn" id="rb-'+i+'">'+def.icon+'</div>'
      +'<span class="radial-label">'+def.label+'</span>';
    (function(d){
      el.addEventListener('click',function(e){e.stopPropagation();closeRadial();d.action();});
    })(def);
    menu.appendChild(el);
  });
  updateRadialActive();
}

function openRadial(){
  radialOpen=true;
  radialHovered=-1;
  buildRadialItems();
  document.getElementById('radialTrigger').classList.add('open');
  document.getElementById('radialBackdrop').classList.add('open');
  document.querySelectorAll('.radial-item').forEach(function(el,i){
    setTimeout(function(){el.classList.add('open');},i*45);
  });
}

function closeRadial(){
  radialOpen=false;
  radialHovered=-1;
  document.querySelectorAll('.radial-item').forEach(function(el){el.classList.remove('open','hovered');});
  var t=document.getElementById('radialTrigger');
  var b=document.getElementById('radialBackdrop');
  if(t) t.classList.remove('open');
  if(b) b.classList.remove('open');
}

function getHoveredItem(touchX,touchY){
  var best=-1, bestDist=60; // 60px hit radius
  radialItemCenters.forEach(function(c,i){
    var d=Math.sqrt(Math.pow(touchX-c.x,2)+Math.pow(touchY-c.y,2));
    if(d<bestDist){bestDist=d;best=i;}
  });
  return best;
}

function setHovered(idx){
  if(idx===radialHovered) return;
  radialHovered=idx;
  document.querySelectorAll('.radial-item').forEach(function(el,i){
    var btn=el.querySelector('.radial-btn');
    if(i===idx){
      el.classList.add('hovered');
      if(btn) btn.classList.add('hovered');
    } else {
      el.classList.remove('hovered');
      if(btn) btn.classList.remove('hovered');
    }
  });
}

function updateRadialActive(){
  radialDefs.forEach(function(def,i){
    var btn=document.getElementById('rb-'+i);
    if(!btn) return;
    btn.classList.toggle('active-page', def.page===currentPage);
  });
}

function initRadialMenu(){
  var trigger=document.getElementById('radialTrigger');
  if(!trigger) return;

  // Touch: basılı tut → aç, sürükle → hover, bırak → seç
  trigger.addEventListener('touchstart',function(e){
    e.preventDefault();
    radialTimer=setTimeout(function(){
      openRadial();
    },350);
  },{passive:false});

  trigger.addEventListener('touchmove',function(e){
    if(!radialOpen){clearTimeout(radialTimer);return;}
    e.preventDefault();
    var t=e.touches[0];
    var idx=getHoveredItem(t.clientX,t.clientY);
    setHovered(idx);
  },{passive:false});

  trigger.addEventListener('touchend',function(e){
    clearTimeout(radialTimer);
    if(!radialOpen) return;
    e.preventDefault();
    var idx=radialHovered;
    closeRadial();
    if(idx>=0) radialDefs[idx].action();
  },{passive:false});

  trigger.addEventListener('touchcancel',function(){
    clearTimeout(radialTimer);
    closeRadial();
  });

  // Desktop fallback
  trigger.addEventListener('mousedown',function(){radialTimer=setTimeout(openRadial,350);});
  trigger.addEventListener('mouseup',function(){
    clearTimeout(radialTimer);
    if(radialOpen&&radialHovered>=0){var idx=radialHovered;closeRadial();radialDefs[idx].action();}
    else if(radialOpen) closeRadial();
  });
}

document.addEventListener('DOMContentLoaded',initRadialMenu);
if(document.readyState!=='loading') initRadialMenu();
