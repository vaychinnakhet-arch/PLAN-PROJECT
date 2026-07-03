const document = {getElementById:()=>({style:{}, addEventListener:()=>{}, classList:{add:()=>{}, remove:()=>{}, contains:()=>{}}, offsetHeight: 100}), querySelectorAll:()=>[], body: {addEventListener:()=>{}}}; const localStorage = {getItem:()=>null, setItem:()=>{}}; const window={addEventListener:()=>{}};
// ══════════════════════════════════════════════════════════
//  PLANFLOW PRO — Core Application
// ══════════════════════════════════════════════════════════

const THAI_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const THAI_DAYS = ['อา','จ','อ','พ','พฤ','ศ','ส'];

// ── STATE ─────────────────────────────────────────────
let state = {
    projectName: 'โครงการก่อสร้าง ระยะที่ 1',
    tasks: [],
    view: 'gantt',        // 'gantt' | 'calendar'
    mode: 'presentation', // 'presentation' | 'update'
    zoomMode: 'day',      // 'day' | 'week' | 'month'
    dayWidth: 38,
    workOnSundays: false,
    workOnHolidays: false,
    showBaseline: false,
    showCritical: false,
    ganttStart: null,
    ganttEnd: null,
    calDate: new Date(),
    selectedTaskId: null,
    colVisible: { id: true, dur: true, start: true, end: true, progress: false, resource: false },
    holidays: {
        '2025-01-01':'วันขึ้นปีใหม่','2025-02-12':'วันมาฆบูชา',
        '2025-04-06':'วันจักรี','2025-04-13':'วันสงกรานต์','2025-04-14':'วันสงกรานต์','2025-04-15':'วันสงกรานต์',
        '2025-05-01':'วันแรงงาน','2025-05-05':'วันฉัตรมงคล','2025-05-12':'วันวิสาขบูชา',
        '2025-06-03':'วันเฉลิมฯ พระราชินี','2025-07-11':'วันอาสาฬหบูชา',
        '2025-07-28':'วันเฉลิมฯ ร.10','2025-08-12':'วันแม่แห่งชาติ',
        '2025-10-13':'วันนวมินทรมหาราช','2025-10-23':'วันปิยมหาราช',
        '2025-12-05':'วันพ่อแห่งชาติ','2025-12-10':'วันรัฐธรรมนูญ','2025-12-31':'วันสิ้นปี',
        '2026-01-01':'วันขึ้นปีใหม่','2026-04-06':'วันจักรี','2026-04-13':'วันสงกรานต์',
        '2026-04-14':'วันสงกรานต์','2026-04-15':'วันสงกรานต์',
        '2026-05-01':'วันแรงงาน','2026-05-05':'วันฉัตรมงคล',
        '2026-06-01':'วันวิสาขบูชา','2026-07-28':'วันเฉลิมฯ ร.10',
        '2026-08-12':'วันแม่แห่งชาติ','2026-10-23':'วันปิยมหาราช',
        '2026-12-05':'วันพ่อแห่งชาติ','2026-12-10':'วันรัฐธรรมนูญ','2026-12-31':'วันสิ้นปี',
    }
};

const COLORS = [
    '#6c63ff','#00d4aa','#ff5370','#ffb84d','#4fc3f7',
    '#ce93d8','#ff8a65','#81c784','#f06292','#4dd0e1',
    '#aed581','#ff7043','#7986cb','#26a69a','#ef5350',
];

// ── UTILS ─────────────────────────────────────────────
const fmtDate = d => {
    if (!d || isNaN(new Date(d).getTime())) return '';
    const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};
const parseDate = s => {
    if (!s) return null;
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
};
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const daysBetween = (a, b) => {
    const u = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return (u(b) - u(a)) / 86400000;
};
const isWorkingDay = d => {
    const day = d.getDay(); const ds = fmtDate(d);
    if (day === 0 && !state.workOnSundays) return false;
    if (day === 6) return false; // Saturday always off
    if (state.holidays[ds] && !state.workOnHolidays) return false;
    return true;
};
const addWorkingDays = (start, n) => {
    let cur = new Date(start); let added = 0; const dir = n >= 0 ? 1 : -1; const abs = Math.abs(n);
    // If starting on non-working day, advance to next working day
    if (n >= 0) { while (!isWorkingDay(cur)) cur = addDays(cur, 1); }
    while (added < abs) { cur = addDays(cur, dir); if (isWorkingDay(cur)) added++; }
    return cur;
};
const workDaysDuration = (start, end) => {
    if (!start || !end) return 0;
    let c = new Date(start); let n = 0;
    while (c <= end) { if (isWorkingDay(c)) n++; c = addDays(c, 1); }
    return n;
};
const fmtThai = d => {
    if (!d) return '—';
    const dt = d instanceof Date ? d : parseDate(d);
    if (!dt) return '—';
    return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear()+543}`;
};
const fmtThaiShort = d => {
    if (!d) return '—'; const dt = d instanceof Date ? d : parseDate(d);
    if (!dt) return '—';
    const yearShort = (dt.getFullYear() + 543) % 100;
    return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]}${yearShort}`;
};
const nextId = () => state.tasks.length ? Math.max(...state.tasks.map(t=>t.id))+1 : 1;
const getDescendants = id => {
    let r=[]; state.tasks.filter(t=>t.parentId===id).forEach(c=>{r.push(c.id);r=[...r,...getDescendants(c.id)];});return r;
};

// ── COLORS ────────────────────────────────────────────
const lighten = (hex, pct) => {
    hex=hex.replace('#','');
    const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
    const nr=Math.min(255,Math.floor(r+(255-r)*pct/100));
    const ng=Math.min(255,Math.floor(g+(255-g)*pct/100));
    const nb=Math.min(255,Math.floor(b+(255-b)*pct/100));
    return `#${nr.toString(16).padStart(2,'0')}${ng.toString(16).padStart(2,'0')}${nb.toString(16).padStart(2,'0')}`;
};
const assignColors = () => {
    let ci=0; const map=new Map(state.tasks.map(t=>[t.id,t]));
    state.tasks.filter(t=>t.parentId===null).forEach(t=>{
        if(!t.color) t.color=COLORS[ci%COLORS.length];
        ci++;
    });
    state.tasks.forEach(t=>{
        if(t.parentId!==null && !t.color){
            let p=map.get(t.parentId);
            while(p){if(p.color){t.color=p.color;break;} p=map.get(p.parentId);}
        }
    });
};

// ── SCHEDULING ────────────────────────────────────────
const calcFromDeps = task => {
    if (!task.dependencies) return null;
    const map=new Map(state.tasks.map(t=>[t.id,t]));
    let starts=[];
    for(const dep of task.dependencies.split(',').map(s=>s.trim()).filter(Boolean)){
        const m=dep.match(/(\d+)(FS|SS|FF|SF)\+?(-?\d+)/);
        if(!m) continue;
        const [,predId,type,lagStr]=m; const lag=parseInt(lagStr)||0;
        const pred=map.get(parseInt(predId));
        if(!pred||!pred.start||!pred.end) continue;
        const dur=Math.max(1,task.duration||1);
        let pStart;
        if(type==='FS') pStart=addWorkingDays(pred.end, lag+1);
        else if(type==='SS') pStart=addWorkingDays(pred.start, lag);
        else if(type==='FF'){const pe=addWorkingDays(pred.end,lag);pStart=addWorkingDays(pe,-(dur-1));}
        else{const pe=addWorkingDays(pred.start,lag);pStart=addWorkingDays(pe,-(dur-1));}
        if(pStart) starts.push(pStart);
    }
    if(!starts.length) return null;
    const s=new Date(Math.max(...starts.map(d=>d.getTime())));
    const e=addWorkingDays(s,Math.max(0,(task.duration||1)-1));
    return {start:s,end:e};
};
const reevalAutoTasks = () => {
    state.tasks.filter(t=>t.schedulingMode==='auto').forEach(t=>{
        const nd=calcFromDeps(t);
        if(nd){t.start=nd.start;t.end=nd.end;t.duration=workDaysDuration(nd.start,nd.end);}
    });
};
const propagate = id => {
    const q=[id]; const vis=new Set(q);
    while(q.length){
        const cid=q.shift();
        state.tasks.filter(t=>t.schedulingMode==='auto'&&t.dependencies&&t.dependencies.split(',').some(d=>d.trim().match(new RegExp(`^${cid}(FS|SS|FF|SF)`)))).forEach(t=>{
            const nd=calcFromDeps(t);
            if(nd){t.start=nd.start;t.end=nd.end;t.duration=workDaysDuration(nd.start,nd.end);}
            if(!vis.has(t.id)){q.push(t.id);vis.add(t.id);}
        });
    }
};
const updateParentDates = () => {
    const parents=new Set(state.tasks.filter(t=>t.parentId!==null).map(t=>t.parentId));
    const processParent = pid => {
        const children=state.tasks.filter(t=>t.parentId===pid&&t.start&&t.end);
        if(!children.length) return;
        const p=state.tasks.find(t=>t.id===pid); if(!p) return;
        const allDates=children.flatMap(t=>[t.start,t.end]).filter(Boolean);
        p.start=new Date(Math.min(...allDates.map(d=>d.getTime())));
        p.end=new Date(Math.max(...allDates.map(d=>d.getTime())));
        p.duration=workDaysDuration(p.start,p.end);
        if(p.parentId!==null) processParent(p.parentId);
    };
    parents.forEach(processParent);
};
const calcCritical = () => {
    state.tasks.forEach(t=>t.isCritical=false);
    const map=new Map(state.tasks.map(t=>[t.id,t]));
    map.forEach(t=>t._succs=[]);
    map.forEach(t=>{
        if(t.dependencies) t.dependencies.split(',').forEach(dep=>{
            const m=dep.trim().match(/(\d+)/);
            if(m){const p=map.get(parseInt(m[1]));if(p)p._succs.push(t);}
        });
    });
    const memo=new Map();
    const longest=t=>{
        if(memo.has(t.id)) return memo.get(t.id);
        if(!t._succs.length){const r={dur:t.duration||1,path:[t.id]};memo.set(t.id,r);return r;}
        let best={dur:0,path:[]};
        t._succs.forEach(s=>{const r=longest(s);if((t.duration||1)+r.dur>best.dur)best={dur:(t.duration||1)+r.dur,path:[t.id,...r.path]};});
        memo.set(t.id,best); return best;
    };
    const roots=state.tasks.filter(t=>!t.dependencies||!t.dependencies.trim());
    let best={dur:0,path:[]};
    roots.forEach(r=>{const res=longest(r);if(res.dur>best.dur)best=res;});
    const cp=new Set(best.path);
    state.tasks.forEach(t=>{if(cp.has(t.id))t.isCritical=true;});
};
const calcStatus = t => {
    if((t.progress||0)>=100) return 'done';
    const today=new Date(); today.setHours(0,0,0,0);
    const eff=t.actualEnd||t.end;
    if(eff&&today>eff) return 'late';
    const es=t.actualStart||t.start;
    if(es&&t.duration>0){const d=workDaysDuration(es,today);const pct=(d/t.duration)*100;if(pct>(t.progress||0)+20)return 'risk';}
    return 'ok';
};

