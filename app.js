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
// Opening the app plays the logo animation (welcome.html) once per browser session.
if (page === "home") {
  let welcomed = false;
  try { welcomed = sessionStorage.getItem("gbWelcomed") === "1"; } catch {}
  if (!welcomed) location.replace("welcome.html");
}
const $ = (selector, scope = document) => scope.querySelector(selector);
// Run now if the page has already finished loading (pages render after tasks arrive), otherwise on load.
const whenLoaded = fn => document.readyState === "complete" ? fn() : window.addEventListener("load",fn);
const ic = name => `<i class="i i-${name}" aria-hidden="true"></i>`;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]);
}

function getSavedTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function getAllTasks() {
  const saved = getSavedTasks();
  return [...saved, ...sampleTasks.filter(sample => !saved.some(task => task.id === sample.id))];
}

// Published tasks live on the server so every account sees them; the browser keeps a copy for quick reads.
const PREFS_KEY = "gatorBoardPrefs";
let currentUser = null;
function getPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)); } catch { return null; }
}
async function refreshTasks() {
  try {
    const [meResponse, tasksResponse] = await Promise.all([fetch("/api/me"), fetch("/api/tasks")]);
    if (meResponse.ok) {
      currentUser = (await meResponse.json()).user;
      localStorage.setItem(PREFS_KEY,JSON.stringify(currentUser.preferences || null));
    }
    if (tasksResponse.ok) {
      const {tasks} = await tasksResponse.json();
      localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks.map(task => ({...task,createdByMe:Boolean(currentUser) && Number(task.submitterId) === Number(currentUser.id)}))));
    }
  } catch {}
}
const tasksReady = refreshTasks();

