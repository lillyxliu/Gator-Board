const express = require("express");
const pool = require("./db");
const router = express.Router();

const LOCK_DAYS = 7;
const MAX_IMAGE_CHARS = 700000;

function requireUser(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({error: "Not logged in."});
    }
    req.me = Number(req.session.userId);
    next();
}

router.use(requireUser);

function publicTask(row) {
    return {
        ...row.data,
        id: row.id,
        submitterId: Number(row.owner_id),
        poster: row.username,
        posterAvatar: row.avatar || null,
        createdAt: row.created_at
    };
}

// ---- Tasks ----
router.get("/tasks", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.id, t.owner_id, t.data, t.created_at, u.username, u.avatar
             FROM tasks t JOIN users u ON u.id = t.owner_id
             ORDER BY t.created_at DESC LIMIT 200`
        );
        res.json({tasks: result.rows.map(publicTask)});
    } catch (error) {
        console.error("Error loading tasks:", error);
        res.status(500).json({error: "Unable to load tasks."});
    }
});

router.post("/tasks", async (req, res) => {
    const task = req.body && req.body.task;
    if (
        !task ||
        typeof task.title !== "string" || !task.title.trim() || task.title.length > 200 ||
        typeof task.description !== "string" || task.description.length > 4000 ||
        (task.image && (typeof task.image !== "string" || task.image.length > MAX_IMAGE_CHARS))
    ) {
        return res.status(400).json({error: "Invalid task."});
    }
    // Identity and id come from the server, not the browser.
    const {id, submitterId, poster, createdByMe, createdAt, runnerId, ...data} = task;
    const taskId = `task-${Date.now()}-${req.me}`;
    try {
        const result = await pool.query(
            `INSERT INTO tasks (id, owner_id, data) VALUES ($1, $2, $3)
             RETURNING id, owner_id, data, created_at, (SELECT username FROM users WHERE id = $2) AS username`,
            [taskId, req.me, JSON.stringify(data)]
        );
        const created = publicTask(result.rows[0]);
        notifyNewTask(created).catch(error => console.error("Error creating task notifications:", error));
        res.status(201).json({task: created});
    } catch (error) {
        console.error("Error saving task:", error);
        res.status(500).json({error: "Unable to save task."});
    }
});

// ---- Chats ----
const CHAT_SELECT = `
    SELECT c.id, c.task_id, c.task_title, c.owner_id, c.helper_id, c.completed, c.created_at,
           ou.username AS owner_name, hu.username AS helper_name,
           COALESCE((SELECT MAX(m.created_at) FROM messages m WHERE m.chat_id = c.id), c.created_at) AS last_at,
           (SELECT COUNT(*)::int FROM messages m
              WHERE m.chat_id = c.id AND m.sender_id <> $1
                AND m.id > COALESCE((SELECT last_read_message_id FROM chat_reads r WHERE r.chat_id = c.id AND r.user_id = $1), 0)) AS unread,
           (SELECT json_build_object('type', m.type, 'body', m.body, 'senderId', m.sender_id, 'createdAt', m.created_at)
              FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message
    FROM chats c
    JOIN users ou ON ou.id = c.owner_id
    JOIN users hu ON hu.id = c.helper_id`;

function chatView(row, me) {
    const mineIsOwner = Number(row.owner_id) === me;
    const lockedByAge = Date.now() - new Date(row.last_at).getTime() > LOCK_DAYS * 86400000;
    return {
        id: Number(row.id),
        taskId: row.task_id,
        taskTitle: row.task_title,
        other: {
            id: Number(mineIsOwner ? row.helper_id : row.owner_id),
            username: mineIsOwner ? row.helper_name : row.owner_name
        },
        isOwner: mineIsOwner,
        completed: row.completed,
        locked: row.completed || lockedByAge,
        lockReason: row.completed ? "completed" : (lockedByAge ? "inactive" : ""),
        unread: row.unread,
        lastAt: row.last_at,
        lastMessage: row.last_message
    };
}

function messageView(row) {
    return {
        id: Number(row.id),
        senderId: Number(row.sender_id),
        type: row.type,
        text: row.body,
        ...(row.data || {}),
        createdAt: row.created_at
    };
}

async function loadChat(chatId, me) {
    const result = await pool.query(`${CHAT_SELECT} WHERE c.id = $2 AND (c.owner_id = $1 OR c.helper_id = $1)`, [me, chatId]);
    return result.rows[0];
}

router.get("/chats", async (req, res) => {
    try {
        const result = await pool.query(
            `${CHAT_SELECT} WHERE c.owner_id = $1 OR c.helper_id = $1 ORDER BY last_at DESC`,
            [req.me]
        );
        res.json({chats: result.rows.map(row => chatView(row, req.me)), me: req.me});
    } catch (error) {
        console.error("Error loading chats:", error);
        res.status(500).json({error: "Unable to load chats."});
    }
});

// Start (or reopen) a chat with whoever posted a task.
router.post("/chats", async (req, res) => {
    const taskId = req.body && req.body.taskId;
    if (typeof taskId !== "string" || !taskId) {
        return res.status(400).json({error: "Missing task."});
    }
    try {
        const task = await pool.query("SELECT id, owner_id, data FROM tasks WHERE id = $1", [taskId]);
        if (!task.rows.length) {
            return res.status(404).json({error: "That task is not available for chat."});
        }
        const ownerId = Number(task.rows[0].owner_id);
        if (ownerId === req.me) {
            return res.status(400).json({error: "You posted this task. People who message you will appear in Chat."});
        }
        const inserted = await pool.query(
            `INSERT INTO chats (task_id, task_title, owner_id, helper_id) VALUES ($1, $2, $3, $4)
             ON CONFLICT (task_id, helper_id) DO UPDATE SET task_title = EXCLUDED.task_title
             RETURNING id`,
            [taskId, task.rows[0].data.title || "Task", ownerId, req.me]
        );
        res.status(201).json({chatId: Number(inserted.rows[0].id)});
    } catch (error) {
        console.error("Error starting chat:", error);
        res.status(500).json({error: "Unable to start chat."});
    }
});

router.get("/chats/:id", async (req, res) => {
    const chatId = Number(req.params.id);
    const after = Number(req.query.after) || 0;
    if (!Number.isInteger(chatId)) {
        return res.status(400).json({error: "Invalid chat."});
    }
    try {
        const row = await loadChat(chatId, req.me);
        if (!row) {
            return res.status(404).json({error: "Chat not found."});
        }
        const messages = await pool.query("SELECT * FROM messages WHERE chat_id = $1 AND id > $2 ORDER BY id", [chatId, after]);
        const last = messages.rows.length ? messages.rows[messages.rows.length - 1].id : null;
        if (last) {
            await pool.query(
                `INSERT INTO chat_reads (chat_id, user_id, last_read_message_id) VALUES ($1, $2, $3)
                 ON CONFLICT (chat_id, user_id) DO UPDATE SET last_read_message_id = GREATEST(chat_reads.last_read_message_id, EXCLUDED.last_read_message_id)`,
                [chatId, req.me, last]
            );
        }
        res.json({chat: chatView({...row, unread: 0}, req.me), messages: messages.rows.map(messageView), me: req.me});
    } catch (error) {
        console.error("Error loading chat:", error);
        res.status(500).json({error: "Unable to load chat."});
    }
});

router.post("/chats/:id/messages", async (req, res) => {
    const chatId = Number(req.params.id);
    const {type = "text", text, src, lat, lng, label} = req.body || {};
    let body = null, data = null;
    if (type === "text") {
        if (typeof text !== "string" || !text.trim() || text.length > 2000) {
            return res.status(400).json({error: "Write a message up to 2000 characters."});
        }
        body = text.trim();
    } else if (type === "image") {
        if (typeof src !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(src) || src.length > MAX_IMAGE_CHARS) {
            return res.status(400).json({error: "That picture is not supported or is too large."});
        }
        data = {src};
    } else if (type === "location") {
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return res.status(400).json({error: "Invalid location."});
        }
        data = {lat, lng, label: typeof label === "string" ? label.slice(0, 120) : ""};
    } else {
        return res.status(400).json({error: "Unknown message type."});
    }
    try {
        const row = Number.isInteger(chatId) ? await loadChat(chatId, req.me) : null;
        if (!row) {
            return res.status(404).json({error: "Chat not found."});
        }
        const view = chatView(row, req.me);
        if (view.locked) {
            return res.status(403).json({error: "This chat is locked."});
        }
        const inserted = await pool.query(
            "INSERT INTO messages (chat_id, sender_id, type, body, data) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [chatId, req.me, type, body, data ? JSON.stringify(data) : null]
        );
        const preview = type === "image" ? "Photo" : type === "location" ? "Shared location" : body.slice(0, 80);
        notifyChatMessage(row, req.me, preview).catch(error => console.error("Error creating chat notification:", error));
        res.status(201).json({message: messageView(inserted.rows[0])});
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({error: "Unable to send message."});
    }
});

// Only the person who posted the task can mark it complete, which locks the chat.
router.post("/chats/:id/complete", async (req, res) => {
    const chatId = Number(req.params.id);
    try {
        const row = Number.isInteger(chatId) ? await loadChat(chatId, req.me) : null;
        if (!row) {
            return res.status(404).json({error: "Chat not found."});
        }
        if (Number(row.owner_id) !== req.me) {
            return res.status(403).json({error: "Only the person who posted the task can mark it complete."});
        }
        await pool.query("UPDATE chats SET completed = TRUE WHERE id = $1", [chatId]);
        res.json({ok: true});
    } catch (error) {
        console.error("Error completing chat:", error);
        res.status(500).json({error: "Unable to update chat."});
    }
});

// ---- Onboarding preferences ----
router.get("/preferences", async (req, res) => {
    try {
        const result = await pool.query("SELECT preferences FROM users WHERE id = $1", [req.me]);
        res.json({preferences: (result.rows[0] && result.rows[0].preferences) || null});
    } catch (error) {
        res.status(500).json({error: "Unable to load preferences."});
    }
});

const CATEGORIES = ["Errand", "Food", "Study", "Delivery", "Other"];
const SORTS = ["newest", "reward-high", "reward-low", "nearest", "duration"];

router.put("/preferences", async (req, res) => {
    const {categories, sort, mapView} = req.body || {};
    if (
        !Array.isArray(categories) || !categories.length || !categories.every(item => CATEGORIES.includes(item)) ||
        !SORTS.includes(sort) ||
        !["tasks", "rewards"].includes(mapView)
    ) {
        return res.status(400).json({error: "Invalid preferences."});
    }
    try {
        const preferences = {categories: [...new Set(categories)], sort, mapView};
        await pool.query("UPDATE users SET preferences = $2 WHERE id = $1", [req.me, JSON.stringify(preferences)]);
        res.json({preferences});
    } catch (error) {
        console.error("Error saving preferences:", error);
        res.status(500).json({error: "Unable to save preferences."});
    }
});

// ---- Notifications ----
const DEFAULT_NOTIFICATIONS = {newTasks: true, chatMessages: true};

router.get("/notifications", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, type, title, body, href, read, created_at AS "createdAt"
             FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [req.me]
        );
        res.json({notifications: result.rows, unread: result.rows.filter(row => !row.read).length});
    } catch (error) {
        console.error("Error loading notifications:", error);
        res.status(500).json({error: "Unable to load notifications."});
    }
});

router.post("/notifications/read", async (req, res) => {
    const id = req.body && req.body.id;
    try {
        if (id === "all") {
            await pool.query("UPDATE notifications SET read = TRUE WHERE user_id = $1", [req.me]);
        } else if (Number.isInteger(id)) {
            await pool.query("UPDATE notifications SET read = TRUE WHERE user_id = $1 AND id = $2", [req.me, id]);
        } else {
            return res.status(400).json({error: "Invalid notification."});
        }
        res.json({ok: true});
    } catch (error) {
        res.status(500).json({error: "Unable to update notifications."});
    }
});

router.get("/notification-settings", async (req, res) => {
    try {
        const result = await pool.query("SELECT notification_settings FROM users WHERE id = $1", [req.me]);
        res.json({settings: {...DEFAULT_NOTIFICATIONS, ...((result.rows[0] || {}).notification_settings || {})}});
    } catch (error) {
        res.status(500).json({error: "Unable to load notification settings."});
    }
});

router.put("/notification-settings", async (req, res) => {
    const {newTasks, chatMessages} = req.body || {};
    if (typeof newTasks !== "boolean" || typeof chatMessages !== "boolean") {
        return res.status(400).json({error: "Invalid notification settings."});
    }
    try {
        const settings = {newTasks, chatMessages};
        await pool.query("UPDATE users SET notification_settings = $2 WHERE id = $1", [req.me, JSON.stringify(settings)]);
        res.json({settings});
    } catch (error) {
        res.status(500).json({error: "Unable to save notification settings."});
    }
});

// New task: notify everyone (except the poster) who wants new-task alerts and picked this category in "Edit what I see".
async function notifyNewTask(task) {
    await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, href)
         SELECT u.id, 'task', 'New task nearby', $2, $3 FROM users u
         WHERE u.id <> $1
           AND COALESCE((u.notification_settings->>'newTasks')::boolean, TRUE)
           AND (u.preferences IS NULL OR u.preferences->'categories' ? $4)`,
        [task.submitterId, `${task.title} · ${task.reward || task.summary || ""}${task.location ? ` · ${task.location}` : ""}`, `task-detail.html?id=${encodeURIComponent(task.id)}`, task.category || "Other"]
    );
}