// ── GANTT DATE RANGE ──────────────────────────────────
const calcGanttRange = () => {
    const all=state.tasks.flatMap(t=>[t.start,t.end,t.actualStart,t.actualEnd,t.baselineStart,t.baselineEnd]).filter(d=>d&&!isNaN(d.getTime()));
    if(!all.length){const td=new Date();state.ganttStart=addDays(td,-7);state.ganttEnd=addDays(td,60);return;}
    state.ganttStart=addDays(new Date(Math.min(...all.map(d=>d.getTime()))),-7);
    state.ganttEnd=addDays(new Date(Math.max(...all.map(d=>d.getTime()))),21);
};

// ── TOAST ─────────────────────────────────────────────
const toast = (msg, type='info') => {
    const icons={info:'ℹ️',success:'✅',error:'❌'};
    const el=document.createElement('div');
    el.className=`toast ${type}`;
    el.innerHTML=`<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(40px)';el.style.transition='all 0.3s';setTimeout(()=>el.remove(),300);},3000);
};

// ── PERSIST & MULTI-PROJECT ────────────────────────────────
let currentProjectId = 'default';

const getProjectsList = () => {
    const raw = localStorage.getItem('planflow_projects');
    if(raw) { try { return JSON.parse(raw); } catch(e){} }
    return [];
};

const saveProjectsList = (list) => {
    localStorage.setItem('planflow_projects', JSON.stringify(list));
};

const migrateIfNeeded = () => {
    let list = getProjectsList();
    if(list.length === 0) {
        const legacy = localStorage.getItem('planflow_v2');
        if(legacy) {
            localStorage.setItem('planflow_proj_default', legacy);
            let legacyData = {};
            try { legacyData = JSON.parse(legacy); } catch(e){}
            list.push({ id: 'default', name: legacyData.projectName || 'โครงการแรกของฉัน', updated: Date.now() });
            saveProjectsList(list);
            currentProjectId = 'default';
        } else {
            const newId = 'proj_' + Date.now();
            list.push({ id: newId, name: 'โครงการใหม่', updated: Date.now() });
            saveProjectsList(list);
            currentProjectId = newId;
        }
    } else {
        currentProjectId = localStorage.getItem('planflow_current_proj') || list[0].id;
        if (!list.some(p => p.id === currentProjectId)) {
            currentProjectId = list[0].id;
        }
    }
    localStorage.setItem('planflow_current_proj', currentProjectId);
};

window.switchProject = (id) => {
    currentProjectId = id;
    localStorage.setItem('planflow_current_proj', id);
    document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open'));
    if(!loadLocal()) { state.tasks=[]; state.projectName='โครงการใหม่'; }
    renderProjectMenu();
    updateParentDates();
    render();
};

window.createProject = () => {
    const name = prompt('ตั้งชื่อโปรเจคใหม่:', 'โครงการใหม่');
    if(!name) return;
    const newId = 'proj_' + Date.now();
    const list = getProjectsList();
    list.push({ id: newId, name, updated: Date.now() });
    saveProjectsList(list);
    
    state.projectName = name;
    state.tasks = [];
    state.holidays = {};
    saveLocal(newId);
    window.switchProject(newId);
};

window.renameProject = () => {
    const name = prompt('ตั้งชื่อโปรเจคใหม่:', state.projectName);
    if(!name || name === state.projectName) return;
    state.projectName = name;
    saveLocal();
    renderProjectMenu();
};

window.deleteProject = () => {
    const list = getProjectsList();
    if(list.length <= 1) {
        alert('ไม่สามารถลบโปรเจคสุดท้ายได้ กรุณาสร้างโปรเจคใหม่ก่อนลบโปรเจคนี้');
        return;
    }
    if(!confirm(`คุณต้องการลบโปรเจค "${state.projectName}" ทิ้งอย่างถาวร ใช่หรือไม่?`)) return;
    const newList = list.filter(p => p.id !== currentProjectId);
    saveProjectsList(newList);
    localStorage.removeItem(`planflow_proj_${currentProjectId}`);
    window.switchProject(newList[0].id);
};

const renderProjectMenu = () => {
    const btn = document.getElementById('btn-current-project');
    if(btn) btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        ${state.projectName || 'ไม่มีชื่อโปรเจค'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-left: 6px; flex-shrink:0;"><polyline points="6 9 12 15 18 9"></polyline></svg>
    `;
    const list = getProjectsList();
    let html = '';
    list.sort((a,b)=>b.updated - a.updated).forEach(p => {
        const isCur = p.id === currentProjectId;
        html += `<button class="dd-item" style="${isCur?'background:var(--bg-hover);font-weight:bold;':''}" onclick="switchProject('${p.id}')">
            ${isCur ? '✓ ' : ''}${p.name}
        </button>`;
    });
    html += `<div class="dd-sep"></div>`;
    html += `<button class="dd-item" style="color:var(--accent);" onclick="createProject()">+ สร้างโปรเจคใหม่</button>`;
    html += `<button class="dd-item" onclick="renameProject()">✏️ เปลี่ยนชื่อโปรเจคนี้</button>`;
    html += `<button class="dd-item" style="color:var(--status-late);" onclick="deleteProject()">🗑️ ลบโปรเจคนี้</button>`;
    const menu = document.getElementById('menu-project-list');
    if(menu) menu.innerHTML = html;
};

let syncTimer = null;
const CLOUD_URL = "https://script.google.com/macros/s/AKfycbwAV4cUGPxPP3UoI9TS74l8kZaeI3bO7TUeLMYc0VuKslU-sXTBTzVtLGRGmnEmMOc/exec";

const triggerAutoSync = () => {
    const dot = document.getElementById('sync-dot');
    const text = document.getElementById('sync-text');
    if(!dot || !text) return;
    
    dot.style.background = 'var(--status-progress)';
    text.innerText = 'รอซิงค์...';
    
    if(syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
        dot.style.background = 'var(--status-progress)';
        text.innerText = 'กำลังซิงค์...';
        
        const allData = {};
        const list = getProjectsList();
        allData.projects = list;
        list.forEach(p => {
            allData[`proj_${p.id}`] = JSON.parse(localStorage.getItem(`planflow_proj_${p.id}`) || '{}');
        });
        
        try {
            await fetch(CLOUD_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save', payload: allData })
            });
            dot.style.background = 'var(--status-done)';
            text.innerText = 'ซิงค์สำเร็จ';
        } catch(e) {
            dot.style.background = 'var(--status-late)';
            text.innerText = 'ซิงค์ล้มเหลว';
            console.error('Sync failed', e);
        }
    }, 2000); // 2 seconds debounce
};

const saveLocal = (forceId = currentProjectId) => {
    const d={projectName:state.projectName,tasks:state.tasks.map(t=>({...t,start:fmtDate(t.start),end:fmtDate(t.end),actualStart:fmtDate(t.actualStart),actualEnd:fmtDate(t.actualEnd),baselineStart:fmtDate(t.baselineStart),baselineEnd:fmtDate(t.baselineEnd)})),workOnSundays:state.workOnSundays,workOnHolidays:state.workOnHolidays,holidays:state.holidays};
    localStorage.setItem(`planflow_proj_${forceId}`,JSON.stringify(d));
    let list = getProjectsList();
    const p = list.find(x => x.id === forceId);
    if(p) {
        p.name = state.projectName;
        p.updated = Date.now();
        saveProjectsList(list);
    }
    triggerAutoSync();
};
const loadLocal = () => {
    const raw=localStorage.getItem(`planflow_proj_${currentProjectId}`); if(!raw) return false;
    try{
        const d=JSON.parse(raw);
        state.projectName=d.projectName||state.projectName;
        state.workOnSundays=d.workOnSundays||false;
        state.workOnHolidays=d.workOnHolidays||false;
        if(d.holidays) state.holidays={...state.holidays,...d.holidays};
        state.tasks=(d.tasks||[]).map((t,i)=>{
            const s=parseDate(t.start),e=parseDate(t.end);
            return{...t,start:s,end:e,order:t.order??i,duration:t.duration||workDaysDuration(s,e),actualStart:parseDate(t.actualStart),actualEnd:parseDate(t.actualEnd),baselineStart:parseDate(t.baselineStart),baselineEnd:parseDate(t.baselineEnd),schedulingMode:t.schedulingMode||'manual'};
        });
        return true;
    }catch(e){console.error(e);return false;}
};

