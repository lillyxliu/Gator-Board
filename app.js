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
  return `<span class="${className}" aria-hidden="true">${taskIcon(task)}</span>`;
}

function taskRewardAmount(task) {
  const value = String(task.reward ?? task.summary ?? "").trim();
  return /^\$?\d+(?:\.\d+)?$/.test(value) ? Number(value.replace("$", "")) : null;
}

function taskCreatedTime(task) {
  const fromId = /^task-(\d+)$/.exec(task.id || "");
  return Number(task.createdAt) || Date.parse(task.createdAt) || (fromId ? Number(fromId[1]) : 0);
}

function taskDistanceMiles(a, b) {
  const radians = degrees => degrees * Math.PI / 180;
  const latitude = radians(b.lat-a.lat), longitude = radians(b.lng-a.lng);
  const h = Math.sin(latitude/2)**2 + Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(longitude/2)**2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(Math.min(1,h)));
}

function renderHome() {
  const taskList = $("#task-list");
  const search = $("#task-search");
  let selectedCategory = "All";
  let mineOnly = false;
  const sort = $("#task-sort");
  const status = $("#sort-status");
  let userLocation = null;
  let places = [];
  function distance(task) {
    if (!userLocation) return Infinity;
    let spot = Number.isFinite(task.lat) && Number.isFinite(task.lng) ? task : null;
    if (!spot) {
      const name = (task.location || "").replace(/\(.*?\)/g, "").trim().toLowerCase();
      spot = places.find(place => place.n.toLowerCase() === name);
    }
    return spot ? taskDistanceMiles(userLocation, spot) : Infinity;
  }

  function update() {
    const query = search.value.trim().toLowerCase();
    const tasks = getAllTasks().filter(task => {
      const categoryMatches = selectedCategory === "All" || task.category === selectedCategory;
      const textMatches = [task.title,task.summary,task.category,task.location,task.description].join(" ").toLowerCase().includes(query);
      return categoryMatches && textMatches && (!mineOnly || task.createdByMe);
    });
    taskList.innerHTML = tasks.map(task => `<a class="task-card" href="task-detail.html?id=${encodeURIComponent(task.id)}">${imageMarkup(task)}<span class="task-card-content"><h3>${escapeHtml(task.title)}</h3><p class="task-meta"><strong>${escapeHtml(task.summary || task.reward || "$8")}</strong> · ${escapeHtml(task.category)}</p><p class="task-meta"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg> &nbsp;${escapeHtml(task.location)}${task.distance ? ` (${escapeHtml(task.distance)})` : ""}</p><p class="task-meta"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></svg> &nbsp;${escapeHtml(task.cardTime || task.time)}</p></span></a>`).join("");
    const cards = [...taskList.children];
    const ordered = tasks.map((task,index) => ({task,index,distance:distance(task)}));
    ordered.sort((a,b) => {
      if (sort.value === "nearest") return (a.distance === b.distance ? 0 : a.distance - b.distance) || a.index - b.index;
      if (sort.value.startsWith("reward")) {
        const first = taskRewardAmount(a.task), second = taskRewardAmount(b.task);
        if (first === null || second === null) return first === second ? a.index-b.index : first === null ? 1 : -1;
        return (sort.value === "reward-high" ? second-first : first-second) || a.index-b.index;
      }
      return taskCreatedTime(b.task)-taskCreatedTime(a.task) || a.index-b.index;
    });
    ordered.forEach(item => {
      const card = cards[item.index];
      if (sort.value === "nearest") {
        const locationLine = card.querySelectorAll(".task-meta")[1];
        const label = Number.isFinite(item.distance) ? `${item.distance.toFixed(1)} mi away` : "Distance unavailable";
        const icon = locationLine.querySelector("svg");
        locationLine.textContent = ` ${item.task.location} (${label})`;
        if (icon) locationLine.prepend(icon);
      }
      taskList.append(card);
    });
    $("#empty-state").hidden = tasks.length !== 0;
  }

  sort.addEventListener("change", async () => {
    status.textContent = "";
    if (sort.value !== "nearest" || userLocation) { update(); return; }
    if (!navigator.geolocation) { status.textContent = "Location is unavailable. Showing newest tasks."; sort.value="newest"; update(); return; }
    sort.disabled = true;
    status.textContent = "Finding your location…";
    try {
      const [position, data] = await Promise.all([
        new Promise((resolve,reject) => navigator.geolocation.getCurrentPosition(resolve,reject,{timeout:10000,maximumAge:60000})),
        loadPlaces()
      ]);
      userLocation = {lat:position.coords.latitude,lng:position.coords.longitude};
      places = data;
      status.textContent = "Sorted by straight-line distance. Tasks without a known location appear last.";
    } catch {
      sort.value = "newest";
      status.textContent = "Could not access your location. Allow location access and try again. Showing newest tasks.";
    } finally { sort.disabled=false; update(); }
  });

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
  return `${imageMarkup(task,"hero-image")}<div class="detail-heading"><h2>${escapeHtml(task.title)}</h2><strong>${escapeHtml(task.reward || task.summary || "$8")}</strong></div><p class="detail-row"><span><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>${escapeHtml(task.location)}</p><p class="detail-row"><span><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/></svg></span>${escapeHtml(task.time)}</p>${review ? "" : `<div class="poster-row"><span class="avatar">👤</span><span><p>Posted by ${escapeHtml(task.poster || "gator_user")}</p><small>${escapeHtml(task.posted || "Just now")}</small></span>${ownerView ? "" : `<button class="outline-button" type="button" data-action="message">Message</button>`}</div>`}<section class="detail-section"><h3>Description</h3><p>${escapeHtml(task.description)}</p></section><section class="detail-section"><h3>Location</h3><div class="detail-map" id="detail-map" role="region" aria-label="Map showing ${escapeHtml(task.location)}"></div></section>${review ? "" : `<button class="primary-button offer-button" type="button" data-action="complete">${ownerView ? "Complete Task & Review Runner" : "Complete Task & Review Submitter"}</button>`}`;
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
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.action === "complete") {
      openReviewModal(task, ownerView);
      return;
    }
    showToast(`Opening chat with ${task.poster || "poster"}…`);
  }));
}

