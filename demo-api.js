// Demo mode for static hosting (GitHub Pages): answers /api/* in the browser with fake data kept in localStorage.
// It stays off everywhere else, so the real Express server handles requests when you run the app yourself.
// Visit any page with ?demo=1 to turn it on locally, ?demo=0 to turn it off again.
(() => {
  const FLAG_KEY = "gbDemo", STATE_KEY = "gbDemoState", ME = 1;
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch {} };

  const demoParam = new URLSearchParams(location.search).get("demo");
  if (demoParam === "1") write(FLAG_KEY, "1");
  if (demoParam === "0") write(FLAG_KEY, null);
  if (!location.hostname.endsWith("github.io") && read(FLAG_KEY) !== "1") return;
  window.GB_DEMO = true;

  // ---- Fake database ----
  const ALL_CATEGORIES = ["Errand", "Food", "Study", "Delivery", "Other"];
  const SORTS = ["newest", "reward-high", "reward-low", "nearest", "duration"];
  const CONTACT_TOPICS = ["Account", "A task or chat", "Bug report", "Feedback", "Other"];
  const FRAUD_REASONS = ["Scam or fake task", "Didn't pay or deliver", "Fake account", "Harassment", "Other"];
  const REPLIES = ["Sounds good, thank you!", "Perfect, see you soon.", "Got it. Let me know when you're close.", "Thanks so much, you're a lifesaver.", "Okay! I'll be at the main entrance."];
  const ago = hours => new Date(Date.now() - hours * 3600000).toISOString();

  function seed() {
    const user = (id, username, extra = {}) => ({id, username, email: `${username}@ufl.edu`, preferences: {categories: ALL_CATEGORIES, sort: "newest", mapView: "tasks"}, avatar: null, ...extra});
    const task = (id, ownerId, hours, data) => ({id, ownerId, createdAt: ago(hours), data});
    const message = (id, chatId, senderId, hours, body) => ({id, chatId, senderId, type: "text", body, data: null, createdAt: ago(hours)});
    return {
      loggedIn: false,
      users: [
        user(ME, "you", {preferences: null}),
        user(2, "sophia_u"), user(3, "ethan_r"), user(4, "maya_p"), user(5, "alex_t")
      ],
      // Same ids as the built-in sample tasks so map pins and task links keep working.
      tasks: [
        task("publix", 2, 2, {title: "Pick up groceries from Publix", summary: "$8", reward: "$8", rewardType: "money", category: "Errand", location: "Publix (13th St)", distance: "0.8 mi", time: "Today, Oct 16 at 5:00 PM", cardTime: "Today, 5:00 PM", description: "Pick up 1 gallon of whole milk, a dozen large eggs, and 2 bags of chips from Publix (13th St). Please make sure everything is fresh! Meet me at the main entrance of Hume Hall to drop off the groceries.", posted: "2 hours ago", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85"}),
        task("study-packet", 3, 3, {title: "Micro Study Edge Packet", summary: "Macro Study Edge Packet", reward: "$6", rewardType: "money", category: "Study", location: "Marston Library", distance: "0.5 mi", time: "Today, 3:00 PM", cardTime: "Today, 3:00 PM", description: "Pick up my printed study packet at Study Edge and bring it to Marston Library.", posted: "3 hours ago"}),
        task("starbucks", 4, 4, {title: "Get a coffee from Starbucks", summary: "A Croissant from Starbucks", reward: "$7", rewardType: "money", category: "Errand", location: "Starbucks", distance: "0.6 mi", time: "Today, 4:00 PM", cardTime: "Today, 4:00 PM", description: "Please bring a grande iced coffee and a croissant to Library West.", posted: "4 hours ago", image: "https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=800&q=85"}),
        task("package", 5, 5, {title: "Pick up a package", summary: "Gator Plushie", reward: "$5", rewardType: "money", category: "Delivery", location: "Amazon Locker", distance: "1.2 mi", time: "Tomorrow, 12:00 PM", cardTime: "Tomorrow, 12:00 PM", description: "Pick up my package from the Amazon Locker and deliver it to Hume Hall.", posted: "5 hours ago"}),
        task("demo-books", ME, 26, {title: "Return my library books", summary: "$4", reward: "$4", rewardType: "money", category: "Study", location: "Library West", distance: "0.4 mi", time: "Today, 6:00 PM", cardTime: "Today, 6:00 PM", description: "Drop three books in the return slot at Library West. They're in a tote bag at the Hume Hall front desk.", posted: "1 day ago", icon: "▭"})
      ],
      chats: [
        {id: 1, taskId: "publix", taskTitle: "Pick up groceries from Publix", ownerId: 2, helperId: ME, completed: false, createdAt: ago(1.6)},
        {id: 2, taskId: "demo-books", taskTitle: "Return my library books", ownerId: ME, helperId: 3, completed: false, createdAt: ago(5)},
        {id: 3, taskId: "package", taskTitle: "Pick up a package", ownerId: 5, helperId: ME, completed: true, createdAt: ago(30)}
      ],
      messages: [
        message(1, 1, ME, 1.5, "Hi! I can grab your groceries from Publix this afternoon."),
        message(2, 1, 2, 1.4, "Amazing, thank you! Whole milk please, not 2%."),
        message(3, 1, ME, 1.3, "Got it. I'll message you when I'm heading over."),
        message(4, 2, 3, 4.8, "Hey, I'm near Hume. Want me to take the books?"),
        message(5, 2, 3, 0.2, "I'm at the front desk now, which bag is it?"),
        message(6, 3, ME, 29, "Package is picked up, heading to Hume Hall."),
        message(7, 3, 5, 28.5, "Got it, thank you so much!")
      ],
      reads: {"1:1": 3, "2:1": 4, "3:1": 7},
      pendingReplies: [],
      reviews: [
        {reviewerId: 5, revieweeId: ME, taskId: "package", rating: 5, comment: "Super quick and friendly. Package arrived in perfect shape!", createdAt: ago(27)},
        {reviewerId: 4, revieweeId: ME, taskId: "old-coffee", rating: 4, comment: "Coffee was still hot. Would ask again.", createdAt: ago(120)}
      ],
      notifications: [
        {id: 1, type: "chat", title: "ethan_r", body: "I'm at the front desk now, which bag is it? · Return my library books", href: "chat.html?id=2", read: false, createdAt: ago(0.2)},
        {id: 2, type: "task", title: "New task nearby", body: "Get a coffee from Starbucks · $7 · Starbucks", href: "task-detail.html?id=starbucks", read: false, createdAt: ago(4)},
        {id: 3, type: "task", title: "New task nearby", body: "Pick up a package · $5 · Amazon Locker", href: "task-detail.html?id=package", read: true, createdAt: ago(5)}
      ],
      settings: {newTasks: true, chatMessages: true},
      nextId: {chat: 4, message: 8, notification: 4, contact: 1, report: 1}
    };
  }

  let state;
  try { state = JSON.parse(read(STATE_KEY)); } catch { state = null; }
  if (!state || !state.users) state = seed();
  const save = () => write(STATE_KEY, JSON.stringify(state));
  const userById = id => state.users.find(user => user.id === id);
  const me = () => userById(ME);
  const next = kind => state.nextId[kind]++;

  // Replies are queued with a due time and only become messages once that time passes,
  // so ids stay in order and the chat's normal polling picks them up.
  function deliverReplies() {
    const now = Date.now();
    const due = state.pendingReplies.filter(reply => reply.dueAt <= now);
    if (!due.length) return;
    state.pendingReplies = state.pendingReplies.filter(reply => reply.dueAt > now);
    for (const reply of due) {
      const chat = state.chats.find(item => item.id === reply.chatId);
      if (!chat) continue;
      state.messages.push({id: next("message"), chatId: chat.id, senderId: reply.senderId, type: "text", body: reply.body, data: null, createdAt: new Date(reply.dueAt).toISOString()});
      if (state.settings.chatMessages) {
        state.notifications.push({id: next("notification"), type: "chat", title: userById(reply.senderId).username, body: `${reply.body} · ${chat.taskTitle}`, href: `chat.html?id=${chat.id}`, read: false, createdAt: new Date(reply.dueAt).toISOString()});
      }
    }
  }

  function publicTask(task) {
    const owner = userById(task.ownerId) || {username: "Gator Board member"};
    return {...task.data, id: task.id, submitterId: task.ownerId, poster: owner.username, posterAvatar: owner.avatar || null, createdAt: task.createdAt};
  }

  function chatView(chat) {
    const messages = state.messages.filter(message => message.chatId === chat.id);
    const last = messages[messages.length - 1];
    const lastAt = last ? last.createdAt : chat.createdAt;
    const mineIsOwner = chat.ownerId === ME;
    const lockedByAge = Date.now() - new Date(lastAt).getTime() > 7 * 86400000;
    const readUpTo = state.reads[`${chat.id}:${ME}`] || 0;
    return {
      id: chat.id,
      taskId: chat.taskId,
      taskTitle: chat.taskTitle,
      other: {id: mineIsOwner ? chat.helperId : chat.ownerId, username: userById(mineIsOwner ? chat.helperId : chat.ownerId).username},
      isOwner: mineIsOwner,
      completed: chat.completed,
      locked: chat.completed || lockedByAge,
      lockReason: chat.completed ? "completed" : (lockedByAge ? "inactive" : ""),
      unread: messages.filter(message => message.senderId !== ME && message.id > readUpTo).length,
      lastAt,
      lastMessage: last ? {type: last.type, body: last.body, senderId: last.senderId, createdAt: last.createdAt} : null
    };
  }

  const messageView = message => ({id: message.id, senderId: message.senderId, type: message.type, text: message.body, ...(message.data || {}), createdAt: message.createdAt});
  const myChat = id => state.chats.find(chat => chat.id === id && (chat.ownerId === ME || chat.helperId === ME));
  const isImage = (src, max) => typeof src === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(src) && src.length <= max;
  const meView = () => { const {id, username, email, preferences, avatar} = me(); return {id, username, email, preferences, avatar}; };
  const signIn = () => { state.loggedIn = true; const {id, username, email} = me(); return [200, {user: {id, username, email}}]; };

  // ---- Routes (same paths, checks and response shapes as server/auth.js and server/chat.js) ----
  const publicRoutes = {
    "POST login": ({body}) => {
      if (typeof body.identifier !== "string" || typeof body.password !== "string" || !body.identifier.trim()) return [400, {error: "Invalid input"}];
      return signIn();
    },
    "POST signup": ({body}) => {
      const {username, email, password} = body;
      if (typeof username !== "string" || typeof email !== "string" || typeof password !== "string" ||
          !/^[a-zA-Z0-9_]{3,20}$/.test(username) || !/^[^\s@]+@ufl\.edu$/.test(email) || password.length < 8) {
        return [400, {error: "Invalid input"}];
      }
      if (state.users.some(user => user.id !== ME && (user.username.toLowerCase() === username.toLowerCase() || user.email === email.toLowerCase()))) {
        return [409, {error: "Username or email already exists"}];
      }
      Object.assign(me(), {username, email: email.toLowerCase(), preferences: null, isGuest: false});
      const [, result] = signIn();
      return [201, result];
    },
    "POST guest": () => {
      const username = `guest_${Math.random().toString(16).slice(2, 8).padEnd(6, "0")}`;
      Object.assign(me(), {username, email: `${username}@guest.local`, preferences: null, isGuest: true});
      return signIn();
    },
    "POST logout": () => {
      // Real guest accounts are deleted on logout, so start the demo over too.
      if (me().isGuest) state = seed();
      state.loggedIn = false;
      return [200, {message: "Logged out."}];
    },
    "GET me": () => state.loggedIn ? [200, {user: meView()}] : [401, {error: "Not logged in."}]
  };

  const routes = {
    "GET profile": () => {
      const reviews = state.reviews.filter(review => review.revieweeId === ME).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const rating = reviews.length ? Math.round(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length * 10) / 10 : 0;
      const {id, username, email, avatar} = me();
      return [200, {profile: {id, username, email, avatar, rating, review_count: reviews.length, reviews: reviews.map(review => ({rating: review.rating, comment: review.comment, createdAt: review.createdAt, reviewer: (userById(review.reviewerId) || {}).username}))}}];
    },
    "POST reviews": ({body}) => {
      const {taskId, rating} = body;
      const comment = typeof body.comment === "string" ? body.comment.trim() : "";
      // The demo also accepts reviews without a reviewee, so every review screen can be tried.
      const revieweeId = Number.isInteger(body.revieweeId) ? body.revieweeId : 0;
      if (typeof taskId !== "string" || !taskId.trim() || revieweeId === ME || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 1000) {
        return [400, {error: "Please provide a rating from 1 to 5 and a comment of 1000 characters or fewer."}];
      }
      const review = {reviewerId: ME, revieweeId, taskId: taskId.trim(), rating, comment: comment || null, createdAt: new Date().toISOString()};
      state.reviews = state.reviews.filter(item => !(item.reviewerId === ME && item.revieweeId === revieweeId && item.taskId === review.taskId)).concat(review);
      return [201, {review: {id: state.reviews.length, taskId: review.taskId, rating, comment: review.comment, createdAt: review.createdAt}}];
    },

    "GET tasks": () => [200, {tasks: [...state.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicTask)}],
    "POST tasks": ({body}) => {
      const task = body.task;
      if (!task || typeof task.title !== "string" || !task.title.trim() || task.title.length > 200 ||
          typeof task.description !== "string" || task.description.length > 4000 || (task.image && !isImage(task.image, 700000) && !/^https:/.test(task.image))) {
        return [400, {error: "Invalid task."}];
      }
      const {id, submitterId, poster, createdByMe, createdAt, runnerId, ...data} = task;
      const created = {id: `task-${Date.now()}-${ME}`, ownerId: ME, createdAt: new Date().toISOString(), data};
      state.tasks.push(created);
      return [201, {task: publicTask(created)}];
    },

    "GET chats": () => [200, {chats: state.chats.filter(chat => chat.ownerId === ME || chat.helperId === ME).map(chatView).sort((a, b) => b.lastAt.localeCompare(a.lastAt)), me: ME}],
    "POST chats": ({body}) => {
      const task = state.tasks.find(item => item.id === body.taskId);
      if (typeof body.taskId !== "string" || !body.taskId) return [400, {error: "Missing task."}];
      if (!task) return [404, {error: "That task is not available for chat."}];
      if (task.ownerId === ME) return [400, {error: "You posted this task. People who message you will appear in Chat."}];
      let chat = state.chats.find(item => item.taskId === task.id && item.helperId === ME);
      if (!chat) {
        chat = {id: next("chat"), taskId: task.id, taskTitle: task.data.title || "Task", ownerId: task.ownerId, helperId: ME, completed: false, createdAt: new Date().toISOString()};
        state.chats.push(chat);
      }
      return [201, {chatId: chat.id}];
    },
    "GET chats/:id": ({id, query}) => {
      const chat = myChat(id);
      if (!chat) return [404, {error: "Chat not found."}];
      const after = Number(query.get("after")) || 0;
      const messages = state.messages.filter(message => message.chatId === id && message.id > after);
      const key = `${id}:${ME}`;
      if (messages.length) state.reads[key] = Math.max(state.reads[key] || 0, messages[messages.length - 1].id);
      return [200, {chat: {...chatView(chat), unread: 0}, messages: messages.map(messageView), me: ME}];
    },
    "POST chats/:id/messages": ({id, body}) => {
      const {type = "text", text, src, lat, lng, label} = body;
      let messageBody = null, data = null;
      if (type === "text") {
        if (typeof text !== "string" || !text.trim() || text.length > 2000) return [400, {error: "Write a message up to 2000 characters."}];
        messageBody = text.trim();
      } else if (type === "image") {
        if (!isImage(src, 700000)) return [400, {error: "That picture is not supported or is too large."}];
        data = {src};
      } else if (type === "location") {
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return [400, {error: "Invalid location."}];
        data = {lat, lng, label: typeof label === "string" ? label.slice(0, 120) : ""};
      } else {
        return [400, {error: "Unknown message type."}];
      }
      const chat = myChat(id);
      if (!chat) return [404, {error: "Chat not found."}];
      if (chatView(chat).locked) return [403, {error: "This chat is locked."}];
      const message = {id: next("message"), chatId: id, senderId: ME, type, body: messageBody, data, createdAt: new Date().toISOString()};
      state.messages.push(message);
      state.reads[`${id}:${ME}`] = message.id;
      // The other person answers a couple of seconds later so the chat feels live.
      if (!state.pendingReplies.some(reply => reply.chatId === id)) {
        const sent = state.messages.filter(item => item.chatId === id && item.senderId === ME).length;
        state.pendingReplies.push({chatId: id, senderId: chat.ownerId === ME ? chat.helperId : chat.ownerId, body: REPLIES[sent % REPLIES.length], dueAt: Date.now() + 2000});
      }
      return [201, {message: messageView(message)}];
    },
    "POST chats/:id/complete": ({id}) => {
      const chat = myChat(id);
      if (!chat) return [404, {error: "Chat not found."}];
      if (chat.ownerId !== ME) return [403, {error: "Only the person who posted the task can mark it complete."}];
      chat.completed = true;
      return [200, {ok: true}];
    },

    "GET preferences": () => [200, {preferences: me().preferences}],
    "PUT preferences": ({body}) => {
      const {categories, sort, mapView} = body;
      if (!Array.isArray(categories) || !categories.length || !categories.every(item => ALL_CATEGORIES.includes(item)) || !SORTS.includes(sort) || !["tasks", "rewards"].includes(mapView)) {
        return [400, {error: "Invalid preferences."}];
      }
      me().preferences = {categories: [...new Set(categories)], sort, mapView};
      return [200, {preferences: me().preferences}];
    },

    "GET notifications": () => {
      const notifications = [...state.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
      return [200, {notifications, unread: notifications.filter(item => !item.read).length}];
    },
    "POST notifications/read": ({body}) => {
      if (body.id === "all") state.notifications.forEach(item => { item.read = true; });
      else if (Number.isInteger(body.id)) state.notifications.filter(item => item.id === body.id).forEach(item => { item.read = true; });
      else return [400, {error: "Invalid notification."}];
      return [200, {ok: true}];
    },
    "GET notification-settings": () => [200, {settings: state.settings}],
    "PUT notification-settings": ({body}) => {
      if (typeof body.newTasks !== "boolean" || typeof body.chatMessages !== "boolean") return [400, {error: "Invalid notification settings."}];
      state.settings = {newTasks: body.newTasks, chatMessages: body.chatMessages};
      return [200, {settings: state.settings}];
    },

    "PUT account/avatar": ({body}) => {
      if (body.src !== null && !isImage(body.src, 200000)) return [400, {error: "That picture is not supported or is too large."}];
      me().avatar = body.src;
      return [200, {avatar: body.src}];
    },
    "POST contact": ({body}) => {
      const {topic, message, email} = body;
      if (!CONTACT_TOPICS.includes(topic) || typeof message !== "string" || message.trim().length < 5 || message.length > 3000 ||
          typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return [400, {error: "Please choose a topic, add a reply email and write at least a few words."}];
      }
      return [201, {reference: `GB-C${next("contact")}`}];
    },
    "GET users/search": ({query}) => {
      const q = (query.get("q") || "").trim().toLowerCase();
      if (q.length < 2 || q.length > 20) return [200, {users: []}];
      const users = state.users.filter(user => user.id !== ME && user.username.toLowerCase().includes(q))
        .sort((a, b) => (b.username.toLowerCase() === q) - (a.username.toLowerCase() === q) || a.username.localeCompare(b.username))
        .slice(0, 10).map(({id, username, avatar}) => ({id, username, avatar}));
      return [200, {users}];
    },
    "POST reports": ({body}) => {
      const {userId, reason, details} = body;
      if (!Number.isInteger(userId) || userId === ME || !FRAUD_REASONS.includes(reason) || (details !== undefined && (typeof details !== "string" || details.length > 3000))) {
        return [400, {error: "Choose who you are reporting and why."}];
      }
      if (!userById(userId)) return [404, {error: "That user no longer exists."}];
      return [201, {reference: `GB-R${next("report")}`}];
    },
    "POST account/clear-data": () => {
      const mine = new Set(state.tasks.filter(task => task.ownerId === ME).map(task => task.id));
      state.tasks = state.tasks.filter(task => !mine.has(task.id));
      state.chats = state.chats.filter(chat => chat.helperId !== ME && !mine.has(chat.taskId));
      const chatIds = new Set(state.chats.map(chat => chat.id));
      state.messages = state.messages.filter(message => message.senderId !== ME && chatIds.has(message.chatId));
      state.pendingReplies = state.pendingReplies.filter(reply => chatIds.has(reply.chatId));
      state.reviews = state.reviews.filter(review => review.reviewerId !== ME);
      state.notifications = [];
      me().preferences = null;
      return [200, {ok: true}];
    },
    "DELETE account": () => {
      state = seed();
      return [200, {ok: true}];
    }
  };

  function handle(method, path, query, body) {
    deliverReplies();
    const parts = path.split("/");
    const id = Number(parts[1]);
    const name = parts.length > 1 && /^\d+$/.test(parts[1]) ? [parts[0], ":id", ...parts.slice(2)].join("/") : path;
    const key = `${method} ${name}`;
    if (publicRoutes[key]) return publicRoutes[key]({body});
    if (!routes[key]) return [404, {error: "Not found."}];
    if (!state.loggedIn) return [401, {error: "Not logged in."}];
    return routes[key]({id, query, body});
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request ? request.url : String(input), location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith("/api/")) return realFetch(input, init);
    const method = (init.method || (request && request.method) || "GET").toUpperCase();
    let body = {};
    try { body = JSON.parse(init.body || (request ? await request.text() : "") || "{}") || {}; } catch {}
    // Re-read storage first so changes made in another tab show up here.
    try { const stored = JSON.parse(read(STATE_KEY)); if (stored && stored.users) state = stored; } catch {}
    await new Promise(resolve => setTimeout(resolve, 120));
    const [status, result] = handle(method, url.pathname.slice("/api/".length), url.searchParams, body);
    save();
    return new Response(JSON.stringify(result), {status, headers: {"Content-Type": "application/json"}});
  };

  // ---- Demo label and sign-in hints ----
  document.addEventListener("DOMContentLoaded", () => {
    const pill = document.createElement("div");
    pill.textContent = "Demo · data stays in this browser";
    pill.setAttribute("role", "note");
    pill.style.cssText = "position:fixed;z-index:60;top:8px;left:50%;transform:translateX(-50%);padding:4px 12px;border-radius:999px;background:#244c37;color:#fff;font:600 12px/1.4 Inter,system-ui,sans-serif;opacity:.9;pointer-events:none;white-space:nowrap";
    document.body.appendChild(pill);
    const form = document.querySelector("#login-form, #signup-form");
    if (form) {
      const hint = document.createElement("p");
      hint.textContent = form.id === "login-form"
        ? "Demo: any username and password works, or continue as a guest."
        : "Demo: no real account is created. Use any name and a @ufl.edu email.";
      hint.style.cssText = "margin:0;padding:10px 14px;border-radius:10px;background:#eef3ec;color:#244c37;font-size:14px;text-align:center";
      form.before(hint);
    }
  });
})();
