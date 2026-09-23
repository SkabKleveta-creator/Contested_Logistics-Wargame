const STORAGE_KEY="conlog-state-v01";
let scenario;
let state;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

async function loadScenario(){
  const res=await fetch("./data/scenario.json");
  if(!res.ok) throw new Error("Scenario data failed to load");
  scenario=await res.json();
}

function freshState(){
  return {
    minute:0,running:true,speed:1,role:"Commander",
    nodes:structuredClone(scenario.nodes),
    routes:structuredClone(scenario.routes),
    assets:structuredClone(scenario.assets),
    requests:structuredClone(scenario.requests),
    intel:structuredClone(scenario.intel),
    movements:[],logs:[],commsDegraded:false,weather:"CLEAR",nextId:1,
    flash:""
  };
}

function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && typeof saved.minute==="number") return saved;
  }catch{}
  return freshState();
}
function saveState(show=true){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  if(show) feedback("Campaign state saved locally.");
}
function resetState(){
  if(!confirm("Reset Scenario 001 to H+00:00?")) return;
  localStorage.removeItem(STORAGE_KEY); state=freshState(); seedLog(); render();
}
function ht(min=state.minute){
  const h=Math.floor(min/60).toString().padStart(2,"0");
  const m=Math.floor(min%60).toString().padStart(2,"0");
  return `H+${h}:${m}`;
}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function log(actor,msg,type="info"){
  state.logs.unshift({t:state.minute,actor,msg,type});
  state.logs=state.logs.slice(0,150);
}
function flash(msg){
  state.flash=msg;
  const el=$("#flash"); el.textContent=msg; el.classList.remove("hidden");
  clearTimeout(window.__flashTimer);
  window.__flashTimer=setTimeout(()=>el.classList.add("hidden"),7000);
}
function feedback(msg,bad=false){
  const el=$("#orderFeedback");el.textContent=msg;el.style.color=bad?"#e58b8e":"#7897a3";
}
function seedLog(){
  log("SYSTEM","Scenario initialized. White Cell authority active.");
  log("OPERATIONS","Final operational requirement scheduled for H+72.");
  log("LOGISTICS","Initial sustainment posture established.");
}

function roleHint(){
  const hints={
    "Commander":"Broad operational picture. Detailed inventories intentionally summarized.",
    "Operations":"Mission timing, supported-force status, and active requirements emphasized.",
    "Logistics":"Cross-functional sustainment picture and competing priorities emphasized.",
    "Supply":"Inventory accuracy, stock posture, and requisition demand emphasized.",
    "Maintenance":"Readiness degradation and Class IX dependency emphasized.",
    "Transportation":"Asset availability, routes, travel time, and active movements emphasized.",
    "Intel / Information":"Threat, route risk, confidence, and communications emphasized.",
    "White Cell":"Full truth view, scenario control, injects, and adjudication."
  };
  return hints[state.role]||"";
}

function readinessColor(v){return v<55?"bad":v<72?"warn":""}
function supplyAggregate(type){
  let total=0;
  state.nodes.forEach(n=>{
    if(n.inventory) total+=n.inventory[type]||0;
    if(n.stocks) total+=n.stocks[type]||0;
  });
  return total;
}
function supplyPct(type){
  const baselines={"Fuel":67,"Class IX":43,"Food / Water":67,"Ammunition":48};
  return clamp(Math.round(supplyAggregate(type)/baselines[type]*100),0,100);
}