// ── SAMPLE DATA ───────────────────────────────────────
const getSampleTasks = () => {
    const td=new Date(); td.setHours(0,0,0,0);
    return [
        {id:1,name:'Phase 1: การวางแผน',start:null,end:null,duration:0,progress:70,parentId:null,isCollapsed:false,dependencies:'',schedulingMode:'manual',order:0,color:'#6c63ff',resource:'ผู้จัดการโครงการ',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
        {id:2,name:'สำรวจตลาด',start:new Date(td),end:addWorkingDays(td,4),duration:5,progress:100,parentId:1,dependencies:'',schedulingMode:'manual',order:0,resource:'ทีมวิจัย',actualStart:new Date(td),actualEnd:addWorkingDays(td,3),baselineStart:null,baselineEnd:null},
        {id:3,name:'กำหนดความต้องการ',start:null,end:null,duration:4,progress:80,parentId:1,dependencies:'2FS+0',schedulingMode:'auto',order:1,resource:'ทีมวิเคราะห์',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
        {id:4,name:'จัดทำแผนโครงการ',start:null,end:null,duration:3,progress:30,parentId:1,dependencies:'3FS+0',schedulingMode:'auto',order:2,resource:'ผู้จัดการโครงการ',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
        {id:5,name:'ประชุม Kick-off',start:null,end:null,duration:1,progress:0,parentId:1,dependencies:'4FS+0',schedulingMode:'auto',order:3,resource:'ทีมทั้งหมด',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
        {id:6,name:'Phase 2: การออกแบบ',start:null,end:null,duration:0,progress:20,parentId:null,isCollapsed:false,dependencies:'5FS+0',schedulingMode:'manual',order:1,color:'#00d4aa',resource:'',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
        {id:7,name:'ออกแบบ UI/UX Wireframe',start:null,end:null,duration:5,progress:40,parentId:6,dependencies:'5FS+1',schedulingMode:'auto',order:0,resource:'UX Designer',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
        {id:8,name:'ออกแบบ Visual Design',start:null,end:null,duration:5,progress:0,parentId:6,dependencies:'7FS+0',schedulingMode:'auto',order:1,resource:'Graphic Designer',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
        {id:9,name:'Phase 3: พัฒนา',start:null,end:null,duration:0,progress:0,parentId:null,isCollapsed:false,dependencies:'8FS+0',schedulingMode:'manual',order:2,color:'#ff5370',resource:'',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
        {id:10,name:'Backend Development',start:null,end:null,duration:10,progress:0,parentId:9,dependencies:'8FS+0',schedulingMode:'auto',order:0,resource:'Backend Dev',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
        {id:11,name:'Frontend Development',start:null,end:null,duration:8,progress:0,parentId:9,dependencies:'8SS+2',schedulingMode:'auto',order:1,resource:'Frontend Dev',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
        {id:12,name:'Testing & QA',start:null,end:null,duration:5,progress:0,parentId:9,dependencies:'10FS+0,11FS+0',schedulingMode:'auto',order:2,resource:'QA Team',actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null},
    ].map((t,i)=>({...t,order:t.order!==undefined?t.order:i}));
};

const assignWBS = () => {
    const walk = (t, prefix) => {
        t.wbs = prefix;
        state.tasks.filter(c=>c.parentId===t.id).sort((a,b)=>(a.order||0)-(b.order||0)).forEach((c, i)=>walk(c, `${prefix}.${i+1}`));
    };
    state.tasks.filter(t=>t.parentId===null).sort((a,b)=>(a.order||0)-(b.order||0)).forEach((t, i)=>walk(t, `${i+1}`));
};

// ── RENDER ────────────────────────────────────────────
const render = () => {
    assignWBS();
    assignColors();
    reevalAutoTasks();
    updateParentDates();
    if(state.showCritical) calcCritical();
    renderHeader();
    renderStats();
    if(state.view==='gantt'){
        document.getElementById('gantt-view').style.display='flex';
        document.getElementById('calendar-view').style.display='none';
        renderGantt();
    } else {
        document.getElementById('gantt-view').style.display='none';
        document.getElementById('calendar-view').style.display='flex';
        renderCalendar();
    }
    saveLocal();
};

const renderHeader = () => {
    // Work toggles
    const sunEl=document.getElementById('toggle-sun');
    const holEl=document.getElementById('toggle-hol');
    sunEl.classList.toggle('active', state.workOnSundays);
    document.getElementById('sun-label').textContent = state.workOnSundays ? 'วันอาทิตย์ ✓' : 'วันอาทิตย์';
    holEl.classList.toggle('active', state.workOnHolidays);
    document.getElementById('hol-label').textContent = state.workOnHolidays ? 'วันหยุด ✓' : 'วันหยุด';
    // Mode
    const modeEl=document.getElementById('toggle-mode');
    modeEl.classList.toggle('active', state.mode==='update');
    document.getElementById('mode-label').textContent = state.mode==='update' ? 'อัปเดต ✓' : 'นำเสนอ';
    // View tabs
    document.getElementById('tab-gantt').classList.toggle('active', state.view==='gantt');
    document.getElementById('tab-calendar').classList.toggle('active', state.view==='calendar');
    // Dropdown items
    document.getElementById('dd-baseline-show').classList.toggle('active', state.showBaseline);
    document.getElementById('dd-critical').classList.toggle('active', state.showCritical);
    // Column buttons
    Object.keys(state.colVisible).forEach(k=>{
        const el=document.getElementById('col-'+k); if(el) el.classList.toggle('active', state.colVisible[k]);
    });
};

const renderStats = () => {
    const tasks=state.tasks.filter(t=>!state.tasks.some(p=>p.id===t.parentId&&state.tasks.some(c=>c.parentId===p.id)));
    const leaves=state.tasks.filter(t=>!state.tasks.some(c=>c.parentId===t.id));
    document.getElementById('stat-total').textContent=state.tasks.length;
    document.getElementById('stat-done').textContent=state.tasks.filter(t=>t.progress>=100).length;
    document.getElementById('stat-late').textContent=state.tasks.filter(t=>calcStatus(t)==='late').length;
};

// ── GANTT RENDERING ───────────────────────────────────
const renderGantt = () => {
    calcGanttRange();
    if(!state.ganttStart||!state.ganttEnd) return;
    // Set day width by zoom
    const dw = state.zoomMode==='day'?38:state.zoomMode==='week'?20:8;
    state.dayWidth=dw;

    const totalDays=Math.ceil(daysBetween(state.ganttStart,state.ganttEnd))+1;
    const totalW=totalDays*dw;

    // Build visible task list (respecting collapse)
    const visible=[];
    const walk=(t,parentCollapsed)=>{
        if(parentCollapsed) return;
        visible.push(t);
        state.tasks.filter(c=>c.parentId===t.id).sort((a,b)=>(a.order||0)-(b.order||0)).forEach(c=>walk(c,t.isCollapsed));
    };
    state.tasks.filter(t=>t.parentId===null).sort((a,b)=>(a.order||0)-(b.order||0)).forEach(t=>walk(t,false));

    const ROW=40; // match --row-h
    const totalH=visible.length*ROW;

    renderTaskPanel(visible, ROW);
    renderGanttChart(visible, totalDays, totalW, totalH, ROW, dw);
};

const renderTaskPanel = (visible, ROW) => {
    // Header
    const cols=buildCols();
    const hdr=document.getElementById('task-header');
    hdr.innerHTML=cols.map(c=>`<div class="th-cell" style="${c.style}">${c.label}</div>`).join('');

    // Body
    const body=document.getElementById('task-body');
    if(!visible.length){
        body.innerHTML=`<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M8 8h8M8 16h4"/></svg><p>ยังไม่มีงาน<br>พิมพ์ชื่องานด้านล่างแล้วกด Enter</p></div>`;
        return;
    }
    body.innerHTML=visible.map((t,i)=>{
        const isParent=state.tasks.some(c=>c.parentId===t.id);
        const level=getLevel(t);
        const status=calcStatus(t);
        const statusMap={done:`<div class="status-chip status-done"><div class="status-dot" style="background:var(--status-done)"></div>เสร็จ</div>`,ok:`<div class="status-chip status-ok"><div class="status-dot" style="background:var(--status-ok)"></div>ตามแผน</div>`,risk:`<div class="status-chip status-risk"><div class="status-dot" style="background:var(--status-risk)"></div>เสี่ยง</div>`,late:`<div class="status-chip status-late"><div class="status-dot" style="background:var(--status-late)"></div>ล่าช้า</div>`};
        const pct=t.progress||0;
        const colorBar=getRootColor(t);
        const rowBg = level===0 ? `background:${colorBar}25;` : (level===1 ? `background:${colorBar}0D;` : '');

        return `<div class="task-row${isParent?' is-parent':''}${state.selectedTaskId===t.id?' selected':''}" data-id="${t.id}" draggable="true" style="${rowBg}">
            ${cols.map(c=>{
                if(c.key==='name') return `<div class="td-cell name-cell" style="${c.style};padding-left:${8+level*18}px;gap:0;">
                    ${isParent?`<button class="collapse-btn${t.isCollapsed?' collapsed':''}" data-collapse="${t.id}">
                        <svg class="collapse-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                    </button>`:'<span style="width:20px;flex-shrink:0;display:inline-block;"></span>'}
                    <span class="task-name-text" style="font-weight:${isParent?'800':'500'};font-size:${isParent?'14px':'13px'};color:${isParent?'var(--text-primary)':'var(--text-secondary)'};">${t.name}</span>
                    <button class="add-subtask-btn" data-add-sub="${t.id}" title="เพิ่มงานย่อย">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    ${state.mode==='update'?`<span style="margin-left:4px;">${statusMap[status]||''}</span>`:''}
                </div>`;
                if(c.key==='id') return `<div class="td-cell" style="${c.style}"><span style="color:var(--text-primary);font-size:${isParent?'13px':'11px'};font-weight:${isParent?'800':'600'};">${t.wbs||t.id}</span></div>`;
                if(c.key==='dur') return `<div class="td-cell" style="${c.style};justify-content:center;">${t.duration||0}วัน</div>`;
                if(c.key==='start') return `<div class="td-cell" style="${c.style};font-size:11px;">${fmtThaiShort(t.start)}</div>`;
                if(c.key==='end') return `<div class="td-cell" style="${c.style};font-size:11px;">${fmtThaiShort(t.end)}</div>`;
                if(c.key==='progress') return `<div class="td-cell" style="${c.style};gap:6px;">
                    <div class="prog-wrap"><div class="prog-fill" style="width:${pct}%;background:${colorBar};"></div></div>
                    <span style="font-size:10px;color:var(--text-secondary);min-width:28px;">${pct}%</span>
                </div>`;
                if(c.key==='resource') return `<div class="td-cell" style="${c.style};font-size:11px;color:var(--text-secondary);">${t.resource||'—'}</div>`;
                return '';
            }).join('')}
        </div>`;
    }).join('');
};

const getLevel = t => {
    let l=0; let cur=t;
    while(cur.parentId!==null){cur=state.tasks.find(p=>p.id===cur.parentId);if(!cur)break;l++;}
    return l;
};

const getRootColor = t => {
    let cur=t;
    while(cur.parentId!==null){
        const p=state.tasks.find(x=>x.id===cur.parentId);
        if(!p)break;
        cur=p;
    }
    return cur.color || '#6c63ff';
};

const buildCols = () => {
    let maxNameWidth = 180;
    if (state.tasks && state.tasks.length > 0) {
        state.tasks.forEach(t => {
            const level = getLevel(t);
            const w = (t.name.length * 7.5) + (level * 18) + 80;
            if (w > maxNameWidth) maxNameWidth = w;
        });
    }
    const cols=[];
    cols.push({key:'id',label:'ID',style:'width:50px;flex-shrink:0;',show:state.colVisible.id});
    cols.push({key:'name',label:'Task Name',style:`flex:1;min-width:${maxNameWidth}px;`,show:true});
    cols.push({key:'dur',label:'Duration (Days)',style:'width:130px;flex-shrink:0;',show:state.colVisible.dur});
    cols.push({key:'start',label:'Start Date',style:'width:110px;flex-shrink:0;',show:state.colVisible.start});
    cols.push({key:'end',label:'End Date',style:'width:110px;flex-shrink:0;',show:state.colVisible.end});
    cols.push({key:'progress',label:'Progress (%)',style:'width:110px;flex-shrink:0;',show:state.colVisible.progress});
    cols.push({key:'resource',label:'Assignee',style:'width:110px;flex-shrink:0;',show:state.colVisible.resource});
    return cols.filter(c=>c.show);
};

const renderGanttChart = (visible, totalDays, totalW, totalH, ROW, dw) => {
    const today=new Date(); today.setHours(0,0,0,0);
    const todayLeft=daysBetween(state.ganttStart,today)*dw;

    // ── Header ──
    const months=new Map();
    const dayColsH=[];
    for(let i=0;i<totalDays;i++){
        const d=addDays(state.ganttStart,i);
        const mk=`${d.getFullYear()}-${d.getMonth()}`;
        if(!months.has(mk)) months.set(mk,{name:`${THAI_MONTHS[d.getMonth()]} ${d.getFullYear()+543}`,count:0,year:d.getFullYear(),month:d.getMonth()});
        months.get(mk).count++;
        const isToday=fmtDate(d)===fmtDate(today);
        const isSun=d.getDay()===0; const isSat=d.getDay()===6;
        const isHol=!!state.holidays[fmtDate(d)];
        let cls='gh-day-cell';
        if(isToday) cls+=' today-col';
        else if(isHol&&!state.workOnHolidays) cls+=' holiday';
        else if(isSun&&!state.workOnSundays) cls+=' sunday';
        else if(isSat) cls+=' saturday';
        dayColsH.push(`<div class="${cls}" style="width:${dw}px;" title="${isHol?state.holidays[fmtDate(d)]:''}">
            ${state.zoomMode==='day'||state.zoomMode==='week'?d.getDate():''}
        </div>`);
    }

    document.getElementById('gh-months').innerHTML=[...months.values()].map(m=>`<div class="gh-month-cell" style="width:${m.count*dw}px;">${m.name}</div>`).join('');
    document.getElementById('gh-days').innerHTML=dayColsH.join('');

    // ── Grid rows ──
    document.getElementById('gantt-grid-rows').innerHTML=visible.map((t,i)=>{
        const isParent=state.tasks.some(c=>c.parentId===t.id);
        const colorBar=getRootColor(t);
        const bg=isParent ? `background:${colorBar}22;` : '';
        return `<div class="gantt-row${isParent?' is-parent':''}" style="width:${totalW}px;${bg}"></div>`;
    }).join('');

    // ── Day columns ──
    let dayColsG='';
    for(let i=0;i<totalDays;i++){
        const d=addDays(state.ganttStart,i);
        const isToday=fmtDate(d)===fmtDate(today);
        const isSun=d.getDay()===0; const isSat=d.getDay()===6;
        const isHol=!!state.holidays[fmtDate(d)];
        let cls='day-col';
        if(isToday) cls+=' today-col';
        else if(isHol&&!state.workOnHolidays) cls+=' holiday';
        else if(isSun&&!state.workOnSundays) cls+=' sunday';
        else if(isSat) cls+=' saturday';
        dayColsG+=`<div class="${cls}" style="left:${i*dw}px;width:${dw}px;height:100%;"></div>`;
    }
    document.getElementById('gantt-day-cols').innerHTML=dayColsG;

    // ── Bars ──
    let barsHtml='';
    visible.forEach((t,i)=>{
        if(!t.start||!t.end) return;
        const isParent=state.tasks.some(c=>c.parentId===t.id);
        const isMilestone=t.duration<=1&&t.start&&t.end&&fmtDate(t.start)===fmtDate(t.end);
        let color=getRootColor(t);
        if(state.showCritical&&t.isCritical) color='#ff5370';
        const top=i*ROW;
        const left=daysBetween(state.ganttStart,t.start)*dw;
        const w=(daysBetween(t.start,t.end)+1)*dw;
        const pct=t.progress||0;

        if(isMilestone){
            barsHtml+=`<div class="gbar gbar-milestone" data-id="${t.id}" style="left:${left+dw/2-9}px;top:${top+10}px;width:18px;height:18px;background:${color};box-shadow:0 0 10px ${color}60;"></div>`;
        } else if(isParent){
            barsHtml+=`<div class="gbar gbar-parent" data-id="${t.id}" style="left:${left}px;top:${top+8}px;width:${w}px;height:14px;background:${color};opacity:0.85;">
                <div class="gbar-inner shimmer" style="width:${pct}%;background:rgba(255,255,255,0.25);"></div>
                <span class="gbar-label" style="line-height:14px;font-size:10px;">${t.name}</span>
            </div>`;
        } else {
            barsHtml+=`<div class="gbar" data-id="${t.id}" style="left:${left}px;top:${top+6}px;width:${w}px;height:26px;background:${color}99;border:1px solid ${color};border-radius:5px;">
                <div class="gbar-inner" style="width:${pct}%;background:linear-gradient(90deg,${color},${color}e6);border-radius:5px 0 0 5px;box-shadow: 2px 0 5px rgba(0,0,0,0.15);"></div>
                ${pct>0?`<div class="gbar-inner shimmer" style="width:${pct}%;border-radius:5px 0 0 5px;"></div>`:''}
                <span class="gbar-label" style="line-height:26px;">${t.name}</span>
            </div>`;
        }
        // Baseline
        if(state.showBaseline&&t.baselineStart&&t.baselineEnd){
            const bl=daysBetween(state.ganttStart,t.baselineStart)*dw;
            const bw=(daysBetween(t.baselineStart,t.baselineEnd)+1)*dw;
            barsHtml+=`<div class="gbar-baseline" style="left:${bl}px;top:${top+ROW-6}px;width:${bw}px;"></div>`;
        }
        // Actual dates bar (update mode)
        if(state.mode==='update'&&t.actualStart&&t.actualEnd){
            const al=daysBetween(state.ganttStart,t.actualStart)*dw;
            const aw=(daysBetween(t.actualStart,t.actualEnd)+1)*dw;
            barsHtml+=`<div style="position:absolute;left:${al}px;top:${top+ROW-7}px;width:${aw}px;height:4px;background:var(--accent-teal);border-radius:2px;opacity:0.7;"></div>`;
        }
    });

    // Today line
    const todayLine=document.getElementById('today-line');
    if(today>=state.ganttStart&&today<=state.ganttEnd){
        todayLine.style.display='block';
        todayLine.style.left=`${todayLeft+dw/2}px`;
        todayLine.style.height=`100%`;
    } else {todayLine.style.display='none';}

    const panelH = document.getElementById('gantt-panel').offsetHeight;
    const headerH = document.getElementById('gantt-header').offsetHeight || 61;
    const canvasH = Math.max(totalH, panelH - headerH);

    document.getElementById('gantt-bars').innerHTML=barsHtml;
    document.getElementById('gantt-canvas').style.width=`${totalW}px`;
    document.getElementById('gantt-canvas').style.height=`${canvasH}px`;

    // ── Dependencies ──
    renderDeps(visible, ROW, dw);


};

const renderDeps = (visible, ROW, dw) => {
    const pos=new Map();
    visible.forEach((t,i)=>{
        const el=document.querySelector(`#gantt-bars [data-id="${t.id}"]`);
        if(!el||!t.start||!t.end) return;
        const l=parseFloat(el.style.left),w=parseFloat(el.style.width),top=i*ROW;
        pos.set(t.id,{x:l,y:top,w,mid:top+ROW/2});
    });
    let svg='';
    visible.forEach(t=>{
        if(!t.dependencies) return;
        t.dependencies.split(',').forEach(dep=>{
            const m=dep.trim().match(/(\d+)(FS|SS|FF|SF)\+?(-?\d+)/);
            if(!m) return;
            const fid=parseInt(m[1]),type=m[2];
            const fp=pos.get(fid),tp=pos.get(t.id);
            if(!fp||!tp) return;
            const fx=type.startsWith('S')?fp.x:fp.x+fp.w;
            const tx=type.endsWith('S')?tp.x:tp.x+tp.w;
            const isCrit=state.showCritical&&t.isCritical&&state.tasks.find(x=>x.id===fid)?.isCritical;
            const color=isCrit?'#ff5370':'rgba(108,99,255,0.5)';
            svg+=`<path d="M${fx},${fp.mid} C${fx+30},${fp.mid} ${tx-30},${tp.mid} ${tx},${tp.mid}" stroke="${color}" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>`;
        });
    });
    const svgEl=document.getElementById('gantt-deps');
    svgEl.setAttribute('width',document.getElementById('gantt-canvas').style.width);
    svgEl.setAttribute('height',document.getElementById('gantt-canvas').style.height);
    svgEl.innerHTML=`<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="rgba(108,99,255,0.7)"/></marker></defs>${svg}`;
};

// ── CALENDAR ──────────────────────────────────────────
const renderCalendar = () => {
    const d=state.calDate; const y=d.getFullYear(); const m=d.getMonth();
    document.getElementById('cal-title').textContent=`${THAI_MONTHS_FULL[m]} ${y+543}`;
    // DOW headers
    document.getElementById('cal-dow').innerHTML=THAI_DAYS.map((day,i)=>`<div class="cal-dow" style="${i===0?'color:var(--accent-rose)':''}">${day}</div>`).join('');
    const today=new Date(); today.setHours(0,0,0,0);
    const first=new Date(y,m,1); const last=new Date(y,m+1,0);
    const startDay=new Date(first); startDay.setDate(1-first.getDay());
    const endDay=new Date(last); endDay.setDate(last.getDate()+(6-last.getDay()));
    let html=''; let cur=new Date(startDay);
    while(cur<=endDay){
        const ds=fmtDate(cur); const isToday=ds===fmtDate(today);
        const isOther=cur.getMonth()!==m; const isNW=!isWorkingDay(cur);
        const hol=state.holidays[ds];
        const tasks=state.tasks.filter(t=>t.start&&t.end&&t.start<=cur&&cur<=t.end&&!state.tasks.some(c=>c.parentId===t.id));
        html+=`<div class="cal-day${isToday?' today':''}${isOther?' other-month':''}${isNW?' non-working':''}" data-date="${ds}">
            <div class="cal-day-num">${cur.getDate()}</div>
            ${hol?`<div style="font-size:9px;color:var(--accent-rose);margin-bottom:2px;font-weight:700;">🎌 ${hol}</div>`:''}
            ${tasks.map(t=>`<div class="cal-task-chip" style="background:${t.color||'#6c63ff'};" data-id="${t.id}" title="${t.name}">${t.name}</div>`).join('')}
        </div>`;
        cur=addDays(cur,1);
    }
    document.getElementById('cal-grid').innerHTML=html;
};

// ── MODAL ─────────────────────────────────────────────
let editingTaskId=null;
const openModal = (taskId) => {
    const t=state.tasks.find(x=>x.id===taskId);
    if(!t) return;
    editingTaskId=taskId;
    document.getElementById('modal-task-title').textContent=`แก้ไขงาน: ${t.name}`;
    document.getElementById('modal-task-id').value=taskId;
    document.getElementById('f-name').value=t.name;
    document.getElementById('f-resource').value=t.resource||'';
    document.getElementById('f-duration').value=t.duration||0;
    document.getElementById('f-start').value=fmtDate(t.start);
    document.getElementById('f-end').value=fmtDate(t.end);
    document.getElementById('f-actual-start').value=fmtDate(t.actualStart);
    document.getElementById('f-actual-end').value=fmtDate(t.actualEnd);
    document.getElementById('f-progress').value=t.progress||0;
    document.getElementById('prog-val').textContent=t.progress||0;
    if(t.schedulingMode==='auto') document.getElementById('sched-auto').checked=true;
    else document.getElementById('sched-manual').checked=true;
    // Parent select
    const descendants=getDescendants(taskId); const forbidden=new Set([taskId,...descendants]);
    document.getElementById('f-parent').innerHTML=`<option value="">— ไม่มี (งานหลัก) —</option>`+
        state.tasks.filter(x=>!forbidden.has(x.id)).map(x=>`<option value="${x.id}"${x.id===t.parentId?'selected':''}>${x.id}: ${x.name}</option>`).join('');
    // Deps
    document.getElementById('f-dep-task').innerHTML=`<option value="">— ไม่มี —</option>`+
        state.tasks.filter(x=>x.id!==taskId).map(x=>`<option value="${x.id}">${x.id}: ${x.name}</option>`).join('');
    const dm=t.dependencies&&t.dependencies.match(/(\d+)(FS|SS|FF|SF)\+?(-?\d+)/);
    if(dm){document.getElementById('f-dep-task').value=dm[1];document.getElementById('f-dep-type').value=dm[2];document.getElementById('f-dep-lag').value=dm[3]||0;}
    else{document.getElementById('f-dep-task').value='';document.getElementById('f-dep-type').value='FS';document.getElementById('f-dep-lag').value=0;}
    // Color picker
    document.getElementById('color-picker').innerHTML=COLORS.map(c=>`<div style="width:24px;height:24px;border-radius:6px;background:${c};cursor:pointer;border:2px solid ${c===t.color?'#fff':'transparent'};transition:all .2s;box-shadow:${c===t.color?`0 0 8px ${c}`:'none'};" data-color="${c}" title="${c}"></div>`).join('');
    // Mode fields
    const isParent=state.tasks.some(c=>c.parentId===taskId);
    document.getElementById('f-start').disabled=t.schedulingMode==='auto'||isParent;
    document.getElementById('f-end').disabled=t.schedulingMode==='auto'||isParent;
    document.getElementById('f-duration').disabled=isParent;
    document.getElementById('task-modal').classList.add('show');
};
const closeModal = () => { document.getElementById('task-modal').classList.remove('show'); editingTaskId=null; };

const openHolidayModal = () => {
    renderHolidayList();
    document.getElementById('holiday-modal').classList.add('show');
};
const renderHolidayList = () => {
    const sorted=Object.entries(state.holidays).sort(([a],[b])=>a.localeCompare(b));
    document.getElementById('holiday-list').innerHTML=sorted.map(([date,name])=>`
        <div class="holiday-item">
            <span class="hdate">${fmtThai(date)}</span>
            <span class="hname">${name}</span>
            <button class="hdel" data-del="${date}" title="ลบ">✕</button>
        </div>`).join('');
};

// ── EXPORT ────────────────────────────────────────────
const saveProjectFile = () => {
    const data={projectName:state.projectName,tasks:state.tasks.map(t=>({...t,start:fmtDate(t.start),end:fmtDate(t.end),actualStart:fmtDate(t.actualStart),actualEnd:fmtDate(t.actualEnd),baselineStart:fmtDate(t.baselineStart),baselineEnd:fmtDate(t.baselineEnd)})),holidays:state.holidays,workOnSundays:state.workOnSundays,workOnHolidays:state.workOnHolidays};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${state.projectName}.planflow.json`;a.click();
    toast('บันทึกไฟล์เรียบร้อย','success');
};
const loadProjectFile = (file) => {
    const r=new FileReader();
    r.onload=e=>{try{
        const d=JSON.parse(e.target.result);
        state.projectName=d.projectName||state.projectName;
        state.workOnSundays=d.workOnSundays||false;
        state.workOnHolidays=d.workOnHolidays||false;
        if(d.holidays) state.holidays={...state.holidays,...d.holidays};
        state.tasks=(d.tasks||[]).map((t,i)=>{
            const s=parseDate(t.start),en=parseDate(t.end);
            return{...t,start:s,end:en,order:t.order??i,duration:t.duration||workDaysDuration(s,en),actualStart:parseDate(t.actualStart),actualEnd:parseDate(t.actualEnd),baselineStart:parseDate(t.baselineStart),baselineEnd:parseDate(t.baselineEnd),schedulingMode:t.schedulingMode||'manual'};
        });
        document.getElementById('project-name-input').value=state.projectName;
        reevalAutoTasks(); updateParentDates(); render();
        toast('โหลดโครงการเรียบร้อย','success');
    }catch(err){toast('โหลดไฟล์ไม่สำเร็จ','error');console.error(err);}};
    r.readAsText(file);
};
const exportCSV = () => {
    const h=['ID','Task Name','Duration (Days)','Start Date','End Date','Assignee','Progress (%)','Dependencies'];
    const rows=state.tasks.map(t=>[t.id,`"${t.name}"`,t.duration||0,fmtDate(t.start),fmtDate(t.end),`"${t.resource||''}"`,t.progress||0,`"${t.dependencies||''}"`].join(','));
    const blob=new Blob([[h.join(','),...rows].join('\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${state.projectName}.csv`;a.click();
    toast('ส่งออก CSV เรียบร้อย','success');
};
const exportExcel = () => {
    const map=new Map(state.tasks.map(t=>[t.id,t]));
    const getLevel=t=>{let l=0;let cur=t;while(cur.parentId){cur=map.get(cur.parentId);if(!cur)break;l++;}return l;};
    let html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>table,th,td{border:1px solid #ccc;border-collapse:collapse}th{background:#f9fafb;color:#1f2937;padding:6px}td{padding:5px}</style></head><body><table><thead><tr><th>ID</th><th>Task Name</th><th>Duration (Days)</th><th>Start Date</th><th>End Date</th><th>Assignee</th><th>Progress (%)</th></tr></thead><tbody>`;
    const addRow=t=>{
        const l=getLevel(t); const indent='&nbsp;'.repeat(l*4);
        html+=`<tr><td>${t.id}</td><td>${indent}${t.name}</td><td>${t.duration||0}</td><td>${fmtDate(t.start)}</td><td>${fmtDate(t.end)}</td><td>${t.resource||''}</td><td>${t.progress||0}%</td></tr>`;
        state.tasks.filter(c=>c.parentId===t.id).sort((a,b)=>(a.order||0)-(b.order||0)).forEach(addRow);
    };
    state.tasks.filter(t=>t.parentId===null).sort((a,b)=>(a.order||0)-(b.order||0)).forEach(addRow);
    html+=`</tbody></table></body></html>`;
    const blob=new Blob([html],{type:'application/vnd.ms-excel'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${state.projectName}.xls`;a.click();
    toast('ส่งออก Excel เรียบร้อย','success');
};
const exportImage = () => {
    const el=document.getElementById('main-area');
    const tbw=document.getElementById('task-body-wrap');
    const gs=document.getElementById('gantt-scroll');
    const addBar=document.getElementById('task-add-bar');
    
    // Save original styles
    const oldBorderTop=el.style.borderTop;
    const oldBorder=el.style.border;
    const oldHeight=el.style.height;
    const oldFlex=el.style.flex;
    const oldTbwOverflow=tbw.style.overflow;
    const oldGsOverflow=gs.style.overflow;
    const oldAddBarDisplay=addBar.style.display;
    
    // Calculate content height
    const theadH = document.getElementById('task-header').offsetHeight || 54;
    const tbodyH = document.getElementById('task-body').offsetHeight || 0;
    const contentH = theadH + tbodyH;
    
    // Temporarily adjust for capture
    addBar.style.display = 'none';
    tbw.style.overflow = 'hidden';
    gs.style.overflow = 'hidden';
    el.style.flex = 'none';
    el.style.height = `${contentH + 2}px`; // +2 for borders
    el.style.border = '1px solid var(--border-dark)';
    
    html2canvas(el,{backgroundColor:state.theme==='dark'?'#0f172a':'#f3f4f6',scale:3,useCORS:true}).then(c=>{
        // Restore
        el.style.borderTop=oldBorderTop;
        el.style.border=oldBorder;
        el.style.height=oldHeight;
        el.style.flex=oldFlex;
        tbw.style.overflow=oldTbwOverflow;
        gs.style.overflow=oldGsOverflow;
        addBar.style.display=oldAddBarDisplay;
        
        const a=document.createElement('a');a.download=`${state.projectName}.png`;a.href=c.toDataURL('image/png',1.0);a.click();
        toast('ส่งออกรูปภาพเรียบร้อย','success');
    }).catch(()=>{
        el.style.borderTop=oldBorderTop;
        el.style.border=oldBorder;
        el.style.height=oldHeight;
        el.style.flex=oldFlex;
        tbw.style.overflow=oldTbwOverflow;
        gs.style.overflow=oldGsOverflow;
        addBar.style.display=oldAddBarDisplay;
        toast('ส่งออกรูปภาพไม่สำเร็จ','error');
    });
};

// ── SCROLL SYNC ───────────────────────────────────────
const setupScrollSync = () => {
    const tbw=document.getElementById('task-body-wrap');
    const gs=document.getElementById('gantt-scroll');
    const ghw=document.getElementById('gantt-header-wrap');
    let syncing=false;
    let snapTimeout;
    const sync=(src,targets)=>{
        if(syncing) return; syncing=true;
        targets.forEach(t=>{t.scrollTop=src.scrollTop;if(t===ghw)t.scrollLeft=src.scrollLeft;});
        requestAnimationFrame(()=>syncing=false);
    };
    tbw.addEventListener('scroll',()=>sync(tbw,[gs]));
    gs.addEventListener('scroll',()=>{
        sync(gs,[tbw]);
        ghw.scrollLeft=gs.scrollLeft;
        clearTimeout(snapTimeout);
        snapTimeout = setTimeout(() => {
            const dw = state.dayWidth;
            if (dw > 0) {
                const targetLeft = Math.round(gs.scrollLeft / dw) * dw;
                if (Math.abs(gs.scrollLeft - targetLeft) > 1) {
                    gs.scrollTo({ left: targetLeft, behavior: 'smooth' });
                }
            }
        }, 150);
    });
};

// ── PANEL RESIZER ─────────────────────────────────────
const setupResizer = () => {
    const r=document.getElementById('resizer');
    const p=document.getElementById('task-panel');
    let dragging=false; let startX=0; let startW=0;
    r.addEventListener('mousedown',e=>{dragging=true;startX=e.clientX;startW=p.offsetWidth;r.classList.add('dragging');e.preventDefault();});
    document.addEventListener('mousemove',e=>{if(!dragging) return;const w=Math.max(200,Math.min(700,startW+e.clientX-startX));p.style.width=`${w}px`;});
    document.addEventListener('mouseup',()=>{dragging=false;r.classList.remove('dragging');});
};

// ── DRAG & DROP ───────────────────────────────────────
let dragId=null;
const setupDragDrop = () => {
    const body=document.getElementById('task-body');
    body.addEventListener('dragstart',e=>{
        const row=e.target.closest('.task-row');
        if(!row) return;
        dragId=parseInt(row.dataset.id);
        e.dataTransfer.effectAllowed='move';
        setTimeout(()=>row.classList.add('drag-ghost'),0);
    });
    body.addEventListener('dragover',e=>{
        e.preventDefault();
        const row=e.target.closest('.task-row');
        document.querySelectorAll('.drop-above,.drop-below,.drop-into').forEach(x=>{if(x!==row){x.classList.remove('drop-above','drop-below','drop-into');}});
        if(!row||!dragId) return;
        const tid=parseInt(row.dataset.id);
        const dt=state.tasks.find(t=>t.id===dragId);
        const tt=state.tasks.find(t=>t.id===tid);
        if(!dt||!tt||dt.id===tt.id) return;
        let isDescendant=false;let curr=tt;
        while(curr.parentId){if(curr.parentId===dt.id){isDescendant=true;break;}curr=state.tasks.find(x=>x.id===curr.parentId)||{};}
        if(isDescendant) return;
        const rect=row.getBoundingClientRect();
        const y=e.clientY-rect.top;
        if(y<rect.height*0.25){row.classList.add('drop-above');row.classList.remove('drop-below','drop-into');}
        else if(y>rect.height*0.75){row.classList.add('drop-below');row.classList.remove('drop-above','drop-into');}
        else{row.classList.add('drop-into');row.classList.remove('drop-above','drop-below');}
    });
    body.addEventListener('dragleave',e=>{const r=e.target.closest('.task-row');if(r){r.classList.remove('drop-above','drop-below','drop-into');}});
    body.addEventListener('drop',e=>{
        e.preventDefault();
        const row=e.target.closest('.task-row');
        if(!row||!dragId) return;
        const tid=parseInt(row.dataset.id);
        const dt=state.tasks.find(t=>t.id===dragId);
        const tt=state.tasks.find(t=>t.id===tid);
        const above=row.classList.contains('drop-above');
        const into=row.classList.contains('drop-into');
        row.classList.remove('drop-above','drop-below','drop-into');
        if(!dt||!tt||dt.id===tt.id) return;
        let isDescendant=false;let curr=tt;
        while(curr.parentId){if(curr.parentId===dt.id){isDescendant=true;break;}curr=state.tasks.find(x=>x.id===curr.parentId)||{};}
        if(isDescendant) return;
        
        if(into){
            dt.parentId=tt.id;
            const sibs=state.tasks.filter(t=>t.parentId===tt.id).sort((a,b)=>(a.order||0)-(b.order||0));
            dt.order=sibs.length?sibs[sibs.length-1].order+1:0;
        }else{
            dt.parentId=tt.parentId;
            const sibs=state.tasks.filter(t=>t.parentId===dt.parentId).sort((a,b)=>(a.order||0)-(b.order||0));
            const di=sibs.findIndex(t=>t.id===dragId);
            if(di>-1) sibs.splice(di,1);
            let ti=sibs.findIndex(t=>t.id===tid);
            sibs.splice(above?ti:ti+1,0,dt);
            sibs.forEach((t,i)=>{const ts=state.tasks.find(x=>x.id===t.id);if(ts)ts.order=i;});
        }
        reevalAutoTasks();
        updateParentDates();
        render();
    });
    body.addEventListener('dragend',()=>{document.querySelectorAll('.drag-ghost').forEach(x=>x.classList.remove('drag-ghost'));dragId=null;});
};

// ── GANTT BAR CLICK ───────────────────────────────────
const setupGanttBarClick = () => {
    document.getElementById('gantt-bars').addEventListener('click',e=>{
        const bar=e.target.closest('[data-id]');
        if(bar) openModal(parseInt(bar.dataset.id));
    });
};

// ── SYNC DATE FIELDS IN MODAL ─────────────────────────
const syncModalDates = (changed) => {
    if(!document.getElementById('sched-manual').checked) return;
    const dur=parseInt(document.getElementById('f-duration').value)||0;
    const s=document.getElementById('f-start').value;
    const en=document.getElementById('f-end').value;
    if(changed==='duration'||changed==='start'){
        if(s&&dur>=0){
            const ns=parseDate(s); if(!ns) return;
            const ne=addWorkingDays(ns,Math.max(0,dur-1));
            document.getElementById('f-end').value=fmtDate(ne);
        }
    } else if(changed==='end'){
        if(s&&en){
            const ns=parseDate(s),ne=parseDate(en);
            if(ns&&ne&&ne>=ns) document.getElementById('f-duration').value=workDaysDuration(ns,ne);
        }
    }
};

// ── INIT & EVENTS ─────────────────────────────────────
const init = () => {
    // Load data
    migrateIfNeeded();
    if(!loadLocal()){
        state.tasks=getSampleTasks();
        reevalAutoTasks();
        updateParentDates();
    }
    renderProjectMenu();
    setupScrollSync();
    setupResizer();
    setupDragDrop();
    setupGanttBarClick();
    
    document.getElementById('task-body-wrap').addEventListener('scroll', e => {
        document.getElementById('task-header').scrollLeft = e.target.scrollLeft;
    });

    // ─ Header events ─
    document.getElementById('toggle-sun').addEventListener('click',()=>{state.workOnSundays=!state.workOnSundays;reevalAutoTasks();updateParentDates();render();});
    document.getElementById('toggle-hol').addEventListener('click',()=>{state.workOnHolidays=!state.workOnHolidays;reevalAutoTasks();updateParentDates();render();});
    document.getElementById('toggle-mode').addEventListener('click',()=>{state.mode=state.mode==='presentation'?'update':'presentation';render();});
    document.getElementById('tab-gantt').addEventListener('click',()=>{state.view='gantt';render();});
    document.getElementById('tab-calendar').addEventListener('click',()=>{state.view='calendar';render();});
    document.getElementById('btn-add-task').addEventListener('click',()=>{
        const td=new Date(); td.setHours(0,0,0,0);
        const end=addWorkingDays(td,0);
        const topOrder=Math.max(-1,...state.tasks.filter(t=>t.parentId===null).map(t=>t.order||0));
        const newTaskId = nextId();
        const color=COLORS[Math.floor(Math.random()*COLORS.length)];
        state.tasks.push({id:newTaskId,name:'งานใหม่',start:td,end,duration:1,progress:0,parentId:null,isCollapsed:false,dependencies:'',schedulingMode:'manual',order:topOrder+1,resource:'',color:color,actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null});
        render();
        openModal(newTaskId);
    });
    document.getElementById('btn-goto-today').addEventListener('click',()=>{
        const gs=document.getElementById('gantt-scroll');
        const offset=daysBetween(state.ganttStart,new Date())*state.dayWidth;
        gs.scrollLeft=Math.max(0,offset-gs.offsetWidth/2);
    });

    // Dropdown toggles
    document.querySelectorAll('.dropdown').forEach(dd=>{
        const btn=dd.querySelector('.dropdown-toggle');
        btn.addEventListener('click',e=>{e.stopPropagation();document.querySelectorAll('.dropdown.open').forEach(o=>{if(o!==dd)o.classList.remove('open');});dd.classList.toggle('open');});
    });
    document.addEventListener('click',()=>document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open')));

    // Dropdown items
    document.getElementById('dd-baseline-set').addEventListener('click',()=>{
        state.tasks.forEach(t=>{t.baselineStart=t.start;t.baselineEnd=t.end;});
        toast('ตั้ง Baseline เรียบร้อย','success');render();
    });
    document.getElementById('dd-baseline-show').addEventListener('click',()=>{state.showBaseline=!state.showBaseline;render();});
    document.getElementById('dd-critical').addEventListener('click',()=>{state.showCritical=!state.showCritical;render();});
    document.getElementById('dd-holidays-mgr').addEventListener('click',openHolidayModal);

    // Zoom
    document.getElementById('zoom-day').addEventListener('click',()=>{state.zoomMode='day';render();});
    document.getElementById('zoom-week').addEventListener('click',()=>{state.zoomMode='week';render();});
    document.getElementById('zoom-month').addEventListener('click',()=>{state.zoomMode='month';render();});

    // File
    document.getElementById('btn-save').addEventListener('click',saveProjectFile);
    document.getElementById('btn-load').addEventListener('click',()=>document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change',e=>{if(e.target.files[0])loadProjectFile(e.target.files[0]);e.target.value='';});
    document.getElementById('btn-export-csv').addEventListener('click',exportCSV);
    document.getElementById('btn-export-excel').addEventListener('click',exportExcel);
    document.getElementById('btn-export-img').addEventListener('click',exportImage);

    // Cloud Sync uses auto-sync now.

    // Column toggles
    Object.keys(state.colVisible).forEach(k=>{
        const el=document.getElementById('col-'+k);
        if(el) el.addEventListener('click',()=>{state.colVisible[k]=!state.colVisible[k];render();});
    });

    // Add task (new input or button)
    const addMainTask = () => {
        const input = document.getElementById('new-task-input');
        if(!input.value.trim()) return;
        const name=input.value.trim(); input.value='';
        const td=new Date(); td.setHours(0,0,0,0);
        const dur=1; const end=addWorkingDays(td,0);
        const topOrder=Math.max(-1,...state.tasks.filter(t=>t.parentId===null).map(t=>t.order||0));
        const color=COLORS[Math.floor(Math.random()*COLORS.length)];
        state.tasks.push({id:nextId(),name,start:td,end,duration:dur,progress:0,parentId:null,isCollapsed:false,dependencies:'',schedulingMode:'manual',order:topOrder+1,resource:'',color:color,actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null});
        render();
        toast(`เพิ่มงาน "${name}" เรียบร้อย`,'success');
    };
    document.getElementById('new-task-input').addEventListener('keydown',e=>{
        if(e.key==='Enter') addMainTask();
    });
    document.getElementById('btn-add-main-task').addEventListener('click', addMainTask);

    // Task body click (collapse + open modal)
    document.getElementById('task-body').addEventListener('click',e=>{
        const addSubBtn = e.target.closest('[data-add-sub]');
        if(addSubBtn){
            e.stopPropagation();
            const parentId = parseInt(addSubBtn.dataset.addSub);
            const td=new Date(); td.setHours(0,0,0,0);
            const dur=1; const end=addWorkingDays(td,0);
            const color=COLORS[Math.floor(Math.random()*COLORS.length)];
            const order=Math.max(-1,...state.tasks.filter(t=>t.parentId===parentId).map(t=>t.order||0));
            const newId = nextId();
            state.tasks.push({id:newId,name:'งานย่อยใหม่',start:td,end,duration:dur,progress:0,parentId:parentId,isCollapsed:false,dependencies:'',schedulingMode:'manual',order:order+1,resource:'',color:color,actualStart:null,actualEnd:null,baselineStart:null,baselineEnd:null});
            const pTask = state.tasks.find(x=>x.id===parentId);
            if(pTask) pTask.isCollapsed = false;
            render();
            state.selectedTaskId = newId;
            openModal(newId);
            return;
        }
        const cb=e.target.closest('[data-collapse]');
        if(cb){e.stopPropagation();const id=parseInt(cb.dataset.collapse);const t=state.tasks.find(x=>x.id===id);if(t){t.isCollapsed=!t.isCollapsed;render();}return;}
        const row=e.target.closest('.task-row');
        if(row){state.selectedTaskId=parseInt(row.dataset.id);openModal(state.selectedTaskId);}
    });
    document.getElementById('cal-grid').addEventListener('click',e=>{
        const chip=e.target.closest('[data-id]');
        if(chip) openModal(parseInt(chip.dataset.id));
    });

    // Modal events
    document.getElementById('modal-close').addEventListener('click',closeModal);
    document.getElementById('modal-cancel').addEventListener('click',closeModal);
    // document.getElementById('task-modal').addEventListener('click',e=>{if(e.target===document.getElementById('task-modal'))closeModal();});
    document.getElementById('f-progress').addEventListener('input',e=>document.getElementById('prog-val').textContent=e.target.value);
    document.getElementById('f-duration').addEventListener('input',()=>syncModalDates('duration'));
    document.getElementById('f-start').addEventListener('input',()=>syncModalDates('start'));
    document.getElementById('f-end').addEventListener('input',()=>syncModalDates('end'));
    document.getElementById('f-dep-task').addEventListener('change',()=>{
        if(document.getElementById('sched-auto').checked){
            const taskId=editingTaskId;
            const dur=parseInt(document.getElementById('f-duration').value)||1;
            const depId=document.getElementById('f-dep-task').value;
            const depType=document.getElementById('f-dep-type').value;
            const lag=parseInt(document.getElementById('f-dep-lag').value)||0;
            const tmpTask={id:taskId,duration:dur,dependencies:depId?`${depId}${depType}+${lag}`:''};
            const nd=calcFromDeps(tmpTask);
            if(nd){document.getElementById('f-start').value=fmtDate(nd.start);document.getElementById('f-end').value=fmtDate(nd.end);}
        }
    });
    document.getElementById('color-picker').addEventListener('click',e=>{
        const d=e.target.closest('[data-color]');
        if(!d) return;
        const t=state.tasks.find(x=>x.id===editingTaskId);
        if(t){t.color=d.dataset.color;document.getElementById('color-picker').innerHTML=COLORS.map(c=>`<div style="width:24px;height:24px;border-radius:6px;background:${c};cursor:pointer;border:2px solid ${c===d.dataset.color?'#fff':'transparent'};transition:all .2s;box-shadow:${c===d.dataset.color?`0 0 8px ${c}`:'none'};" data-color="${c}"></div>`).join('');}
    });
    document.getElementById('btn-save-task').addEventListener('click',()=>{
        const taskId=editingTaskId; if(!taskId) return;
        const t=state.tasks.find(x=>x.id===taskId); if(!t) return;
        t.name=document.getElementById('f-name').value||t.name;
        t.resource=document.getElementById('f-resource').value;
        t.duration=parseInt(document.getElementById('f-duration').value)||0;
        t.schedulingMode=document.querySelector('input[name=sched]:checked').value;
        const newParent=document.getElementById('f-parent').value;
        t.parentId=newParent?parseInt(newParent):null;
        if(t.schedulingMode==='manual'){
            t.start=parseDate(document.getElementById('f-start').value);
            t.end=parseDate(document.getElementById('f-end').value);
        }
        t.actualStart=parseDate(document.getElementById('f-actual-start').value);
        t.actualEnd=parseDate(document.getElementById('f-actual-end').value);
        t.progress=parseInt(document.getElementById('f-progress').value)||0;
        const depId=document.getElementById('f-dep-task').value;
        const depType=document.getElementById('f-dep-type').value;
        const lag=parseInt(document.getElementById('f-dep-lag').value)||0;
        t.dependencies=depId?`${depId}${depType}+${lag}`:'';
        if(t.schedulingMode==='auto'){const nd=calcFromDeps(t);if(nd){t.start=nd.start;t.end=nd.end;t.duration=workDaysDuration(nd.start,nd.end);}}
        closeModal();
        propagate(taskId);
        updateParentDates();
        render();
        toast('บันทึกงานเรียบร้อย','success');
    });
    document.getElementById('btn-delete-task').addEventListener('click',()=>{
        const taskId=editingTaskId; if(!taskId) return;
        const t=state.tasks.find(x=>x.id===taskId);
        if(!t) return;
        const name=t.name;
        const desc=getDescendants(taskId);
        state.tasks=state.tasks.filter(x=>x.id!==taskId&&!desc.includes(x.id));
        state.tasks.forEach(x=>{if(x.dependencies)x.dependencies=x.dependencies.split(',').filter(d=>!d.trim().match(new RegExp(`^${taskId}(FS|SS|FF|SF)`))).join(',');});
        closeModal();
        reevalAutoTasks();
        updateParentDates();
        render();
        toast(`ลบงาน "${name}" เรียบร้อย`,'info');
    });

    // Holiday modal
    document.getElementById('hol-modal-close').addEventListener('click',()=>document.getElementById('holiday-modal').classList.remove('show'));
    document.getElementById('hol-close').addEventListener('click',()=>document.getElementById('holiday-modal').classList.remove('show'));
    document.getElementById('btn-add-hol').addEventListener('click',()=>{
        const date=document.getElementById('new-hol-date').value;
        const name=document.getElementById('new-hol-name').value.trim();
        if(!date||!name){toast('กรุณากรอกวันที่และชื่อวันหยุด','error');return;}
        state.holidays[date]=name;
        document.getElementById('new-hol-date').value='';
        document.getElementById('new-hol-name').value='';
        renderHolidayList();
        render();
        toast(`เพิ่มวันหยุด "${name}" เรียบร้อย`,'success');
    });
    document.getElementById('holiday-list').addEventListener('click',e=>{
        const del=e.target.closest('[data-del]');
        if(del){delete state.holidays[del.dataset.del];renderHolidayList();render();}
    });

    // Calendar nav
    document.getElementById('cal-prev').addEventListener('click',()=>{state.calDate.setMonth(state.calDate.getMonth()-1);render();});
    document.getElementById('cal-next').addEventListener('click',()=>{state.calDate.setMonth(state.calDate.getMonth()+1);render();});
    document.getElementById('cal-today').addEventListener('click',()=>{state.calDate=new Date();render();});

    // ── AI ASSISTANT LOGIC ────────────────────────────────
    const aiChatbox = document.getElementById('ai-chatbox');
    const aiChat = document.getElementById('ai-chat-history');
    const aiInput = document.getElementById('ai-prompt-input');
    
    document.getElementById('btn-fab-ai').addEventListener('click', () => aiChatbox.classList.toggle('open'));
    document.getElementById('ai-close').addEventListener('click', () => aiChatbox.classList.remove('open'));

    const addAiMsg = (text, type) => {
        const d = document.createElement('div');
        d.className = `ai-msg ${type}`;
        d.textContent = text;
        aiChat.appendChild(d);
        aiChat.scrollTop = aiChat.scrollHeight;
    };

    const processAiRequest = async () => {
        const prompt = aiInput.value.trim();
        if (!prompt) return;
        aiInput.value = '';
        addAiMsg(prompt, 'user');
        
        const typing = document.createElement('div');
        typing.className = 'ai-typing';
        typing.textContent = 'AI กำลังคิด...';
        aiChat.appendChild(typing);
        aiChat.scrollTop = aiChat.scrollHeight;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, tasks: state.tasks })
            });
            
            if (!res.ok) {
                const err = await res.json().catch(()=>({}));
                throw new Error(err.error || `Server Error: ${res.status}`);
            }
            
            const data = await res.json();
            let text = data.text;
            let rawJson = text;
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (jsonMatch) {
                rawJson = jsonMatch[1];
            } else {
                const startIdx = text.indexOf('[');
                const endIdx = text.lastIndexOf(']');
                if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                    rawJson = text.substring(startIdx, endIdx + 1);
                }
            }
            try {
                const newTasks = JSON.parse(rawJson.trim());
                if (Array.isArray(newTasks)) {
                    state.tasks = newTasks;
                    reevalAutoTasks();
                    updateParentDates();
                    render();
                    addAiMsg('อัปเดตแผนงานเรียบร้อยแล้วค่ะ!', 'bot');
                } else {
                    throw new Error('Returned JSON is not an array.');
                }
            } catch (err) {
                console.error(err, rawJson);
                if (text && !text.includes('```json')) {
                    addAiMsg(text, 'bot');
                } else {
                    addAiMsg('ขออภัย ไม่สามารถประมวลผลข้อมูล JSON จาก AI ได้', 'system');
                }
            }
        } catch (e) {
            console.error(e);
            addAiMsg(`เกิดข้อผิดพลาด: ${e.message}`, 'system');
        } finally {
            typing.remove();
        }
    };

    document.getElementById('btn-ai-send').addEventListener('click', processAiRequest);
    aiInput.addEventListener('keydown', e => { if(e.key === 'Enter') processAiRequest(); });

    // Initial render
    render();

    // Scroll to today
    window.addEventListener('load',()=>{
        setTimeout(()=>{
            const gs=document.getElementById('gantt-scroll');
            const offset=daysBetween(state.ganttStart||new Date(),new Date())*state.dayWidth;
            gs.scrollLeft=Math.max(0,offset-gs.offsetWidth/2);
        },150);
    });
};

// Boot!
document.addEventListener('DOMContentLoaded', init);
