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
