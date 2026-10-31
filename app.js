const STORAGE_KEY = "gatorBoardTasks";
const DRAFT_KEY = "gatorBoardDraft";

// function syncHomeEntry() {
//   if (document.body.dataset.page !== "home") return;
//   const showApp = window.location.hash === "#home" || window.location.hash === "#published";
//   document.querySelector("#welcome-screen").hidden = showApp;
//   document.querySelector("#home-app").hidden = !showApp;
//   document.querySelector("#home-nav").hidden = !showApp;
// }

async function syncHomeEntry() {
  if (document.body.dataset.page !== "home") return;

  try {
    const response = await fetch("/api/me");

    if (!response.ok) {
      window.location.href = "login.html";
      return;
    }

    const showApp = 
      window.location.hash === "#home" ||
      window.location.hash === "#published";
    document.querySelector("#welcome-screen").hidden = showApp;
    document.querySelector("#home-app").hidden = !showApp;
    document.querySelector("#home-nav").hidden = !showApp;
  } catch {
    window.location.href = "auth.html";
  }
}

const sampleTasks = [
  {id:"publix",title:"Pick up groceries from Publix",summary:"$8",category:"Errand",location:"Publix (13th St)",distance:"0.8 mi",time:"Today, Oct 16 at 5:00 PM",cardTime:"Today, 5:00 PM",description:"Pick up 1 gallon of whole milk, a dozen large eggs, and 2 bags of chips from Publix (13th St). Please make sure everything is fresh! Meet me at the main entrance of Hume Hall to drop off the groceries.",poster:"sophia_u",posted:"2 hours ago",image:"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85"},
  {id:"study-packet",title:"Micro Study Edge Packet",summary:"Macro Study Edge Packet",category:"Study",location:"Marston Library",distance:"0.5 mi",time:"Today, 3:00 PM",cardTime:"Today, 3:00 PM",description:"Pick up my printed study packet at Study Edge and bring it to Marston Library.",reward:"$6",icon:"▭"},
  {id:"starbucks",title:"Get a coffee from Starbucks",summary:"A Croissant from Starbucks",category:"Errand",location:"Starbucks",distance:"0.6 mi",time:"Today, 4:00 PM",cardTime:"Today, 4:00 PM",description:"Please bring a grande iced coffee and a croissant to Library West.",reward:"$7",image:"https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=800&q=85"},
  {id:"package",title:"Pick up a package",summary:"Gator Plushie",category:"Delivery",location:"Amazon Locker",distance:"1.2 mi",time:"Tomorrow, 12:00 PM",cardTime:"Tomorrow, 12:00 PM",description:"Pick up my package from the Amazon Locker and deliver it to Hume Hall.",reward:"$5",icon:"◇"}
];

const page = document.body.dataset.page;
const $ = (selector, scope = document) => scope.querySelector(selector);
const ic = name => `<i class="i i-${name}" aria-hidden="true"></i>`;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]);
}

function getSavedTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function getAllTasks() { return [...getSavedTasks(), ...sampleTasks]; }

function showToast(message) {
  const toast = $(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function imageMarkup(task, className = "task-image") {
  if (task.image) return `<img class="${className}" src="${escapeHtml(task.image)}" alt="">`;
  return `<span class="${className}" aria-hidden="true">${escapeHtml(task.icon || "◇")}</span>`;
}

function renderHome() {
  const taskList = $("#task-list");
  const search = $("#task-search");
  let selectedCategory = "All";
  let mineOnly = false;

  function update() {
    const query = search.value.trim().toLowerCase();
    const tasks = getAllTasks().filter(task => {
      const categoryMatches = selectedCategory === "All" || task.category === selectedCategory;
      const textMatches = [task.title,task.summary,task.category,task.location,task.description].join(" ").toLowerCase().includes(query);
      return categoryMatches && textMatches && (!mineOnly || task.createdByMe);
    });
    taskList.innerHTML = tasks.map(task => `<a class="task-card" href="task-detail.html?id=${encodeURIComponent(task.id)}">${imageMarkup(task)}<span class="task-card-content"><h3>${escapeHtml(task.title)}</h3><p class="task-meta"><strong>${escapeHtml(task.summary || task.reward || "$8")}</strong> · ${escapeHtml(task.category)}</p><p class="task-meta">⌖ &nbsp;${escapeHtml(task.location)}${task.distance ? ` (${escapeHtml(task.distance)})` : ""}</p><p class="task-meta">◷ &nbsp;${escapeHtml(task.cardTime || task.time)}</p></span></a>`).join("");
    $("#empty-state").hidden = tasks.length !== 0;
  }

  search.addEventListener("input", update);
  document.querySelectorAll(".category-button").forEach(button => button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;
    document.querySelectorAll(".category-button").forEach(item => item.classList.toggle("is-selected", item === button));
    update();
  }));
  $("#my-tasks").addEventListener("click", event => {
    mineOnly = !mineOnly;
    event.currentTarget.textContent = mineOnly ? "All Tasks ›" : "My Tasks ›";
    update();
  });
  update();
}

function detailMarkup(task, review = false, ownerView = false) {
  return `${imageMarkup(task,"hero-image")}<div class="detail-heading"><h2>${escapeHtml(task.title)}</h2><strong>${escapeHtml(task.reward || task.summary || "$8")}</strong></div><p class="detail-row"><span>⌖</span>${escapeHtml(task.location)}</p><p class="detail-row"><span>▣</span>${escapeHtml(task.time)}</p>${review ? "" : `<div class="poster-row"><span class="avatar">👤</span><span><p>Posted by ${escapeHtml(task.poster || "gator_user")}</p><small>${escapeHtml(task.posted || "Just now")}</small></span>${ownerView ? "" : `<button class="outline-button" type="button" data-action="message">Message</button>`}</div>`}<section class="detail-section"><h3>Description</h3><p>${escapeHtml(task.description)}</p></section><section class="detail-section"><h3>Location</h3><div class="detail-map" id="detail-map" role="region" aria-label="Map showing ${escapeHtml(task.location)}"></div></section>${review ? "" : ownerView ? `<a class="secondary-button return-home-button" href="index.html#home">Return Home</a>` : `<button class="primary-button offer-button" type="button" data-action="offer">Offer to Complete</button>`}`;
}