function showToast(message) {
  const toast = $(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function avatarMarkup(src, name, className = "avatar") {
  if (src) return `<img class="${className}" src="${escapeHtml(src)}" alt="">`;
  const letters = String(name).split(/[\s_]+/).filter(Boolean).map(part => part[0]).join("").slice(0,2).toUpperCase() || "?";
  return `<span class="${className} avatar-initials" aria-hidden="true">${escapeHtml(letters)}</span>`;
}

function imageMarkup(task, className = "task-image") {
  if (task.image) return `<img class="${className}" src="${escapeHtml(task.image)}" alt="">`;
  const cash = task.rewardType === "other" ? null : taskRewardAmount(task);
  if (cash !== null) return `<span class="${className} task-cash" aria-hidden="true">$${cash}</span>`;
  return `<span class="${className}" aria-hidden="true">${taskIcon(task)}</span>`;
}

function taskDuration(task) {
  const minutes = Number(task.durationMinutes);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : Infinity;
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

  const prefs = getPrefs();
  const wanted = category => !prefs || prefs.categories.includes(category);
  document.querySelectorAll(".category-button").forEach(button => { if (button.dataset.category !== "All") button.hidden = !wanted(button.dataset.category); });
  function update() {
    const query = search.value.trim().toLowerCase();
    const tasks = getAllTasks().filter(task => {
      const categoryMatches = selectedCategory === "All" ? (mineOnly || wanted(task.category)) : task.category === selectedCategory;
      const textMatches = [task.title,task.summary,task.category,task.location,task.description].join(" ").toLowerCase().includes(query);
      return categoryMatches && textMatches && (!mineOnly || task.createdByMe);
    });
    taskList.innerHTML = tasks.map(task => `<a class="task-card" href="task-detail.html?id=${encodeURIComponent(task.id)}">${imageMarkup(task)}<span class="task-card-content"><h3>${escapeHtml(task.title)}</h3><p class="task-meta"><strong>${escapeHtml(task.summary || task.reward || "$8")}</strong> · ${escapeHtml(task.category)}</p><p class="task-meta"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg> &nbsp;${escapeHtml(task.location)}${task.distance ? ` (${escapeHtml(task.distance)})` : ""}</p><p class="task-meta"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></svg> &nbsp;${escapeHtml(task.cardTime || task.time)}</p></span></a>`).join("");
    const cards = [...taskList.children];
    tasks.forEach((task,index) => {
      if (Number.isFinite(taskDuration(task))) {
        const duration = document.createElement("p");
        duration.className = "task-meta";
        duration.textContent = `Estimated duration: ${task.durationMinutes} min`;
        cards[index].querySelector(".task-card-content").append(duration);
      }
    });
    const ordered = tasks.map((task,index) => ({task,index,distance:distance(task)}));
    ordered.sort((a,b) => {
      if (sort.value === "nearest") return (a.distance === b.distance ? 0 : a.distance - b.distance) || a.index - b.index;
      if (sort.value === "duration") {
        const first = taskDuration(a.task), second = taskDuration(b.task);
        return (first === second ? 0 : first-second) || a.index-b.index;
      }
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
  if (prefs && prefs.sort && prefs.sort !== "newest") { sort.value = prefs.sort; sort.dispatchEvent(new Event("change")); }
  else update();
}

function detailMarkup(task, review = false, ownerView = false) {
  return `${task.image ? imageMarkup(task,"hero-image") : ""}<div class="detail-heading"><h2>${escapeHtml(task.title)}</h2><strong>${escapeHtml(task.reward || task.summary || "$8")}</strong></div><p class="detail-row"><span><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>${escapeHtml(task.location)}</p><p class="detail-row"><span><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/></svg></span>${escapeHtml(task.time)}</p>${Number.isFinite(taskDuration(task)) ? `<p class="detail-row">Estimated duration: ${escapeHtml(task.durationMinutes)} min</p>` : ""}${review ? "" : `<div class="poster-row">${avatarMarkup(task.posterAvatar, task.poster || "gator_user")}<span><p>Posted by ${escapeHtml(task.poster || "gator_user")}</p><small>${escapeHtml(task.posted || "Just now")}</small></span>${ownerView || task.createdByMe ? "" : `<button class="outline-button" type="button" data-action="message">Message</button>`}</div>`}<section class="detail-section"><h3>Description</h3><p>${escapeHtml(task.description)}</p></section><section class="detail-section"><h3>Location</h3><div class="detail-map" id="detail-map" role="region" aria-label="Map showing ${escapeHtml(task.location)}"></div></section>${review ? "" : `<button class="primary-button offer-button" type="button" data-action="complete">${ownerView ? "Complete Task & Review Runner" : "Complete Task & Review Submitter"}</button>`}`;
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
  whenLoaded(() => showTaskMap(task));
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.action === "complete") {
      openReviewModal(task, ownerView);
      return;
    }
    openChatForTask(task);
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
  const openModal = modal => {
    modal.hidden = false;
    const close = () => { modal.hidden = true; modal.removeEventListener("click",onClick); };
    const onClick = event => { if (event.target === modal || event.target.closest("[data-close]")) close(); };
    modal.addEventListener("click",onClick);
  };
  document.querySelectorAll("[data-open]").forEach(button => button.addEventListener("click",() => {
    const target = document.getElementById(button.dataset.open);
    if (target.classList.contains("sheet")) openSheet(target); else openModal(target);
  }));
  document.querySelectorAll("[data-soon]").forEach(button => button.addEventListener("click",() => showToast(`${button.dataset.soon} is coming soon`)));

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

  // Removes this account's tasks, chats, messages, written reviews and preferences, but keeps the login.
  $("#remove-data").addEventListener("click", async () => {
    if (!confirm("Remove all of your data? Your tasks, chats, messages, reviews you wrote and your preferences will be deleted. Your account stays.")) return;
    try {
      await chatApi("/account/clear-data",{method:"POST"});
      [STORAGE_KEY,DRAFT_KEY,PREFS_KEY].forEach(key => localStorage.removeItem(key));
      location.href = "onboarding.html";
    } catch (error) { showToast(error.message); }
  });
  $("#delete-account").addEventListener("click", async () => {
    if (!confirm("Delete your account and all of its data? This cannot be undone.")) return;
    try {
      await chatApi("/account",{method:"DELETE"});
      [STORAGE_KEY,DRAFT_KEY,PREFS_KEY].forEach(key => localStorage.removeItem(key));
      location.href = "login.html";
    } catch (error) { showToast(error.message); }
  });

  // Profile picture: shrink to 256px and store it on the account.
  const avatarInput = $("#avatar-input");
  $("#change-photo").addEventListener("click",() => avatarInput.click());
  avatarInput.addEventListener("change",async event => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      const src = await shrinkImage(file,256);
      await chatApi("/account/avatar",{method:"PUT",body:{src}});
      $("#profile-photo").innerHTML = avatarMarkup(src,"","profile-photo-inner");
      $("#settings-modal").hidden = true;
      showToast("Profile picture updated");
    } catch (error) { showToast(error.message || "Couldn't use that picture"); }
  });

  // Notification settings
  const notifyForm = $("#notify-form");
  chatApi("/notification-settings").then(({settings}) => {
    notifyForm.elements.newTasks.checked = settings.newTasks;
    notifyForm.elements.chatMessages.checked = settings.chatMessages;
  }).catch(() => {});
  notifyForm.addEventListener("submit",async event => {
    event.preventDefault();
    try {
      await chatApi("/notification-settings",{method:"PUT",body:{newTasks:notifyForm.elements.newTasks.checked,chatMessages:notifyForm.elements.chatMessages.checked}});
      $("#notify-sheet").hidden = true;
      showToast("Notification settings saved");
    } catch (error) { showToast(error.message); }
  });

  // Contact Us intake form (stored for the team; nothing is emailed yet).
  const contactForm = $("#contact-form");
  contactForm.addEventListener("submit",async event => {
    event.preventDefault();
    const error = $("#contact-error");
    error.hidden = true;
    if (!contactForm.reportValidity()) return;
    const data = new FormData(contactForm);
    try {
      const {reference} = await chatApi("/contact",{method:"POST",body:{topic:data.get("topic"),email:data.get("email"),message:data.get("message")}});
      contactForm.hidden = true;
      $("#contact-done").hidden = false;
      $("#contact-done").innerHTML = `<strong>Thanks, we got your message.</strong><p>Your reference number is <b>${escapeHtml(reference)}</b>. We'll reply to ${escapeHtml(data.get("email"))}.</p><button type="button" class="outline-button sheet-again" id="contact-again">Send another message</button>`;
      // Start a fresh request, keeping the reply email.
      $("#contact-again").addEventListener("click",() => {
        const email = contactForm.elements.email.value;
        contactForm.reset();
        contactForm.elements.email.value = email;
        $("#contact-done").hidden = true;
        contactForm.hidden = false;
      });
    } catch (problem) { error.textContent = problem.message; error.hidden = false; }
  });

  // Report Fraud: search for a user, pick a reason, store the report.
  const reportForm = $("#report-form"), results = $("#report-results"), selected = $("#report-selected");
  let reportUser = null, searchTimer;
  const pickUser = user => {
    reportUser = user;
    results.innerHTML = "";
    selected.hidden = false;
    selected.innerHTML = `Reporting ${avatarMarkup(user.avatar,user.username,"mini-avatar")}<b>${escapeHtml(user.username)}</b> <button type="button" id="report-change">Change</button>`;
    $("#report-change").addEventListener("click",() => { reportUser = null; selected.hidden = true; $("#report-search").value = ""; $("#report-search").focus(); });
  };
  $("#report-search").addEventListener("input",event => {
    clearTimeout(searchTimer);
    const q = event.target.value.trim();
    searchTimer = setTimeout(async () => {
      if (q.length < 2) { results.innerHTML = ""; return; }
      try {
        const {users} = await chatApi(`/users/search?q=${encodeURIComponent(q)}`);
        results.innerHTML = users.length ? users.map((user,index) => `<button type="button" class="user-result" data-index="${index}">${avatarMarkup(user.avatar,user.username,"mini-avatar")}<span>${escapeHtml(user.username)}</span></button>`).join("") : '<p class="empty-state">No users match that name.</p>';
        results.querySelectorAll(".user-result").forEach(button => button.addEventListener("click",() => pickUser(users[Number(button.dataset.index)])));
      } catch {}
    },250);
  });
  reportForm.addEventListener("submit",async event => {
    event.preventDefault();
    const error = $("#report-error");
    error.hidden = true;
    if (!reportUser) { error.textContent = "Search for the user you want to report and select them."; error.hidden = false; return; }
    if (!reportForm.reportValidity()) return;
    const data = new FormData(reportForm);
    try {
      const {reference} = await chatApi("/reports",{method:"POST",body:{userId:reportUser.id,reason:data.get("reason"),details:data.get("details") || ""}});
      reportForm.hidden = true;
      $("#report-done").hidden = false;
      $("#report-done").innerHTML = `<strong>Your report has been received.</strong><p>We've recorded your report about <b>${escapeHtml(reportUser.username)}</b>. Reference number: <b>${escapeHtml(reference)}</b>.</p><button type="button" class="outline-button sheet-again" id="report-again">File another report</button>`;
      // Start a fresh report with nobody selected.
      $("#report-again").addEventListener("click",() => {
        reportForm.reset();
        reportUser = null;
        selected.hidden = true;
        results.innerHTML = "";
        $("#report-done").hidden = true;
        reportForm.hidden = false;
      });
    } catch (problem) { error.textContent = problem.message; error.hidden = false; }
  });

  // Drafts saved on this device plus every request this account has posted.
  let draft;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { draft = null; }
  const mine = getSavedTasks().filter(task => task.createdByMe);
  const row = (href, title, meta, badge) => `<a class="request-row" href="${href}"><span class="request-main"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(meta)}</small></span>${badge ? `<b>${escapeHtml(badge)}</b>` : ""}</a>`;
  $("#request-list").innerHTML =
    `<h3 class="request-heading">Draft</h3>${draft ? row("add-task.html", draft.title || "Untitled draft", draft.location || "Not posted yet", "Draft") : '<p class="empty-state">No saved draft.</p>'}` +
    `<h3 class="request-heading">My requests</h3>${mine.length ? mine.map(task => row(`task-detail.html?id=${encodeURIComponent(task.id)}&owner=1`, task.title, [task.location, task.time].filter(Boolean).join(" · "), task.reward || task.summary || "")).join("") : '<p class="empty-state">You haven\'t posted any requests yet.</p>'}`;

  try {
    const response = await fetch("/api/profile");
    if (response.status === 401) {
      location.href = "login.html";
      return;
    }
    if (!response.ok) throw new Error("Profile request failed");
    const {profile} = await response.json();
    const rating = Number(profile.rating);
    if (!$("#contact-form").elements.email.value) $("#contact-form").elements.email.value = profile.email || "";
    $("#profile-name").textContent = profile.username;
    $("#profile-photo").innerHTML = avatarMarkup(profile.avatar, profile.username, "profile-photo-inner");
    $("#profile-summary").innerHTML = `<p>${escapeHtml(profile.email)}</p><div class="profile-rating" aria-label="${rating} out of 5 stars"><strong>${rating.toFixed(1)}</strong><span>★</span><small>${profile.review_count} review${profile.review_count === 1 ? "" : "s"}</small></div>`;
    const reviews = profile.reviews || [];
    $("#review-list").innerHTML = reviews.length ? reviews.map(review => `<article class="review-card"><strong>From ${escapeHtml(review.reviewer || "Gator Board member")}</strong><div class="review-stars" aria-label="${review.rating} out of 5 stars">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</div>${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : "<p class=\"muted-review\">No comment provided.</p>"}</article>`).join("") : '<p class="empty-state">No reviews yet. Complete a task to leave the first one.</p>';
  } catch (error) {
    console.error("Profile error:", error);
    $("#profile-name").textContent = "Unable to load your profile.";
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

// A reward is either an amount of money or free text such as "a coffee".
function rewardText(data) {
  return data.get("rewardType") === "other" ? String(data.get("rewardOther") || "").trim() : `$${data.get("reward")}`;
}

function readForm(form) {
  const data = new FormData(form);
  return {durationMinutes: data.get("durationMinutes") ? Number(data.get("durationMinutes")) : null,title:data.get("title").trim(),summary:rewardText(data),reward:rewardText(data),rewardType:data.get("rewardType") === "other" ? "other" : "money",category:data.get("category"),description:data.get("description").trim(),location:data.get("location").trim(),...(data.get("lat") && data.get("lng") ? {lat:Number(data.get("lat")),lng:Number(data.get("lng"))} : {}),time:data.get("time").trim(),cardTime:data.get("time").trim(),posted:"Just now",icon:data.get("category") === "Study" ? "▭" : "◇"};
}

function fillForm(form, draft) {
  if (!draft) return;
  ["title","description","location","time","lat","lng","durationMinutes"].forEach(name => { if (form.elements[name] && draft[name] != null) form.elements[name].value = draft[name]; });
  if (draft.rewardType === "other") {
    form.querySelector('[name="rewardType"][value="other"]').checked = true;
    form.elements.rewardOther.value = draft.reward || "";
  } else if (draft.reward != null) form.elements.reward.value = String(draft.reward).replace("$","");
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
  whenLoaded(() => setupLocationPicker(form));
  const moneyField = $("#reward-money"), otherField = $("#reward-other");
  const syncReward = () => {
    const other = form.elements.rewardType.value === "other";
    moneyField.hidden = other;
    otherField.hidden = !other;
    form.elements.reward.required = !other;
    form.elements.rewardOther.required = other;
  };
  form.querySelectorAll('[name="rewardType"]').forEach(radio => radio.addEventListener("change",syncReward));
  syncReward();
  const preview = $("#photo-preview");
  let photoData = draft && draft.image || "";
  const showPhoto = () => { preview.hidden = !photoData; if (photoData) preview.querySelector("img").src = photoData; };
  form.elements.photo.addEventListener("change",async event => {
    const file = event.target.files[0];
    if (!file) return;
    try { photoData = await shrinkImage(file); showPhoto(); } catch { showToast("Couldn't read that picture"); event.target.value = ""; }
  });
  $("#photo-remove").addEventListener("click",() => { photoData = ""; form.elements.photo.value = ""; showPhoto(); });
  showPhoto();
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!form.elements.lat.value) { showToast("Pick a spot on the map so people can find the task"); $("#location-map").scrollIntoView({block:"center",behavior:"smooth"}); return; }
    const task = readForm(form);
    if (photoData) task.image = photoData;
    localStorage.setItem(DRAFT_KEY,JSON.stringify(task));
    location.href = "review-task.html";
  });
  $("#save-draft").addEventListener("click", () => { const draftTask = readForm(form); if (photoData) draftTask.image = photoData; localStorage.setItem(DRAFT_KEY,JSON.stringify(draftTask)); showToast("Draft saved on this device"); });
}

async function renderReview() {
  let task;
  try { task = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { task = null; }
  if (!task) { location.replace("add-task.html"); return; }
  $("#review-detail").innerHTML = detailMarkup(task,true);
  whenLoaded(() => showTaskMap(task));
  $("#publish-task").addEventListener("click", async () => {
    const button = $("#publish-task");
    button.disabled = true;
    try {
      const response = await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({task})});
      if (response.status === 401) { location.href = "login.html"; return; }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Couldn't publish your task.");
      const published = {...result.task,createdByMe:true};
      localStorage.setItem(STORAGE_KEY,JSON.stringify([published,...getSavedTasks().filter(item => item.id !== published.id)]));
      localStorage.removeItem(DRAFT_KEY);
      location.href = `task-posted.html?id=${encodeURIComponent(published.id)}`;
    } catch (error) {
      showToast(error.message);
      button.disabled = false;
    }
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

tasksReady.then(() => {
  if (page === "home") { renderHome(); if (location.hash === "#published") showToast("Task published successfully!"); }
  if (page === "detail") renderDetail();
  if (page === "add") renderAdd();
  if (page === "review") renderReview();
  if (page === "posted") renderPosted();
  if (page === "profile") renderProfile();
  if (page === "rating-review") renderRatingReview();
  });

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
  const prefs = getPrefs();
  const wanted = category => !prefs || prefs.categories.includes(category);
  const state = {kind:prefs ? prefs.mapView : "tasks",category:"all",query:"",always:false};
  document.querySelectorAll(".map-kind-button").forEach(button => { const on = button.dataset.kind === state.kind; button.classList.toggle("is-selected",on); button.setAttribute("aria-pressed",on); });
  document.querySelectorAll(".map-chip").forEach(chip => { if (chip.dataset.category !== "all") chip.hidden = !wanted(chip.dataset.category); });
  const draw = () => {
    markers.forEach(marker => marker.remove());
    const query = state.query.trim().toLowerCase();
    markers = allRequests.filter(r => r.kind === state.kind && (state.category === "all" ? wanted(r.category) : r.category === state.category) && r.title.toLowerCase().includes(query)).map(r => {
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

// ---- Chats (shared between accounts through the server) ----
async function chatApi(path, {method = "GET", body} = {}) {
  const response = await fetch(`/api${path}`, {method,headers:{"Content-Type":"application/json"},body:body ? JSON.stringify(body) : undefined});
  if (response.status === 401) { location.href = "login.html"; throw new Error("Please log in."); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Something went wrong.");
  return result;
}

const initials = name => String(name).split(/\s+|_/).filter(Boolean).map(part => part[0]).join("").slice(0,2).toUpperCase() || "?";
const lockText = chat => chat.lockReason === "completed" ? "This task was completed, so the chat is locked." : "This chat was locked after 7 days without messages.";

function chatTime(at) {
  const date = new Date(at), today = new Date();
  const days = Math.round((new Date(today.getFullYear(),today.getMonth(),today.getDate()) - new Date(date.getFullYear(),date.getMonth(),date.getDate())) / 86400000);
  if (days <= 0) return date.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([],{weekday:"short"});
  return date.toLocaleDateString([],{month:"short",day:"numeric"});
}

const messagePreview = message => message.type === "image" ? "Photo" : message.type === "location" ? "Shared location" : message.body || message.text || "";

// "Message" on a task: open (or start) the chat with whoever posted it.
async function openChatForTask(task) {
  if (!Number.isInteger(task.submitterId)) { showToast("This is a sample task. Chats work on tasks posted by accounts."); return; }
  try {
    const {chatId} = await chatApi("/chats",{method:"POST",body:{taskId:task.id}});
    location.href = `chat.html?id=${chatId}`;
  } catch (error) { showToast(error.message); }
}

function renderChat() {
  const id = new URLSearchParams(location.search).get("id");
  if (id) renderThread(id); else renderChatList();
}

async function renderChatList() {
  $("#chat-list-view").hidden = false;
  const list = $("#chat-list"), search = $("#chat-search");
  let chats = [], me = null;
  const draw = () => {
    const query = search.value.trim().toLowerCase();
    const shown = chats.filter(chat => `${chat.other.username} ${chat.taskTitle} ${chat.lastMessage ? messagePreview(chat.lastMessage) : ""}`.toLowerCase().includes(query));
    const unread = chats.reduce((sum,chat) => sum + (chat.locked ? 0 : chat.unread),0);
    $("#chat-unread").textContent = unread ? `${unread} unread` : "";
    $("#chat-empty").hidden = shown.length > 0;
    list.innerHTML = shown.map(chat => {
      const last = chat.lastMessage, unreadBadge = chat.unread && !chat.locked;
      const preview = last ? `${last.senderId === me ? "You: " : ""}${messagePreview(last)}` : "No messages yet";
      return `<div class="chat-row"><a class="chat-card${chat.locked ? " is-locked" : ""}" href="chat.html?id=${chat.id}"><span class="chat-avatar">${escapeHtml(initials(chat.other.username))}</span><span class="chat-main"><span class="chat-top"><strong>${escapeHtml(chat.other.username)}</strong><time>${chatTime(chat.lastAt)}</time></span><span class="chat-task">${escapeHtml(chat.taskTitle)}</span><span class="chat-preview${unreadBadge ? " is-unread" : ""}"><span>${escapeHtml(preview)}</span>${unreadBadge ? `<b class="chat-badge">${chat.unread}</b>` : ""}</span></span>${chat.locked ? `<span class="chat-lock">${ic("lock")}Locked</span>` : ""}</a></div>`;
    }).join("");
  };
  const load = async () => {
    try { const result = await chatApi("/chats"); chats = result.chats; me = result.me; draw(); }
    catch (error) { if (!chats.length) $("#chat-empty").hidden = false; }
  };
  search.addEventListener("input",draw);
  await load();
  setInterval(load,5000);
}

const messageMarkup = (message, me) => {
  const mine = message.senderId === me;
  let body = `<p>${escapeHtml(message.text)}</p>`;
  if (message.type === "image") body = `<img class="chat-photo" src="${escapeHtml(message.src)}" alt="Shared photo">`;
  if (message.type === "location") body = `<a class="chat-location" href="map.html?lat=${Number(message.lat)}&lng=${Number(message.lng)}"><span aria-hidden="true">${ic("pin")}</span><span><strong>Shared location</strong><small>${escapeHtml(message.label || "Open on map")}</small></span></a>`;
  return `<div class="chat-bubble ${mine ? "is-mine" : "is-theirs"}${message.type !== "text" ? " has-media" : ""}">${body}<time>${chatTime(message.createdAt)}</time></div>`;
};

// Shrink a picked photo before saving it so it stays small enough to send and store.
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

async function renderThread(id) {
  $("#chat-thread-view").hidden = false;
  const log = $("#chat-log"), form = $("#chat-form"), input = form.elements.message, notice = $("#chat-lock-note");
  const lockables = form.querySelectorAll("button, #photo-input");
  let chat = null, me = null, messages = [], lastId = 0;
  const draw = (scroll = true) => {
    const locked = chat.locked;
    $("#thread-name").textContent = chat.other.username;
    $("#thread-task").textContent = chat.taskTitle;
    log.innerHTML = messages.map(message => messageMarkup(message,me)).join("") || '<p class="chat-empty-thread">Say hello to start the conversation.</p>';
    notice.hidden = !locked;
    notice.textContent = locked ? lockText(chat) : "";
    input.disabled = locked;
    lockables.forEach(control => { control.disabled = locked; });
    input.placeholder = locked ? "Chat locked" : "Write a message…";
    $("#complete-task").hidden = locked || !chat.isOwner;
    if (scroll && log.lastElementChild) log.lastElementChild.scrollIntoView({block:"end"});
  };
  const apply = result => {
    chat = result.chat; me = result.me;
    const fresh = result.messages.filter(message => !messages.some(known => known.id === message.id));
    messages = messages.concat(fresh);
    lastId = messages.length ? messages[messages.length - 1].id : 0;
    draw(fresh.length > 0 || !log.children.length);
  };
  try { apply(await chatApi(`/chats/${encodeURIComponent(id)}`)); }
  catch (error) { showToast(error.message); location.replace("chat.html"); return; }
  const poll = async () => { try { apply(await chatApi(`/chats/${encodeURIComponent(id)}?after=${lastId}`)); } catch {} };
  setInterval(poll,3000);

  const send = async message => {
    try {
      const {message: saved} = await chatApi(`/chats/${encodeURIComponent(id)}/messages`,{method:"POST",body:message});
      if (!messages.some(known => known.id === saved.id)) messages.push(saved);
      lastId = Math.max(lastId,saved.id);
      draw();
    } catch (error) { showToast(error.message); poll(); }
  };
  form.addEventListener("submit",event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    send({type:"text",text});
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
  $("#complete-task").addEventListener("click",async () => {
    try {
      await chatApi(`/chats/${encodeURIComponent(id)}/complete`,{method:"POST"});
      showToast("Task marked complete. Chat locked.");
      poll();
    } catch (error) { showToast(error.message); }
  });
  $("#show-request").addEventListener("click",() => {
    const task = getAllTasks().find(item => item.id === chat.taskId);
    $("#request-details").innerHTML = task
      ? `<h2>${escapeHtml(task.title)}</h2><p class="sheet-reward">${escapeHtml(task.reward || task.summary || "")}</p><p><span>${ic("pin")}</span>${escapeHtml(task.location || "")}</p><p><span>${ic("clock")}</span>${escapeHtml(task.time || "")}</p><p class="sheet-description">${escapeHtml(task.description || "")}</p><a class="primary-button sheet-link" href="task-detail.html?id=${encodeURIComponent(task.id)}">View full request</a>`
      : `<h2>${escapeHtml(chat.taskTitle)}</h2><p class="sheet-description">The details for this request are no longer available.</p>`;
    openSheet($("#request-sheet"));
  });
}
if (page === "chat") renderChat();

function taskIcon(task) {
 const icons = {"Study":"<svg class=\"ui-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-2-7-2-10 1Zm0 0v15\"/></svg>","Delivery":"<svg class=\"ui-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m12 2 10 5-10 6L2 7l10-5Zm-10 5v10l10 5 10-5V7M12 13v9M7 4.5l10 5v6\"/></svg>","Errand":"<svg class=\"ui-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 7h14l1 14H4L5 7Z\"/><path d=\"M8 9V6a4 4 0 0 1 8 0v3\"/></svg>","Food":"<svg class=\"ui-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 3v7a3 3 0 0 0 6 0V3M7 3v18M20 3c-5 1-5 11 0 11V3Zm0 11v7\"/></svg>"};
 return icons[task.category] || icons.Delivery;
}

// ---- Notifications (new tasks that match your interests, new chat messages) ----
function setupNotifications() {
  const bells = document.querySelectorAll(".notification");
  if (!bells.length) return;
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.id = "notification-sheet";
  sheet.setAttribute("role","dialog");
  sheet.setAttribute("aria-label","Notifications");
  sheet.hidden = true;
  sheet.innerHTML = '<div class="sheet-card"><button type="button" class="sheet-close" data-close aria-label="Close">✕</button><h2>Notifications</h2><button type="button" class="notice-readall" id="notice-readall">Mark all as read</button><div id="notice-list"></div></div>';
  document.body.appendChild(sheet);
  const list = sheet.querySelector("#notice-list");
  let items = [];
  const ago = at => {
    const minutes = Math.round((Date.now() - new Date(at).getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`;
    return chatTime(at);
  };
  const draw = () => {
    const unread = items.filter(item => !item.read).length;
    bells.forEach(bell => { bell.classList.toggle("has-unread",unread > 0); bell.setAttribute("aria-label",unread ? `Notifications, ${unread} unread` : "Notifications"); });
    sheet.querySelector("#notice-readall").hidden = !unread;
    list.innerHTML = items.map(item => `<button type="button" class="notice${item.read ? "" : " is-unread"}" data-id="${item.id}"><span class="notice-icon">${ic(item.type === "chat" ? "chat" : "pin")}</span><span class="notice-main"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.body || "")}</small></span><time>${ago(item.createdAt)}</time></button>`).join("") || '<p class="empty-state">You\'re all caught up.</p>';
  };
  const load = async () => {
    try { items = (await chatApi("/notifications")).notifications; draw(); } catch {}
  };
  bells.forEach(bell => bell.addEventListener("click",() => { load(); openSheet(sheet); }));
  list.addEventListener("click",async event => {
    const row = event.target.closest(".notice");
    if (!row) return;
    const item = items.find(entry => entry.id === Number(row.dataset.id));
    try { await chatApi("/notifications/read",{method:"POST",body:{id:Number(row.dataset.id)}}); } catch {}
    if (item && item.href) location.href = item.href; else load();
  });
  sheet.querySelector("#notice-readall").addEventListener("click",async () => {
    try { await chatApi("/notifications/read",{method:"POST",body:{id:"all"}}); } catch {}
    load();
  });
  load();
  setInterval(load,20000);
}
tasksReady.then(setupNotifications);