function renderRoles(){
  $("#roleSelect").innerHTML=scenario.roles.map(r=>`<option ${r===state.role?"selected":""}>${r}</option>`).join("");
  $("#roleHint").textContent=roleHint();
  $("#whiteCellCard").classList.toggle("hidden",state.role!=="White Cell");
}
function renderHeader(){
  $("#scenarioName").textContent=scenario.name;
  $("#gameClock").textContent=ht();
  $("#missionText").textContent=scenario.mission;
  $("#pauseBtn").textContent=state.running?"PAUSE":"RESUME";
  $("#statusDot").className="status-dot "+(state.running?"live":"paused");
  $$(".speed").forEach(b=>b.classList.toggle("active",Number(b.dataset.speed)===state.speed));
}
function renderReadiness(){
  const units=state.nodes.filter(n=>n.kind==="unit");
  $("#readinessPanel").innerHTML=units.map(n=>`
    <div class="metric">
      <div class="metric-line"><span>${n.id}</span><strong>${Math.round(n.readiness)}%</strong></div>
      <div class="bar ${readinessColor(n.readiness)}"><span style="width:${clamp(n.readiness,0,100)}%"></span></div>
    </div>`).join("");
}
function renderSupply(){
  const detailed=["Supply","Logistics","White Cell"].includes(state.role);
  $("#supplyPanel").innerHTML=scenario.cargoTypes.map(t=>{
    const pct=supplyPct(t),cls=pct<45?"bad":pct<70?"warn":"";
    const detail=detailed?` · ${supplyAggregate(t)} units`:"";
    return `<div class="metric"><div class="metric-line"><span>${t}</span><strong>${pct}%${detail}</strong></div><div class="bar ${cls}"><span style="width:${pct}%"></span></div></div>`;
  }).join("");
}
function renderMap(){
  const svg=$("#routeLayer");svg.innerHTML="";
  const mapRect={w:1000,h:560};
  const byId=Object.fromEntries(state.nodes.map(n=>[n.id,n]));
  state.routes.forEach(r=>{
    const a=byId[r.a],b=byId[r.b];
    const x1=a.x/100*mapRect.w,y1=a.y/100*mapRect.h,x2=b.x/100*mapRect.w,y2=b.y/100*mapRect.h;
    svg.insertAdjacentHTML("beforeend",`<line class="route-line ${r.degraded?"degraded":""}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>
      <text class="route-label" x="${(x1+x2)/2}" y="${(y1+y2)/2-7}">${r.id}</text>`);
  });
  $("#nodeLayer").innerHTML=state.nodes.map(n=>{
    let sub=n.kind==="unit"?`MC ${Math.round(n.readiness)}%`:state.role==="White Cell"||state.role==="Supply"?`${Object.values(n.inventory||{}).reduce((a,b)=>a+b,0)} stock units`:"LOG NODE";
    return `<div class="node ${n.kind==="unit"?"unit":""}" style="left:${n.x}%;top:${n.y}%"><div class="node-name">${n.id}</div><div class="node-type">${n.label}</div><div class="node-sub">${sub}</div></div>`;
  }).join("");
  const degraded=state.routes.filter(r=>r.degraded).length;
  $("#networkStatus").textContent=degraded?`${degraded} ROUTE${degraded>1?"S":""} DEGRADED`:state.commsDegraded?"COMMS DEGRADED":"NETWORK NOMINAL";
  $("#networkStatus").classList.toggle("bad",degraded>0||state.commsDegraded);
}
function renderRequests(){
  $("#requestCount").textContent=state.requests.length;
  $("#requestsPanel").innerHTML=state.requests.length?state.requests.map(r=>`
    <div class="request ${r.priority==="FLASH"?"flash":""}">
      <strong>${r.unit} · ${r.priority}</strong>
      <div class="req-text">${r.text}</div>
      <small>${r.qty} × ${r.cargo}</small>
    </div>`).join(""):`<div class="muted small">No active requests.</div>`;
}
function renderIntel(){
  const canSee=["Commander","Operations","Logistics","Intel / Information","White Cell"].includes(state.role);
  $("#intelPanel").innerHTML=canSee?state.intel.map(i=>`<div class="info-item">${i.text}<div class="confidence">CONFIDENCE ${i.confidence}%</div></div>`).join(""):`<div class="muted small">Role access limited. Coordinate with Information/Intel.</div>`;
}
function renderMovements(){
  $("#movementCount").textContent=`${state.movements.length} ACTIVE`;
  if(!state.movements.length){$("#movements").innerHTML=`<div class="muted small">No active movements.</div>`;return}
  $("#movements").innerHTML=`<table class="movement-table"><thead><tr><th>ASSET</th><th>ROUTE</th><th>MOVEMENT</th><th>CARGO</th><th>ETA</th></tr></thead><tbody>${
    state.movements.map(m=>`<tr><td>${m.asset}</td><td>${m.route}</td><td>${m.origin} → ${m.destination}</td><td>${m.qty} × ${m.cargo}</td><td class="eta">${ht(m.eta)}</td></tr>`).join("")
  }</tbody></table>`;
}
function renderJournal(){
  $("#journal").innerHTML=state.logs.map(l=>`<div class="log"><time>${ht(l.t)}</time><span class="actor">${l.actor}</span> · ${l.msg}</div>`).join("");
}
function routeOptions(){
  const o=$("#originSelect").value,d=$("#destinationSelect").value;
  const direct=state.routes.filter(r=>(r.a===o&&r.b===d)||(r.a===d&&r.b===o));
  $("#routeSelect").innerHTML=(direct.length?direct:state.routes).map(r=>`<option value="${r.id}">${r.id} · ${r.hours}h${r.degraded?" · DEGRADED":""}</option>`).join("");
}
function renderOrderControls(){
  const ready=state.assets.filter(a=>a.status==="READY");
  $("#assetSelect").innerHTML=ready.map(a=>`<option value="${a.id}">${a.id} · CAP ${a.capacity}</option>`).join("");
  $("#originSelect").innerHTML=state.nodes.filter(n=>n.kind==="log").map(n=>`<option>${n.id}</option>`).join("");
  $("#destinationSelect").innerHTML=state.nodes.filter(n=>n.kind==="unit").map(n=>`<option>${n.id}</option>`).join("");
  $("#cargoSelect").innerHTML=scenario.cargoTypes.map(c=>`<option>${c}</option>`).join("");
  routeOptions();
}
function render(){
  renderHeader();renderRoles();renderReadiness();renderSupply();renderMap();renderRequests();renderIntel();renderMovements();renderJournal();
}