// Small real map for the review and detail pages; falls back to matching the location text against places.json for older tasks without coordinates.
async function showTaskMap(task) {
  const container = $("#detail-map");
  if (!container) return;
  let spot = Number.isFinite(task.lat) && Number.isFinite(task.lng) ? [task.lng,task.lat] : null;
  if (!spot) {
    const match = searchPlaces(await loadPlaces(),(task.location || "").replace(/\(.*?\)/g,"").trim(),{lat:CAMPUS_CENTER[1],lng:CAMPUS_CENTER[0]})[0];
    if (match) spot = [match.lng,match.lat];
  }
  const map = createCampusMap(container,{center:spot || CAMPUS_CENTER,zoom:spot ? 16 : 14,cooperativeGestures:true});
  if (!map || !spot) return;
  const element = document.createElement("div");
  element.className = "map-request";
  element.innerHTML = '<span class="map-pin" aria-hidden="true"></span>';
  new maplibregl.Marker({element,anchor:"top-left"}).setLngLat(spot).addTo(map);
}

function renderDetail() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "publix";
  const ownerView = params.get("owner") === "1";
  const task = getAllTasks().find(item => item.id === id) || sampleTasks[0];
  $("#task-detail").innerHTML = detailMarkup(task,false,ownerView);
  window.addEventListener("load",() => showTaskMap(task));
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => openChatForTask(task,button.dataset.action === "offer")));
}

function readForm(form) {
  const data = new FormData(form);
  return {id:`task-${Date.now()}`,title:data.get("title").trim(),summary:`$${data.get("reward")}`,reward:`$${data.get("reward")}`,category:data.get("category"),description:data.get("description").trim(),location:data.get("location").trim(),...(data.get("lat") && data.get("lng") ? {lat:Number(data.get("lat")),lng:Number(data.get("lng"))} : {}),time:data.get("time").trim(),cardTime:data.get("time").trim(),poster:"you",posted:"Just now",createdByMe:true,icon:data.get("category") === "Study" ? "▭" : "◇"};
}

function fillForm(form, draft) {
  if (!draft) return;
  ["title","description","location","time","reward","lat","lng"].forEach(name => { if (form.elements[name] && draft[name] != null) form.elements[name].value = name === "reward" ? String(draft.reward).replace("$","") : draft[name]; });
  const category = form.querySelector(`[name="category"][value="${CSS.escape(draft.category || "Errand")}"]`);
  if (category) category.checked = true;
}

// Offline place search for the Add Task form: places.json holds named spots extracted from the map file plus student nicknames.
let placesPromise;
const loadPlaces = () => placesPromise ||= fetch("places.json").then(response => response.ok ? response.json() : []).catch(() => []);
const distanceKm = (a, b) => Math.hypot((a.lat - b.lat) * 111,(a.lng - b.lng) * 96);

function searchPlaces(places, text, near) {
  const query = text.trim().toLowerCase();
  if (query.length < 2) return [];
  const tokens = query.split(/\s+/);
  const scored = [];
  places.forEach(place => {
    let score = 0;
    [place.n.toLowerCase(),...(place.a || [])].forEach(name => {
      const words = name.split(/[\s/&.-]+/);
      if (name === query) score = Math.max(score,5);
      else if (name.startsWith(query)) score = Math.max(score,4);
      else if (words.some(word => word.startsWith(query))) score = Math.max(score,3);
      else if (tokens.every(token => words.some(word => word.startsWith(token)))) score = Math.max(score,2);
      else if (name.includes(query)) score = Math.max(score,1);
    });
    if (score) scored.push({place,score,distance:distanceKm(place,near)});
  });
  return scored.sort((a,b) => b.score - a.score || a.distance - b.distance).slice(0,6).map(item => item.place);
}