async function notifyChatMessage(row, senderId, preview) {
    const recipient = Number(row.owner_id) === senderId ? row.helper_id : row.owner_id;
    const sender = Number(row.owner_id) === senderId ? row.owner_name : row.helper_name;
    await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, href)
         SELECT id, 'chat', $2, $3, $4 FROM users
         WHERE id = $1 AND COALESCE((notification_settings->>'chatMessages')::boolean, TRUE)`,
        [recipient, sender, `${preview} · ${row.task_title}`, `chat.html?id=${row.id}`]
    );
}

// ---- Profile picture ----
router.put("/account/avatar", async (req, res) => {
    const src = req.body && req.body.src;
    if (src !== null && (typeof src !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(src) || src.length > 200000)) {
        return res.status(400).json({error: "That picture is not supported or is too large."});
    }
    try {
        await pool.query("UPDATE users SET avatar = $2 WHERE id = $1", [req.me, src]);
        res.json({avatar: src});
    } catch (error) {
        console.error("Error saving avatar:", error);
        res.status(500).json({error: "Unable to save your picture."});
    }
});

// ---- Contact Us ----
const CONTACT_TOPICS = ["Account", "A task or chat", "Bug report", "Feedback", "Other"];
router.post("/contact", async (req, res) => {
    const {topic, message, email} = req.body || {};
    if (!CONTACT_TOPICS.includes(topic) || typeof message !== "string" || message.trim().length < 5 || message.length > 3000 ||
        typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
        return res.status(400).json({error: "Please choose a topic, add a reply email and write at least a few words."});
    }
    try {
        const result = await pool.query(
            "INSERT INTO contact_requests (user_id, email, topic, message) VALUES ($1, $2, $3, $4) RETURNING id",
            [req.me, email.trim(), topic, message.trim()]
        );
        res.status(201).json({reference: `GB-C${result.rows[0].id}`});
    } catch (error) {
        console.error("Error saving contact request:", error);
        res.status(500).json({error: "Unable to send your message."});
    }
});

// ---- Report fraud ----
router.get("/users/search", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2 || q.length > 20) {
        return res.json({users: []});
    }
    try {
        const result = await pool.query(
            `SELECT id, username, avatar FROM users
             WHERE id <> $1 AND username ILIKE $2
             ORDER BY (LOWER(username) = LOWER($3)) DESC, username LIMIT 10`,
            [req.me, `%${q.replace(/[\\%_]/g, "\\$&")}%`, q]
        );
        res.json({users: result.rows});
    } catch (error) {
        res.status(500).json({error: "Unable to search users."});
    }
});

const FRAUD_REASONS = ["Scam or fake task", "Didn't pay or deliver", "Fake account", "Harassment", "Other"];
router.post("/reports", async (req, res) => {
    const {userId, reason, details} = req.body || {};
    if (!Number.isInteger(userId) || userId === req.me || !FRAUD_REASONS.includes(reason) ||
        (details !== undefined && (typeof details !== "string" || details.length > 3000))) {
        return res.status(400).json({error: "Choose who you are reporting and why."});
    }
    try {
        const user = await pool.query("SELECT username FROM users WHERE id = $1", [userId]);
        if (!user.rows.length) {
            return res.status(404).json({error: "That user no longer exists."});
        }
        const result = await pool.query(
            "INSERT INTO fraud_reports (reporter_id, reported_id, reported_username, reason, details) VALUES ($1, $2, $3, $4, NULLIF($5, '')) RETURNING id",
            [req.me, userId, user.rows[0].username, reason, (details || "").trim()]
        );
        res.status(201).json({reference: `GB-R${result.rows[0].id}`});
    } catch (error) {
        console.error("Error saving report:", error);
        res.status(500).json({error: "Unable to send your report."});
    }
});

// ---- Settings: data and account removal ----
// Removes what this account created (tasks and their chats, chats it joined, messages, reviews it wrote, preferences) but keeps the login.
router.post("/account/clear-data", async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("DELETE FROM tasks WHERE owner_id = $1", [req.me]);
        await client.query("DELETE FROM chats WHERE helper_id = $1", [req.me]);
        await client.query("DELETE FROM messages WHERE sender_id = $1", [req.me]);
        await client.query("DELETE FROM reviews WHERE reviewer_id = $1", [req.me]);
        await client.query("DELETE FROM notifications WHERE user_id = $1", [req.me]);
        await client.query("UPDATE users SET preferences = NULL WHERE id = $1", [req.me]);
        await client.query("COMMIT");
        res.json({ok: true});
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error clearing data:", error);
        res.status(500).json({error: "Unable to remove your data."});
    } finally {
        client.release();
    }
});

// Deletes the account; tasks, chats, messages and reviews go with it through ON DELETE CASCADE.
router.delete("/account", async (req, res) => {
    try {
        await pool.query("DELETE FROM users WHERE id = $1", [req.me]);
        req.session.destroy(() => {
            res.clearCookie("gatorboard.sid");
            res.json({ok: true});
        });
    } catch (error) {
        console.error("Error deleting account:", error);
        res.status(500).json({error: "Unable to delete your account."});
    }
});

module.exports = router;
