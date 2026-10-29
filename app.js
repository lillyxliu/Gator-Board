const STORAGE_KEY = "gatorBoardTasks";
const DRAFT_KEY = "gatorBoardDraft";

function syncHomeEntry() {
  if (document.body.dataset.page !== "home") return;
  const showApp = window.location.hash === "#home" || window.location.hash === "#published";
  document.querySelector("#welcome-screen").hidden = showApp;
  document.querySelector("#home-app").hidden = !showApp;
  document.querySelector("#home-nav").hidden = !showApp;
}

const sampleTasks = [
  {id:"publix",title:"Pick up groceries from Publix",summary:"$8",category:"Errand",location:"Publix (13th St)",distance:"0.8 mi",time:"Today, Oct 16 at 5:00 PM",cardTime:"Today, 5:00 PM",description:"Pick up 1 gallon of whole milk, a dozen large eggs, and 2 bags of chips from Publix (13th St). Please make sure everything is fresh! Meet me at the main entrance of Hume Hall to drop off the groceries.",poster:"sophia_u",posted:"2 hours ago",image:"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85"},
  {id:"study-packet",title:"Micro Study Edge Packet",summary:"Macro Study Edge Packet",category:"Study",location:"Marston Library",distance:"0.5 mi",time:"Today, 3:00 PM",cardTime:"Today, 3:00 PM",description:"Pick up my printed study packet at Study Edge and bring it to Marston Library.",reward:"$6",icon:"▭"},
  {id:"starbucks",title:"Get a coffee from Starbucks",summary:"A Croissant from Starbucks",category:"Errand",location:"Starbucks",distance:"0.6 mi",time:"Today, 4:00 PM",cardTime:"Today, 4:00 PM",description:"Please bring a grande iced coffee and a croissant to Library West.",reward:"$7",image:"https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=800&q=85"},
  {id:"package",title:"Pick up a package",summary:"Gator Plushie",category:"Delivery",location:"Amazon Locker",distance:"1.2 mi",time:"Tomorrow, 12:00 PM",cardTime:"Tomorrow, 12:00 PM",description:"Pick up my package from the Amazon Locker and deliver it to Hume Hall.",reward:"$5",icon:"◇"}
];

const page = document.body.dataset.page;
const $ = (selector, scope = document) => scope.querySelector(selector);

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
  return `${imageMarkup(task,"hero-image")}<div class="detail-heading"><h2>${escapeHtml(task.title)}</h2><strong>${escapeHtml(task.reward || task.summary || "$8")}</strong></div><p class="detail-row"><span>⌖</span>${escapeHtml(task.location)}</p><p class="detail-row"><span>▣</span>${escapeHtml(task.time)}</p>${review ? "" : `<div class="poster-row"><span class="avatar">👤</span><span><p>Posted by ${escapeHtml(task.poster || "gator_user")}</p><small>${escapeHtml(task.posted || "Just now")}</small></span>${ownerView ? "" : `<button class="outline-button" type="button" data-action="message">Message</button>`}</div>`}<section class="detail-section"><h3>Description</h3><p>${escapeHtml(task.description)}</p></section><section class="detail-section"><h3>Location</h3><div class="map-placeholder" role="img" aria-label="Map showing ${escapeHtml(task.location)}"></div></section>${review ? "" : ownerView ? `<a class="secondary-button return-home-button" href="index.html#home">Return Home</a>` : `<button class="primary-button offer-button" type="button" data-action="offer">Offer to Complete</button>`}`;
}

function renderDetail() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "publix";
  const ownerView = params.get("owner") === "1";
  const task = getAllTasks().find(item => item.id === id) || sampleTasks[0];
  $("#task-detail").innerHTML = detailMarkup(task,false,ownerView);
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => showToast(button.dataset.action === "message" ? `Opening chat with ${task.poster || "poster"}…` : "Offer sent to the task poster!")));
}

function readForm(form) {
  const data = new FormData(form);
  return {id:`task-${Date.now()}`,title:data.get("title").trim(),summary:`$${data.get("reward")}`,reward:`$${data.get("reward")}`,category:data.get("category"),description:data.get("description").trim(),location:data.get("location").trim(),time:data.get("time").trim(),cardTime:data.get("time").trim(),poster:"you",posted:"Just now",createdByMe:true,icon:data.get("category") === "Study" ? "▭" : "◇"};
}

function fillForm(form, draft) {
  if (!draft) return;
  ["title","description","location","time","reward"].forEach(name => { if (form.elements[name] && draft[name] != null) form.elements[name].value = name === "reward" ? String(draft.reward).replace("$","") : draft[name]; });
  const category = form.querySelector(`[name="category"][value="${CSS.escape(draft.category || "Errand")}"]`);
  if (category) category.checked = true;
}

function renderAdd() {
  const form = $("#task-form");
  let draft;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { draft = null; }
  fillForm(form,draft);
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
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

function renderMap() {
  if (!window.maplibregl || !window.pmtiles || !window.basemaps) { showToast("Map library failed to load"); return; }
  const campus = [-82.3440,29.6485];
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
  // symbol layers need glyph/sprite files, so keep only the offline-safe shape layers; request pins carry the labels.
  const layers = basemaps.layers("protomaps",basemaps.namedFlavor("light")).filter(layer => layer.type !== "symbol");
  const map = new maplibregl.Map({
    container:"campus-map",center:campus,zoom:14.5,minZoom:11,maxZoom:18,
    maxBounds:[[-82.40,29.61],[-82.28,29.69]],attributionControl:{compact:true},
    style:{version:8,sources:{protomaps:{type:"vector",url:`pmtiles://${pmtilesUrl}`,attribution:'<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'}},layers}
  });
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-left");
  map.once("error", () => showToast("Couldn't load the map file"));
  const you = document.createElement("div");
  you.className = "map-you";
  const youMarker = new maplibregl.Marker({element:you}).setLngLat(campus).addTo(map);
  // Blue dot follows the device location (needs https or localhost); stays on campus if denied or outside the map area.
  if (navigator.geolocation) {
    let centered = false;
    navigator.geolocation.watchPosition(({coords}) => {
      const here = [coords.longitude,coords.latitude];
      const [[west,south],[east,north]] = [[-82.40,29.61],[-82.28,29.69]];
      if (here[0] < west || here[0] > east || here[1] < south || here[1] > north) { if (!centered) showToast("You're outside the UF map area"); centered = true; return; }
      youMarker.setLngLat(here);
      if (!centered) { map.easeTo({center:here}); centered = true; }
    },() => showToast("Location unavailable, showing campus"),{enableHighAccuracy:true,maximumAge:10000});
  }
  let markers = [];
  const state = {kind:"tasks",category:"all",query:"",always:false};
  const draw = () => {
    markers.forEach(marker => marker.remove());
    const query = state.query.trim().toLowerCase();
    markers = mapRequests.filter(r => r.kind === state.kind && (state.category === "all" || r.category === state.category) && r.title.toLowerCase().includes(query)).map(r => {
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