function setupLocationPicker(form) {
  const input = form.elements.location, latInput = form.elements.lat, lngInput = form.elements.lng;
  const list = $("#location-suggestions"), status = $("#pin-status");
  const map = createCampusMap("location-map",{zoom:14});
  if (!map) return;
  const element = document.createElement("div");
  element.className = "map-request";
  element.innerHTML = '<span class="map-pin" aria-hidden="true"></span>';
  const pin = new maplibregl.Marker({element,anchor:"top-left",draggable:true});
  let places = [], autoFilled = false, shown = [];
  loadPlaces().then(data => { places = data; });
  const here = () => ({lng:+lngInput.value || CAMPUS_CENTER[0],lat:+latInput.value || CAMPUS_CENTER[1]});
  const setPin = ([lng, lat], fly) => {
    pin.setLngLat([lng,lat]).addTo(map);
    latInput.value = lat.toFixed(5);
    lngInput.value = lng.toFixed(5);
    status.textContent = "Pin set. Drag it or tap the map to adjust.";
    if (fly) map.easeTo({center:[lng,lat],zoom:Math.max(map.getZoom(),16)});
  };
  // When the pin is placed by hand, name the spot after the closest known place unless the user typed their own text.
  const nameFromPin = () => {
    if (input.value.trim() && !autoFilled) return;
    const spot = here();
    const closest = places.map(place => ({place,distance:distanceKm(place,spot)})).sort((a,b) => a.distance - b.distance)[0];
    input.value = closest && closest.distance < 0.15 ? `Near ${closest.place.n}` : "Dropped pin";
    autoFilled = true;
  };
  const hideList = () => { list.hidden = true; };
  const choose = place => {
    input.value = place.n;
    autoFilled = false;
    setPin([place.lng,place.lat],true);
    hideList();
  };
  const showMatches = () => {
    shown = searchPlaces(places,input.value,here());
    list.innerHTML = shown.map((place,index) => `<li role="option" data-index="${index}"><strong>${escapeHtml(place.n)}</strong><span>${escapeHtml(place.k.replace(/_/g," "))}</span></li>`).join("");
    list.hidden = !shown.length;
  };
  input.addEventListener("input",() => { autoFilled = false; showMatches(); });
  input.addEventListener("keydown",event => {
    if (event.key === "Enter" && !list.hidden && shown.length) { event.preventDefault(); choose(shown[0]); }
    if (event.key === "Escape") hideList();
  });
  list.addEventListener("mousedown",event => {
    const item = event.target.closest("li");
    if (item) { event.preventDefault(); choose(shown[+item.dataset.index]); }
  });
  document.addEventListener("click",event => { if (event.target !== input && !list.contains(event.target)) hideList(); });
  map.on("click",event => { setPin([event.lngLat.lng,event.lngLat.lat]); nameFromPin(); });
  pin.on("dragend",() => { const spot = pin.getLngLat(); setPin([spot.lng,spot.lat]); nameFromPin(); });
  $("#use-my-location").addEventListener("click",() => {
    if (!navigator.geolocation) { showToast("Location isn't available on this device"); return; }
    navigator.geolocation.getCurrentPosition(({coords}) => {
      const spot = [coords.longitude,coords.latitude];
      if (!inMapBounds(spot)) { showToast("You're outside the UF map area"); return; }
      setPin(spot,true);
      nameFromPin();
    },() => showToast("Couldn't get your location"),{enableHighAccuracy:true,timeout:10000});
  });
  if (latInput.value && lngInput.value) { setPin([+lngInput.value,+latInput.value]); map.setCenter([+lngInput.value,+latInput.value]); map.setZoom(16); }
}

function renderAdd() {
  const form = $("#task-form");
  let draft;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { draft = null; }
  fillForm(form,draft);
  // Wait for window load: the map code below the page dispatch lines must have run first.
  window.addEventListener("load",() => setupLocationPicker(form));
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!form.elements.lat.value) { showToast("Pick a spot on the map so people can find the task"); $("#location-map").scrollIntoView({block:"center",behavior:"smooth"}); return; }
    const task = readForm(form);
    const photo = form.elements.photo.files[0];
    const saveAndReview = () => { localStorage.setItem(DRAFT_KEY,JSON.stringify(task)); location.href="review-task.html"; };
    if (photo) { const reader = new FileReader(); reader.onload = () => { task.image=reader.result; saveAndReview(); }; reader.readAsDataURL(photo); }
    else saveAndReview();
  });
  $("#save-draft").addEventListener("click", () => { localStorage.setItem(DRAFT_KEY,JSON.stringify(readForm(form))); showToast("Draft saved on this device"); });
}

function renderReview() {
  let task;
  try { task = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { task = null; }
  if (!task) { location.replace("add-task.html"); return; }
  $("#review-detail").innerHTML = detailMarkup(task,true);
  window.addEventListener("load",() => showTaskMap(task));
  $("#publish-task").addEventListener("click", () => {
    const tasks = getSavedTasks();
    const publishedTask = {...task,id:`task-${Date.now()}`,createdByMe:true};
    tasks.unshift(publishedTask);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks));
    localStorage.removeItem(DRAFT_KEY);
    location.href=`task-posted.html?id=${encodeURIComponent(publishedTask.id)}`;
  });
}

function renderPosted() {
  const id = new URLSearchParams(location.search).get("id");
  const task = getSavedTasks().find(item => item.id === id) || getSavedTasks()[0];
  if (!task) { location.replace("index.html#home"); return; }
  $("#posted-task-card").innerHTML = `${imageMarkup(task)}<div class="posted-card-main"><h2>${escapeHtml(task.title)}</h2><p>${escapeHtml(task.location)}</p></div><strong>${escapeHtml(task.reward || task.summary || "$0")}</strong><div class="posted-card-status"><span>● &nbsp;Currently Open</span><time>${escapeHtml(task.time)}</time></div>`;
  $("#view-posted-task").href = `task-detail.html?id=${encodeURIComponent(task.id)}&owner=1`;
}

syncHomeEntry();
window.addEventListener("hashchange", syncHomeEntry);
document.querySelectorAll("[data-placeholder]").forEach(button => button.addEventListener("click", () => showToast(`${button.dataset.placeholder} is coming soon`)));

if (page === "home") { renderHome(); if (location.hash === "#published") showToast("Task published successfully!"); }
if (page === "detail") renderDetail();
if (page === "add") renderAdd();
if (page === "review") renderReview();
if (page === "posted") renderPosted();

const mapRequests = [
  {kind:"tasks",title:"Pick up textbooks",full:"Pick up textbooks",category:"Errand",lat:29.6466,lng:-82.3479},
  {kind:"tasks",title:"Pick up a package",full:"Pick up a package from the Amazon Locker",taskId:"package",category:"Delivery",lat:29.6443,lng:-82.3405},
  {kind:"tasks",title:"Micro Study Edge...",full:"Micro Study Edge Packet",taskId:"study-packet",category:"Study",lat:29.6484,lng:-82.3436},
  {kind:"tasks",title:"Get a coffee from..",full:"Get a coffee from Starbucks",taskId:"starbucks",category:"Food",lat:29.6511,lng:-82.3429},
  {kind:"rewards",title:"$2",full:"$2",category:"Errand",lat:29.6452,lng:-82.3460},
  {kind:"rewards",title:"Gator Plushie",full:"Gator Plushie",taskId:"package",category:"Delivery",lat:29.6502,lng:-82.3486},
  {kind:"rewards",title:"Macro Study Edge...",full:"Macro Study Edge Packet",taskId:"study-packet",category:"Study",lat:29.6484,lng:-82.3436},
  {kind:"rewards",title:"a croissant from star...",full:"A croissant from Starbucks",taskId:"starbucks",category:"Food",lat:29.6511,lng:-82.3429}
];

