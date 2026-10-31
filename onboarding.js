// Onboarding: three quick questions that decide what the app shows by default.
// Answers are saved to the signed-in account (users.preferences) and cached on this device.
const PREFS_KEY = "gatorBoardPrefs";
const steps = [...document.querySelectorAll(".onboard-step")];
const dots = [...document.querySelectorAll(".onboard-dots span")];
const next = document.getElementById("onboard-next");
const back = document.getElementById("onboard-back");
const error = document.getElementById("onboard-error");
const editing = new URLSearchParams(location.search).has("edit");
let current = 0;

function show(index) {
  current = index;
  steps.forEach((step, position) => { step.hidden = position !== index; });
  dots.forEach((dot, position) => dot.classList.toggle("is-active", position <= index));
  back.hidden = index === 0;
  next.textContent = index === steps.length - 1 ? (editing ? "Save" : "Finish") : "Next";
  error.hidden = true;
}

function chosenCategories() {
  return [...document.querySelectorAll("#onboard-categories input:checked")].map(input => input.value);
}

function fill(preferences) {
  if (!preferences) return;
  document.querySelectorAll("#onboard-categories input").forEach(input => { input.checked = preferences.categories.includes(input.value); });
  const sort = document.querySelector(`#onboard-sort input[value="${preferences.sort}"]`);
  if (sort) sort.checked = true;
  const map = document.querySelector(`#onboard-map input[value="${preferences.mapView}"]`);
  if (map) map.checked = true;
}

function fail(message) {
  error.textContent = message;
  error.hidden = false;
}

async function finish() {
  const body = {
    categories: chosenCategories(),
    sort: document.querySelector("#onboard-sort input:checked").value,
    mapView: document.querySelector("#onboard-map input:checked").value
  };
  next.disabled = true;
  try {
    const response = await fetch("/api/preferences", {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
    if (response.status === 401) { location.replace("login.html"); return; }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Couldn't save your choices.");
    localStorage.setItem(PREFS_KEY, JSON.stringify(result.preferences));
    location.replace(editing ? "profile.html" : "index.html#home");
  } catch (problem) {
    fail(problem.message);
    next.disabled = false;
  }
}

next.addEventListener("click", () => {
  if (current === 0 && !chosenCategories().length) { fail("Pick at least one kind of task."); return; }
  if (current < steps.length - 1) show(current + 1); else finish();
});
back.addEventListener("click", () => show(Math.max(0, current - 1)));

(async () => {
  try {
    const response = await fetch("/api/me");
    if (response.status === 401) { location.replace("login.html"); return; }
    const {user} = await response.json();
    if (editing) {
      document.getElementById("onboard-cancel").hidden = false;
      fill(user.preferences);
    }
  } catch { /* keep the defaults */ }
  show(current);
})();