async function openReviewModal(task, ownerView) {
  let revieweeId = ownerView ? task.runnerId : task.submitterId;
  if (!ownerView && !Number.isInteger(task.runnerId)) {
    const meResponse = await fetch("/api/me");
    if (meResponse.status === 401) {
      location.href = "login.html";
      return;
    }
    if (!meResponse.ok) {
      showToast("Unable to identify the errand runner.");
      return;
    }
    const {user} = await meResponse.json();
    task.runnerId = user.id;
    const savedTasks = getSavedTasks();
    const savedTask = savedTasks.find(item => item.id === task.id);
    if (savedTask) {
      savedTask.runnerId = user.id;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTasks));
    }
  }
  const modal = $("#review-modal");
  let selectedRating = 0;
  $("#modal-review-subtitle").textContent = ownerView ? "Rate the errand runner who completed this task." : "Rate the task submitter who posted this task.";
  $("#modal-review-comment").value = "";
  $("#modal-rating-error").hidden = true;
  document.querySelectorAll("[data-modal-rating]").forEach(button => {
    button.classList.remove("is-selected");
    button.onclick = () => {
      selectedRating = Number(button.dataset.modalRating);
      document.querySelectorAll("[data-modal-rating]").forEach(star => star.classList.toggle("is-selected", Number(star.dataset.modalRating) <= selectedRating));
      $("#modal-rating-error").hidden = true;
    };
  });
  modal.hidden = false;
  $("#modal-submit-review").onclick = async () => {
    if (!selectedRating) {
      $("#modal-rating-error").textContent = "Select a star rating before submitting.";
      $("#modal-rating-error").hidden = false;
      return;
    }
    if (!Number.isInteger(revieweeId)) {
      $("#modal-rating-error").textContent = "This task is not assigned to a submitter or errand runner yet.";
      $("#modal-rating-error").hidden = false;
      return;
    }
    const submit = $("#modal-submit-review");
    submit.disabled = true;
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({taskId: task.id, revieweeId, rating: selectedRating, comment: $("#modal-review-comment").value})
      });
      const result = await response.json();
      if (response.status === 401) {
        location.href = "login.html";
        return;
      }
      if (!response.ok) throw new Error(result.error || "Unable to save review.");
      modal.hidden = true;
      showToast("Review submitted.");
    } catch (error) {
      console.error("Review error:", error);
      $("#modal-rating-error").textContent = error.message;
      $("#modal-rating-error").hidden = false;
    } finally {
      submit.disabled = false;
    }
  };
}