const MAP_BOUNDS = [[-82.40,29.61],[-82.28,29.69]];
const CAMPUS_CENTER = [-82.3440,29.6485];
const BUILDING_LABEL_KINDS = ["building","library","university","college","school","stadium","attraction","hospital","theatre","museum","arts_centre","townhall","conference_centre","food_court","sports_centre","fitness_centre"];
const MAJOR_LABEL_KINDS = ["university","college","hospital","stadium","library","attraction","museum"];
const inMapBounds = ([lng,lat]) => lng >= MAP_BOUNDS[0][0] && lng <= MAP_BOUNDS[1][0] && lat >= MAP_BOUNDS[0][1] && lat <= MAP_BOUNDS[1][1];

// Offline vector map of Gainesville (maps/gainesville.pmtiles) with zoom buttons; shared by the map page and the location picker.
function createCampusMap(container, {center = CAMPUS_CENTER, zoom = 14.5, cooperativeGestures = false} = {}) {
  if (!window.maplibregl || !window.pmtiles || !window.basemaps) { showToast("Map library failed to load"); return null; }
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles",protocol.tile);
  const pmtilesUrl = new URL("maps/gainesville.pmtiles",location.href).href;
  if (location.protocol === "file:") showToast("Open the site through a web server (or GitHub Pages) to see the map");
  // Download the 4 MB map file once instead of using HTTP range requests, so any static host or dev server works.
  let mapFile;
  const wholeFileSource = {
    getKey: () => pmtilesUrl,
    getBytes: async (offset, length) => {
      mapFile ||= fetch(pmtilesUrl).then(response => { if (!response.ok) throw new Error(`Map file ${response.status}`); return response.arrayBuffer(); });
      return {data:(await mapFile).slice(offset,offset + length)};
    }
  };
  protocol.add(new pmtiles.PMTiles(wholeFileSource));
  // The built-in symbol layers need sprite files, so drop them and add text-only label layers (fonts live in fonts/).
  // Labels thin out as you zoom out: every building name up close, only major places mid-range, then town areas far out.
  const layers = basemaps.layers("protomaps",basemaps.namedFlavor("light")).filter(layer => layer.type !== "symbol");
  const labelLayout = size => ({"text-field":["get","name"],"text-font":["Noto Sans Medium"],"text-size":size,"text-max-width":7,"text-padding":4});
  const labelPaint = {"text-color":"#24452e","text-halo-color":"#fffdf9","text-halo-width":1.6};
  const areaPaint = {"text-color":"#5f6d63","text-halo-color":"#f4efe6","text-halo-width":1.6};
  layers.push(
    {id:"building-labels",type:"symbol",source:"protomaps","source-layer":"pois",minzoom:15.5,filter:["in",["get","kind"],["literal",BUILDING_LABEL_KINDS]],layout:labelLayout(12),paint:labelPaint},
    {id:"major-labels",type:"symbol",source:"protomaps","source-layer":"pois",minzoom:14,maxzoom:15.5,filter:["in",["get","kind"],["literal",MAJOR_LABEL_KINDS]],layout:labelLayout(12),paint:labelPaint},
    {id:"area-labels",type:"symbol",source:"protomaps","source-layer":"places",minzoom:12,maxzoom:15,filter:["all",["in",["get","kind"],["literal",["neighbourhood","locality"]]],["!=",["get","kind_detail"],"city"]],layout:{...labelLayout(11),"text-transform":"uppercase","text-letter-spacing":0.08},paint:areaPaint},
    {id:"city-label",type:"symbol",source:"protomaps","source-layer":"places",minzoom:11,maxzoom:15,filter:["==",["get","kind_detail"],"city"],layout:{...labelLayout(17),"text-transform":"uppercase","text-letter-spacing":0.12},paint:areaPaint}
  );
  const map = new maplibregl.Map({
    container,center,zoom,cooperativeGestures,minZoom:11,maxZoom:18,
    maxBounds:MAP_BOUNDS,attributionControl:{compact:true},
    style:{version:8,glyphs:`${new URL("fonts/",location.href).href}{fontstack}/{range}.pbf`,sources:{protomaps:{type:"vector",url:`pmtiles://${pmtilesUrl}`,attribution:'<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'}},layers}
  });
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-left");
  map.once("error", () => showToast("Couldn't load the map file"));
  return map;
}