function dispatchOrder(){
  const assetId=$("#assetSelect").value,origin=$("#originSelect").value,destination=$("#destinationSelect").value,cargo=$("#cargoSelect").value;
  const qty=Number($("#qtyInput").value),routeId=$("#routeSelect").value,note=$("#orderNote").value.trim();
  const asset=state.assets.find(a=>a.id===assetId),originNode=state.nodes.find(n=>n.id===origin),route=state.routes.find(r=>r.id===routeId);
  if(!asset||!originNode||!route) return feedback("Order incomplete.",true);
  if(qty<1||qty>asset.capacity) return feedback(`Quantity must be 1–${asset.capacity} for ${asset.id}.`,true);
  if((originNode.inventory?.[cargo]||0)<qty) return feedback(`${origin} does not hold ${qty} units of ${cargo}.`,true);
  const touches=(route.a===origin&&route.b===destination)||(route.b===origin&&route.a===destination);
  if(!touches) return feedback(`Selected route does not directly connect ${origin} and ${destination}.`,true);
  originNode.inventory[cargo]-=qty;asset.status="MOVING";
  const addedDelay=route.degraded?Math.ceil(route.hours*.6):0;
  const eta=state.minute+(route.hours+addedDelay)*60;
  state.movements.push({id:"MOV-"+state.nextId++,asset:asset.id,origin,destination,cargo,qty,route:route.id,eta,note});
  log(state.role,`ORDER: ${asset.id} dispatched ${origin} → ${destination} via ${route.id} with ${qty} × ${cargo}.${note?" "+note:""}`);
  flash(`MOVEMENT ORDER ACCEPTED · ${asset.id} · ${origin} → ${destination}`);
  feedback("Order accepted by simulation authority."); saveState(false); renderOrderControls(); render();
}