async function renderProfile() {
  const logoutButton = $("#logout-button");
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      const response = await fetch("/api/logout", {method: "POST"});
      if (!response.ok) throw new Error("Logout failed.");
      location.href = "login.html";
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Unable to log out. Please try again.");
      logoutButton.disabled = false;
    }
  });

  try {
    const response = await fetch("/api/profile");
    if (response.status === 401) {
      location.href = "login.html";
      return;
    }
    if (!response.ok) throw new Error("Profile request failed");
    const {profile} = await response.json();
    const rating = Number(profile.rating);
    $("#profile-summary").innerHTML = `<div class="profile-avatar">♙</div><h2>${escapeHtml(profile.username)}</h2><p>${escapeHtml(profile.email)}</p><div class="profile-rating" aria-label="${rating} out of 5 stars"><strong>${rating.toFixed(1)}</strong><span>★</span><small>${profile.review_count} review${profile.review_count === 1 ? "" : "s"}</small></div>`;
    const reviews = profile.reviews || [];
    $("#review-list").innerHTML = reviews.length ? reviews.map(review => `<article class="review-card"><strong>From ${escapeHtml(review.reviewer || "Gator Board member")}</strong><div class="review-stars" aria-label="${review.rating} out of 5 stars">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</div>${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : "<p class=\"muted-review\">No comment provided.</p>"}</article>`).join("") : '<p class="empty-state">No reviews yet. Complete a task to leave the first one.</p>';
  } catch (error) {
    console.error("Profile error:", error);
    $("#profile-summary").innerHTML = '<p class="form-error">Unable to load your profile.</p>';
  }
}

function renderRatingReview() {
  const taskId = new URLSearchParams(location.search).get("id");
  if (!taskId) {
    location.replace("index.html#home");
    return;
  }
  const task = getAllTasks().find(item => item.id === taskId);
  if (task) $("#review-task-subtitle").textContent = `How did "${task.title}" go?`;
  let selectedRating = 0;
  document.querySelectorAll("[data-rating]").forEach(button => button.addEventListener("click", () => {
    selectedRating = Number(button.dataset.rating);
    document.querySelectorAll("[data-rating]").forEach(star => {
      const active = Number(star.dataset.rating) <= selectedRating;
      star.classList.toggle("is-selected", active);
      star.setAttribute("aria-checked", String(active && Number(star.dataset.rating) === selectedRating));
    });
    $("#rating-error").hidden = true;
  }));
  $("#submit-review").addEventListener("click", async () => {
    if (!selectedRating) {
      $("#rating-error").textContent = "Select a star rating before submitting.";
      $("#rating-error").hidden = false;
      return;
    }
    const submit = $("#submit-review");
    submit.disabled = true;
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({taskId, rating: selectedRating, comment: $("#review-comment").value})
      });
      const result = await response.json();
      if (response.status === 401) {
        location.href = "login.html";
        return;
      }
      if (!response.ok) throw new Error(result.error || "Unable to save review.");
      location.href = "profile.html";
    } catch (error) {
      console.error("Review error:", error);
      $("#rating-error").textContent = error.message;
      $("#rating-error").hidden = false;
      submit.disabled = false;
    }
  });
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

async function renderReview() {
  let task;
  try { task = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { task = null; }
  if (!task) { location.replace("add-task.html"); return; }
  $("#review-detail").innerHTML = detailMarkup(task,true);
  window.addEventListener("load",() => showTaskMap(task));
  $("#publish-task").addEventListener("click", async () => {
    const tasks = getSavedTasks();
    const response = await fetch("/api/me");
    if (!response.ok) {
      location.href = "login.html";
      return;
    }
    const {user} = await response.json();
    const publishedTask = {...task,id:`task-${Date.now()}`,createdByMe:true,submitterId:user.id,poster:user.username};
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
if (page === "profile") renderProfile();
if (page === "rating-review") renderRatingReview();

document.querySelectorAll("[data-close-review]").forEach(element => element.addEventListener("click", () => {
  $("#review-modal").hidden = true;
}));

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
  // Blue dot follows the device location (needs https or localhost); stays on campus if denied or outside the map area.
  if (navigator.geolocation) {
    let centered = false;
    navigator.geolocation.watchPosition(({coords}) => {
      const here = [coords.longitude,coords.latitude];
      
      if (!inMapBounds(here)) { if (!centered) showToast("You're outside the UF map area"); centered = true; return; }
      youMarker.setLngLat(here);
      if (!centered) { map.easeTo({center:here}); centered = true; }
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

function taskIcon(task) {
 const icons = {"Study":"<svg class=\"ui-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-2-7-2-10 1Zm0 0v15\"/></svg>","Delivery":"<svg class=\"ui-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m12 2 10 5-10 6L2 7l10-5Zm-10 5v10l10 5 10-5V7M12 13v9M7 4.5l10 5v6\"/></svg>","Errand":"<svg class=\"ui-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 7h14l1 14H4L5 7Z\"/><path d=\"M8 9V6a4 4 0 0 1 8 0v3\"/></svg>","Food":"<svg class=\"ui-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 3v7a3 3 0 0 0 6 0V3M7 3v18M20 3c-5 1-5 11 0 11V3Zm0 11v7\"/></svg>"};
 return icons[task.category] || icons.Delivery;
}