function renderMap() {
  const map = createCampusMap("campus-map");
  if (!map) return;
  const campus = CAMPUS_CENTER;
  const you = document.createElement("div");
  you.className = "map-you";
  const youMarker = new maplibregl.Marker({element:you}).setLngLat(campus).addTo(map);
  const shared = new URLSearchParams(location.search), sharedSpot = shared.has("lat") && shared.has("lng") && inMapBounds([+shared.get("lng"),+shared.get("lat")]) ? [+shared.get("lng"),+shared.get("lat")] : null;
  if (sharedSpot) {
    map.jumpTo({center:sharedSpot,zoom:16.5});
    const sharedPin = document.createElement("div");
    sharedPin.className = "map-request is-open";
    sharedPin.innerHTML = '<span class="map-label"><span class="map-full" style="display:inline">Shared location</span></span><span class="map-pin" aria-hidden="true"></span>';
    new maplibregl.Marker({element:sharedPin,anchor:"top-left"}).setLngLat(sharedSpot).addTo(map);
  }
  // Blue dot follows the device location (needs https or localhost); stays on campus if denied or outside the map area.
  if (navigator.geolocation) {
    let centered = false;
    navigator.geolocation.watchPosition(({coords}) => {
      const here = [coords.longitude,coords.latitude];
      
      if (!inMapBounds(here)) { if (!centered) showToast("You're outside the UF map area"); centered = true; return; }
      youMarker.setLngLat(here);
      if (!centered) { if (!sharedSpot) map.easeTo({center:here}); centered = true; }
    },() => showToast("Location unavailable, showing campus"),{enableHighAccuracy:true,maximumAge:10000});
  }
  const savedRequests = getSavedTasks().filter(task => Number.isFinite(task.lat) && Number.isFinite(task.lng)).map(task => ({kind:"tasks",title:task.title.length > 22 ? `${task.title.slice(0,21)}…` : task.title,full:task.title,taskId:task.id,category:task.category,lat:task.lat,lng:task.lng}));
  const allRequests = mapRequests.concat(savedRequests);
  let markers = [];
  const state = {kind:"tasks",category:"all",query:"",always:false};
  const draw = () => {
    markers.forEach(marker => marker.remove());
    const query = state.query.trim().toLowerCase();
    markers = allRequests.filter(r => r.kind === state.kind && (state.category === "all" || r.category === state.category) && r.title.toLowerCase().includes(query)).map(r => {
      const element = document.createElement("div");
      element.className = "map-request";
      element.tabIndex = 0;
      element.setAttribute("role","button");
      element.setAttribute("aria-label",r.full);
      element.innerHTML = `<span class="map-label"><span class="map-short">${escapeHtml(r.title)}</span><span class="map-full">${escapeHtml(r.full)}</span></span><span class="map-pin" aria-hidden="true"></span>`;
      // First click expands the label, a second click opens the task page.
      const activate = event => {
        event.stopPropagation();
        if (!element.classList.contains("is-open")) { closeOpenPin(); element.classList.add("is-open"); return; }
        if (r.taskId) location.href = `task-detail.html?id=${encodeURIComponent(r.taskId)}`;
        else showToast("Task page coming soon");
      };
      element.addEventListener("click",activate);
      element.addEventListener("keydown",event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(event); } });
      return new maplibregl.Marker({element,anchor:"top-left"}).setLngLat([r.lng,r.lat]).addTo(map);
    });
  };
  const closeOpenPin = () => document.querySelectorAll(".map-request.is-open").forEach(open => open.classList.remove("is-open"));
  map.on("click",closeOpenPin);
  // Settings button (bottom-left) opens a small menu; "Always show labels" keeps bubbles visible when zoomed far out.
  const gearIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  const syncBubbles = () => $("#campus-map").classList.toggle("hide-bubbles",!state.always && map.getZoom() < 14);
  const settingsControl = {
    onAdd() {
      const container = this.container = document.createElement("div");
      container.className = "maplibregl-ctrl map-settings";
      container.innerHTML = `<div class="map-settings-menu" id="map-settings-menu" role="dialog" aria-label="Map settings" hidden><h2>Map settings</h2><label class="map-switch"><span>Always show labels</span><input type="checkbox" id="setting-labels"><span class="map-switch-track" aria-hidden="true"></span></label></div><button type="button" class="map-settings-button" aria-label="Map settings" aria-haspopup="dialog" aria-expanded="false" aria-controls="map-settings-menu">${gearIcon}</button>`;
      const button = container.querySelector(".map-settings-button"), menu = container.querySelector(".map-settings-menu");
      const setOpen = open => { menu.hidden = !open; button.setAttribute("aria-expanded",open); };
      button.addEventListener("click",() => setOpen(menu.hidden));
      container.querySelector("#setting-labels").addEventListener("change",event => { state.always = event.target.checked; syncBubbles(); });
      this.outside = event => { if (!container.contains(event.target)) setOpen(false); };
      this.escape = event => { if (event.key === "Escape") setOpen(false); };
      document.addEventListener("click",this.outside);
      document.addEventListener("keydown",this.escape);
      return container;
    },
    onRemove() { document.removeEventListener("click",this.outside); document.removeEventListener("keydown",this.escape); this.container.remove(); }
  };
  map.addControl(settingsControl,"bottom-left");
  map.on("zoom",syncBubbles);
  syncBubbles();
  const bind = (selector, key, attr) => document.querySelectorAll(selector).forEach(button => button.addEventListener("click", () => {
    state[key] = button.dataset[attr];
    document.querySelectorAll(selector).forEach(other => { const on = other === button; other.classList.toggle("is-selected",on); other.setAttribute("aria-pressed",on); });
    draw();
  }));
  bind(".map-kind-button","kind","kind");
  bind(".map-chip","category","category");
  $("#task-search").addEventListener("input", event => { state.query = event.target.value; draw(); });
  // Arrow hint at the end of the chip row: shown only while there is more to scroll to, fades once the user scrolls.
  const chips = $(".map-filters"), more = $(".map-more");
  const syncMore = () => {
    more.hidden = chips.scrollWidth <= chips.clientWidth + 2;
    more.classList.toggle("is-faded",chips.scrollLeft > 8);
  };
  chips.addEventListener("scroll",syncMore,{passive:true});
  window.addEventListener("resize",syncMore);
  more.addEventListener("click",() => chips.scrollBy({left:chips.clientWidth * 0.6,behavior:"smooth"}));
  syncMore();
  draw();
}
if (page === "map") renderMap();