function resolveMovement(m){
  const asset=state.assets.find(a=>a.id===m.asset),dest=state.nodes.find(n=>n.id===m.destination),route=state.routes.find(r=>r.id===m.route);
  let risk=route.risk+(route.degraded?.18:0)+(state.weather==="SEVERE"?.12:0);
  const roll=Math.random();
  if(roll<risk*.35){
    log("SYSTEM",`${m.asset} experienced significant disruption on ${m.route}; delivery reduced.`,"warn");
    m.qty=Math.max(1,Math.ceil(m.qty*.5));
  }
  dest.stocks[m.cargo]=(dest.stocks[m.cargo]||0)+m.qty;
  if(m.cargo==="Class IX") dest.readiness=clamp(dest.readiness+m.qty*2,0,100);
  if(m.cargo==="Fuel") dest.readiness=clamp(dest.readiness+m.qty*.6,0,100);
  asset.status="READY";
  state.requests=state.requests.filter(r=>!(r.unit===m.destination&&r.cargo===m.cargo&&m.qty>=Math.min(2,r.qty)));
  log("SYSTEM",`${m.asset} arrived ${m.destination}; delivered ${m.qty} × ${m.cargo}.`);
}
function hourlyEffects(){
  state.nodes.filter(n=>n.kind==="unit").forEach(n=>{
    n.stocks.Fuel=Math.max(0,n.stocks.Fuel-.18);
    n.stocks["Food / Water"]=Math.max(0,n.stocks["Food / Water"]-.08);
    n.stocks.Ammunition=Math.max(0,n.stocks.Ammunition-.05);
    if(n.stocks.Fuel<3)n.readiness=clamp(n.readiness-.55,0,100);
    if((n.stocks["Class IX"]||0)<2)n.readiness=clamp(n.readiness-.18,0,100);
  });
  if(state.minute===18*60 && !state._autoWeather){
    state._autoWeather=true;state.weather="DEGRADED";log("WHITE CELL","Weather deteriorating across the operating area.");flash("WEATHER UPDATE · MOVEMENT RISK INCREASING");
  }
  if(state.minute===36*60 && !state._autoPriority){
    state._autoPriority=true;state.requests.unshift({id:"AUTO-36",unit:"VIPER",cargo:"Ammunition",qty:3,priority:"FLASH",text:"Higher headquarters changed support priority."});
    log("WHITE CELL","FLASH support priority issued for VIPER.");flash("FLASH TRAFFIC · VIPER PRIORITY CHANGED");
  }
}
function tick(){
  if(!state.running)return;
  const beforeHour=Math.floor(state.minute/60);
  state.minute=Math.min(scenario.durationMinutes,state.minute+state.speed);
  const afterHour=Math.floor(state.minute/60);
  if(afterHour>beforeHour) hourlyEffects();
  const due=state.movements.filter(m=>m.eta<=state.minute);
  due.forEach(resolveMovement);
  state.movements=state.movements.filter(m=>m.eta>state.minute);
  if(state.minute>=scenario.durationMinutes){state.running=false;log("SYSTEM","Scenario clock complete. Generate AAR.");flash("SCENARIO COMPLETE · H+72");showAar();}
  if(state.minute%5===0) saveState(false);
  render();
}

function inject(type){
  if(state.role!=="White Cell")return;
  if(type==="route"){
    const candidates=state.routes.filter(r=>!r.degraded);const r=candidates[Math.floor(Math.random()*candidates.length)]||state.routes[0];
    r.degraded=true;log("WHITE CELL",`Route ${r.id} degraded by scenario control.`);flash(`FLASH TRAFFIC · ROUTE ${r.id} DEGRADED`);
  }else if(type==="supply"){
    const node=state.nodes.filter(n=>n.kind==="log")[Math.floor(Math.random()*3)];
    node.inventory["Class IX"]=Math.max(0,node.inventory["Class IX"]-3);
    log("WHITE CELL",`Inventory discrepancy confirmed at ${node.id}; Class IX reduced by 3.`);flash(`SUPPLY DISCREPANCY · ${node.id}`);
  }else if(type==="maintenance"){
    const unit=state.nodes.filter(n=>n.kind==="unit")[Math.floor(Math.random()*3)];
    unit.readiness=clamp(unit.readiness-8,0,100);log("WHITE CELL",`Vehicle failure reduced ${unit.id} readiness by 8%.`);flash(`MAINTENANCE EVENT · ${unit.id}`);
  }else if(type==="comms"){
    state.commsDegraded=!state.commsDegraded;log("WHITE CELL",`Communications ${state.commsDegraded?"degraded":"restored"}.`);flash(`COMMS ${state.commsDegraded?"DEGRADED":"RESTORED"}`);
  }else if(type==="priority"){
    state.requests.unshift({id:"WC-"+state.nextId++,unit:"VIPER",cargo:"Fuel",qty:3,priority:"FLASH",text:"Higher headquarters issued a new immediate support priority."});
    log("WHITE CELL","New FLASH priority injected for VIPER.");flash("FLASH TRAFFIC · NEW SUPPORT PRIORITY");
  }else if(type==="weather"){
    state.weather=state.weather==="SEVERE"?"CLEAR":"SEVERE";log("WHITE CELL",`Weather state changed to ${state.weather}.`);flash(`WEATHER · ${state.weather}`);
  }
  saveState(false);render();
}