// ---- Chats (stored on this device until profiles and a database exist) ----
const CHAT_KEY = "gatorBoardChats";
const CHAT_LOCK_MS = 7 * 24 * 60 * 60 * 1000; // a chat locks after 7 days without messages, or once the task is completed

function seedChats() {
  const now = Date.now(), minutes = n => now - n * 60000, day = 86400000;
  const chat = (id, taskId, taskTitle, name, unread, messages, completed = false) => ({id,taskId,taskTitle,name,unread,completed,messages});
  return [
    chat("chat-sophia","publix","Pick up groceries at Publix","Sophia M.",2,[{from:"me",text:"I can pick those up for you!",at:minutes(60)},{from:"them",text:"Thanks! See you at Hume Hall.",at:minutes(3)}]),
    chat("chat-ethan","study-packet","Micro Study Edge Packet","Ethan R.",1,[{from:"me",text:"Offer sent for your study packet.",at:minutes(120)},{from:"them",text:"Is Marston at 3 still good for you?",at:minutes(29)}]),
    chat("chat-maya","starbucks","Get a coffee from Starbucks","Maya P.",0,[{from:"them",text:"Could you grab a coffee for me?",at:now - day - 3600000},{from:"me",text:"I can grab that on my way!",at:now - day + 60000}]),
    chat("chat-jordan","","Pick up textbooks","Jordan L.",0,[{from:"them",text:"Can you grab my textbooks?",at:now - 3 * day - 3600000},{from:"me",text:"Perfect, see you there.",at:now - 3 * day}]),
    chat("chat-alex","package","Pick up a package","Alex T.",0,[{from:"me",text:"Package picked up!",at:now - day - 7200000},{from:"them",text:"Thank you so much for the help!",at:now - day}],true)
  ];
}

function getChats() {
  try { const saved = JSON.parse(localStorage.getItem(CHAT_KEY)); if (Array.isArray(saved)) return saved; } catch {}
  const seeded = seedChats();
  saveChats(seeded);
  return seeded;
}
function saveChats(chats) { localStorage.setItem(CHAT_KEY,JSON.stringify(chats)); }
const lastMessage = chat => chat.messages[chat.messages.length - 1];
function lockReason(chat) {
  if (chat.completed) return "This task was completed, so the chat is locked.";
  const last = lastMessage(chat);
  if (last && Date.now() - last.at > CHAT_LOCK_MS) return "This chat was locked after 7 days without messages.";
  return "";
}
const isLocked = chat => Boolean(lockReason(chat));
const initials = name => name.split(/\s+/).map(part => part[0]).join("").slice(0,2).toUpperCase();

function chatTime(at) {
  const date = new Date(at), today = new Date();
  const days = Math.round((new Date(today.getFullYear(),today.getMonth(),today.getDate()) - new Date(date.getFullYear(),date.getMonth(),date.getDate())) / 86400000);
  if (days <= 0) return date.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([],{weekday:"short"});
  return date.toLocaleDateString([],{month:"short",day:"numeric"});
}

// "Offer to Complete" / "Message" on a task: reuse the chat for that task or start one with its poster.
function openChatForTask(task, offer) {
  const chats = getChats();
  let chat = chats.find(item => item.taskId === task.id);
  if (!chat) {
    chat = {id:`chat-${Date.now()}`,taskId:task.id,taskTitle:task.title,name:task.poster || "Task poster",unread:0,completed:false,messages:[]};
    chats.unshift(chat);
  }
  if (offer && !isLocked(chat) && !chat.messages.some(message => message.offer)) chat.messages.push({from:"me",text:`Hi! I'd like to complete "${task.title}".`,at:Date.now(),offer:true});
  saveChats(chats);
  location.href = `chat.html?id=${encodeURIComponent(chat.id)}`;
}

function renderChat() {
  const id = new URLSearchParams(location.search).get("id");
  if (id) renderThread(id); else renderChatList();
}

function renderChatList() {
  $("#chat-list-view").hidden = false;
  const list = $("#chat-list"), search = $("#chat-search");
  let editing = false;
  const draw = () => {
    const query = search.value.trim().toLowerCase();
    const all = getChats();
    const chats = all.filter(chat => `${chat.name} ${chat.taskTitle} ${lastMessage(chat) ? messagePreview(lastMessage(chat)) : ""}`.toLowerCase().includes(query))
      .sort((a,b) => (lastMessage(b) ? lastMessage(b).at : 0) - (lastMessage(a) ? lastMessage(a).at : 0));
    const unread = all.reduce((sum,chat) => sum + (isLocked(chat) ? 0 : chat.unread),0);
    $("#chat-unread").textContent = unread ? `${unread} unread` : "";
    $("#chat-empty").hidden = chats.length > 0;
    list.innerHTML = chats.map(chat => {
      const last = lastMessage(chat), locked = isLocked(chat), unreadBadge = chat.unread && !locked;
      const preview = last ? `${last.from === "me" ? "You: " : ""}${messagePreview(last)}` : "No messages yet";
      return `<div class="chat-row"><a class="chat-card${locked ? " is-locked" : ""}" href="chat.html?id=${encodeURIComponent(chat.id)}"><span class="chat-avatar">${escapeHtml(initials(chat.name))}</span><span class="chat-main"><span class="chat-top"><strong>${escapeHtml(chat.name)}</strong><time>${last ? chatTime(last.at) : ""}</time></span><span class="chat-task">${escapeHtml(chat.taskTitle)}</span><span class="chat-preview${unreadBadge ? " is-unread" : ""}"><span>${escapeHtml(preview)}</span>${unreadBadge ? `<b class="chat-badge">${chat.unread}</b>` : ""}</span></span>${locked ? `<span class="chat-lock">${ic("lock")}Locked</span>` : ""}</a>${editing ? `<button type="button" class="chat-delete" data-id="${escapeHtml(chat.id)}" aria-label="Delete chat with ${escapeHtml(chat.name)}">${ic("x")}</button>` : ""}</div>`;
    }).join("");
  };
  setupNewChat();
  search.addEventListener("input",draw);
  $("#chat-edit").addEventListener("click",event => { editing = !editing; event.currentTarget.textContent = editing ? "Done" : "Edit"; draw(); });
  list.addEventListener("click",event => {
    const button = event.target.closest(".chat-delete");
    if (!button) return;
    saveChats(getChats().filter(chat => chat.id !== button.dataset.id));
    draw();
  });
  draw();
}

const messagePreview = message => message.type === "image" ? "Photo" : message.type === "location" ? "Shared location" : message.text;

function messageMarkup(message) {
  const mine = message.from === "me";
  let body = `<p>${escapeHtml(message.text)}</p>`;
  if (message.type === "image") body = `<img class="chat-photo" src="${escapeHtml(message.src)}" alt="Shared photo">`;
  if (message.type === "location") body = `<a class="chat-location" href="map.html?lat=${Number(message.lat)}&lng=${Number(message.lng)}"><span aria-hidden="true">${ic("pin")}</span><span><strong>Shared location</strong><small>${escapeHtml(message.label || "Open on map")}</small></span></a>`;
  return `<div class="chat-bubble ${mine ? "is-mine" : "is-theirs"}${message.type ? " has-media" : ""}">${body}<time>${chatTime(message.at)}</time></div>`;
}

// Shrink a picked photo before saving it so it fits in the browser's storage.
function shrinkImage(file, max = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1,max / Math.max(image.width,image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",0.8));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openSheet(sheet) {
  sheet.hidden = false;
  const close = () => { sheet.hidden = true; sheet.removeEventListener("click",onClick); };
  const onClick = event => { if (event.target === sheet || event.target.closest("[data-close]")) close(); };
  sheet.addEventListener("click",onClick);
}

function renderThread(id) {
  const chats = getChats(), chat = chats.find(item => item.id === id);
  if (!chat) { location.replace("chat.html"); return; }
  $("#chat-thread-view").hidden = false;
  if (chat.unread) { chat.unread = 0; saveChats(chats); }
  markNotificationsRead(`chat-${chat.id}-`);
  const log = $("#chat-log"), form = $("#chat-form"), input = form.elements.message, notice = $("#chat-lock-note");
  const lockedControls = form.querySelectorAll("button, #photo-input");
  $("#thread-name").textContent = chat.name;
  $("#thread-task").textContent = chat.taskTitle;
  const draw = () => {
    const locked = isLocked(chat);
    log.innerHTML = chat.messages.map(messageMarkup).join("") || '<p class="chat-empty-thread">Say hello to start the conversation.</p>';
    notice.hidden = !locked;
    notice.textContent = lockReason(chat);
    input.disabled = locked;
    lockedControls.forEach(control => { control.disabled = locked; });
    input.placeholder = locked ? "Chat locked" : "Write a message…";
    $("#complete-task").hidden = locked;
    log.lastElementChild && log.lastElementChild.scrollIntoView({block:"end"});
  };
  const send = message => {
    if (isLocked(chat)) return;
    chat.messages.push({from:"me",at:Date.now(),...message});
    try { saveChats(chats); }
    catch { chat.messages.pop(); showToast("Couldn't save that, device storage is full"); return; }
    draw();
  };
  form.addEventListener("submit",event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    send({text});
  });
  $("#photo-input").addEventListener("change",async event => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try { send({type:"image",src:await shrinkImage(file)}); } catch { showToast("Couldn't read that picture"); }
  });
  $("#attach-photo").addEventListener("click",() => $("#photo-input").click());
  $("#share-location").addEventListener("click",() => {
    if (!navigator.geolocation) { showToast("Location isn't available on this device"); return; }
    showToast("Finding your location…");
    navigator.geolocation.getCurrentPosition(async ({coords}) => {
      const spot = {lat:coords.latitude,lng:coords.longitude};
      const closest = (await loadPlaces()).map(place => ({place,distance:distanceKm(place,spot)})).sort((a,b) => a.distance - b.distance)[0];
      send({type:"location",lat:+spot.lat.toFixed(5),lng:+spot.lng.toFixed(5),label:closest && closest.distance < 0.25 ? `Near ${closest.place.n}` : "Current location"});
    },() => showToast("Couldn't get your location"),{enableHighAccuracy:true,timeout:10000});
  });
  $("#complete-task").addEventListener("click",() => {
    chat.completed = true;
    saveChats(chats);
    showToast("Task marked complete. Chat locked.");
    draw();
  });
  $("#show-request").addEventListener("click",() => {
    const task = getAllTasks().find(item => item.id === chat.taskId);
    $("#request-details").innerHTML = task
      ? `<h2>${escapeHtml(task.title)}</h2><p class="sheet-reward">${escapeHtml(task.reward || task.summary || "")}</p><p><span>${ic("pin")}</span>${escapeHtml(task.location || "")}</p><p><span>${ic("clock")}</span>${escapeHtml(task.time || "")}</p><p class="sheet-description">${escapeHtml(task.description || "")}</p><a class="primary-button sheet-link" href="task-detail.html?id=${encodeURIComponent(task.id)}">View full request</a>`
      : `<h2>${escapeHtml(chat.taskTitle)}</h2><p class="sheet-description">The details for this request are no longer available.</p>`;
    openSheet($("#request-sheet"));
  });
  draw();
}