function showAar(){
  const units=state.nodes.filter(n=>n.kind==="unit");
  const avg=Math.round(units.reduce((s,n)=>s+n.readiness,0)/units.length);
  const totalStock=scenario.cargoTypes.reduce((s,c)=>s+supplyAggregate(c),0);
  const orders=state.logs.filter(l=>l.msg.startsWith("ORDER:")).length;
  const critical=units.filter(n=>n.readiness<60).length;
  $("#aarBody").innerHTML=`
    <div class="aar-grid">
      <div class="aar-stat"><small>MISSION CAPABILITY</small><strong>${avg}%</strong></div>
      <div class="aar-stat"><small>ORDERS ISSUED</small><strong>${orders}</strong></div>
      <div class="aar-stat"><small>ACTIVE REQUESTS</small><strong>${state.requests.length}</strong></div>
      <div class="aar-stat"><small>CRITICAL UNITS</small><strong>${critical}</strong></div>
      <div class="aar-stat"><small>REMAINING STOCK</small><strong>${Math.round(totalStock)}</strong></div>
      <div class="aar-stat"><small>NETWORK</small><strong>${state.routes.filter(r=>r.degraded).length} DEG</strong></div>
    </div>
    <div class="aar-list">
      <b>Supported-force end state</b><br>
      ${units.map(n=>`${n.id}: ${Math.round(n.readiness)}% mission capability · Fuel ${n.stocks.Fuel.toFixed(1)} · Class IX ${n.stocks["Class IX"].toFixed(1)}`).join("<br>")}
      <br><br><b>Decision record</b><br>
      ${state.logs.filter(l=>l.msg.startsWith("ORDER:")).slice(0,12).map(l=>`${ht(l.t)} — ${l.msg}`).join("<br>")||"No structured movement orders recorded."}
    </div>`;
  $("#aarDialog").showModal();
}

function wire(){
  $("#roleSelect").addEventListener("change",e=>{state.role=e.target.value;render();});
  $("#pauseBtn").addEventListener("click",()=>{state.running=!state.running;log("SYSTEM",state.running?"Simulation resumed.":"Simulation paused.");render();});
  $$(".speed").forEach(b=>b.addEventListener("click",()=>{state.speed=Number(b.dataset.speed);log("SYSTEM",`Time scale set to ${state.speed}X.`);render();}));
  $("#saveBtn").addEventListener("click",()=>saveState(true));
  $("#resetBtn").addEventListener("click",resetState);
  $("#submitOrder").addEventListener("click",dispatchOrder);
  $("#originSelect").addEventListener("change",routeOptions);$("#destinationSelect").addEventListener("change",routeOptions);
  $$("[data-inject]").forEach(b=>b.addEventListener("click",()=>inject(b.dataset.inject)));
  $("#aarBtn").addEventListener("click",showAar);$("#closeAar").addEventListener("click",()=>$("#aarDialog").close());
}

async function main(){
  try{
    await loadScenario();state=loadState();if(!state.logs.length)seedLog();
    wire();renderOrderControls();render();setInterval(tick,1000);
  }catch(err){
    document.body.innerHTML=`<div style="padding:30px;color:white;font-family:system-ui"><h1>CONLOG failed to initialize</h1><pre>${err.message}</pre></div>`;
  }
}
main();