// "New chat": pick someone else's open request and start a conversation with its poster.
function setupNewChat() {
  $("#new-chat").addEventListener("click",() => {
    const requests = getAllTasks().filter(task => !task.createdByMe);
    $("#new-chat-list").innerHTML = requests.map(task => `<button type="button" class="sheet-row" data-id="${escapeHtml(task.id)}"><span class="chat-avatar">${escapeHtml(initials(task.poster || "Task poster"))}</span><span class="sheet-row-main"><strong>${escapeHtml(task.poster || "Task poster")}</strong><small>${escapeHtml(task.title)}</small></span><b>${escapeHtml(task.reward || task.summary || "")}</b></button>`).join("") || '<p class="empty-state">No open requests right now.</p>';
    openSheet($("#new-chat-sheet"));
  });
  $("#new-chat-list").addEventListener("click",event => {
    const row = event.target.closest(".sheet-row");
    const task = row && getAllTasks().find(item => item.id === row.dataset.id);
    if (task) openChatForTask(task,false);
  });
}

if (page === "chat") renderChat();

// ---- Notifications (stored on this device until there is a backend feed) ----
const NOTIFICATION_KEY = "gatorBoardNotifications";
const SEEN_TASKS_KEY = "gatorBoardSeenTasks";
const NEARBY_KM = 3;

function getNotifications() {
  try { const saved = JSON.parse(localStorage.getItem(NOTIFICATION_KEY)); if (Array.isArray(saved)) return saved; } catch {}
  return [];
}
function saveNotifications(items) { localStorage.setItem(NOTIFICATION_KEY,JSON.stringify(items.sort((a,b) => b.at - a.at).slice(0,50))); }

function addNotification(item) {
  const items = getNotifications();
  if (items.some(existing => existing.id === item.id)) return false;
  items.push({read:false,at:Date.now(),...item});
  saveNotifications(items);
  return true;
}

function markNotificationsRead(idPrefix) {
  const items = getNotifications();
  let changed = false;
  items.forEach(item => { if (!item.read && item.id.startsWith(idPrefix)) { item.read = true; changed = true; } });
  if (changed) saveNotifications(items);
  return changed;
}

// Turn unread chat messages and newly posted nearby tasks from other people into notifications.
function syncNotifications() {
  getChats().forEach(chat => {
    const last = lastMessage(chat);
    if (!chat.unread || isLocked(chat) || !last || last.from === "me") return;
    addNotification({id:`chat-${chat.id}-${last.at}`,type:"chat",title:chat.name,body:`${messagePreview(last)} · ${chat.taskTitle}`,href:`chat.html?id=${encodeURIComponent(chat.id)}`,at:last.at});
  });
  const tasks = getAllTasks();
  let seen;
  try { seen = JSON.parse(localStorage.getItem(SEEN_TASKS_KEY)); } catch { seen = null; }
  if (!Array.isArray(seen)) { localStorage.setItem(SEEN_TASKS_KEY,JSON.stringify(tasks.map(task => task.id))); return; } // first run: don't flood with existing tasks
  const fresh = tasks.filter(task => !seen.includes(task.id));
  fresh.forEach(task => {
    const hasSpot = Number.isFinite(task.lat) && Number.isFinite(task.lng);
    const nearby = !hasSpot || distanceKm({lat:task.lat,lng:task.lng},{lat:CAMPUS_CENTER[1],lng:CAMPUS_CENTER[0]}) <= NEARBY_KM;
    if (nearby && !task.createdByMe) addNotification({id:`task-${task.id}`,type:"task",title:"New task nearby",body:`${task.title} · ${task.reward || task.summary || ""}${task.location ? ` · ${task.location}` : ""}`,href:`task-detail.html?id=${encodeURIComponent(task.id)}`});
  });
  if (fresh.length) localStorage.setItem(SEEN_TASKS_KEY,JSON.stringify(tasks.map(task => task.id)));
}

function timeAgo(at) {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`;
  return chatTime(at);
}

function setupNotifications() {
  const bells = document.querySelectorAll(".notification");
  if (!bells.length) return;
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.id = "notification-sheet";
  sheet.setAttribute("role","dialog");
  sheet.setAttribute("aria-label","Notifications");
  sheet.hidden = true;
  sheet.innerHTML = `<div class="sheet-card"><button type="button" class="sheet-close" data-close aria-label="Close">${ic("x")}</button><h2>Notifications</h2><button type="button" class="notice-readall" id="notice-readall">Mark all as read</button><div id="notice-list"></div></div>`;
  document.body.appendChild(sheet);
  const list = sheet.querySelector("#notice-list");
  const draw = () => {
    const items = getNotifications();
    const unread = items.filter(item => !item.read).length;
    bells.forEach(bell => { bell.classList.toggle("has-unread",unread > 0); bell.setAttribute("aria-label",unread ? `Notifications, ${unread} unread` : "Notifications"); });
    sheet.querySelector("#notice-readall").hidden = !unread;
    list.innerHTML = items.map(item => `<button type="button" class="notice${item.read ? "" : " is-unread"}" data-id="${escapeHtml(item.id)}"><span class="notice-icon">${ic(item.type === "chat" ? "chat" : "pin")}</span><span class="notice-main"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.body)}</small></span><time>${timeAgo(item.at)}</time></button>`).join("") || '<p class="empty-state">You\'re all caught up.</p>';
  };
  bells.forEach(bell => bell.addEventListener("click",() => { syncNotifications(); draw(); openSheet(sheet); }));
  list.addEventListener("click",event => {
    const row = event.target.closest(".notice");
    if (!row) return;
    const item = getNotifications().find(entry => entry.id === row.dataset.id);
    markNotificationsRead(row.dataset.id);
    if (item && item.href) location.href = item.href; else draw();
  });
  sheet.querySelector("#notice-readall").addEventListener("click",() => { markNotificationsRead(""); draw(); });
  const refresh = () => { syncNotifications(); draw(); };
  window.addEventListener("storage",refresh);
  setInterval(refresh,15000);
  refresh();
}
syncNotifications();
setupNotifications();
