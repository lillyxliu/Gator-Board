// Demo accounts and their tasks, created on every server start if they are missing.
// This means a fresh clone (or a wiped database) always has people you can message.
// All demo accounts use the password "password".
const argon2 = require("argon2");
const pool = require("./db");

const DEMO_PASSWORD = "password";
const ALL_CATEGORIES = ["Errand", "Food", "Study", "Delivery", "Other"];

const DEMO_USERS = [
    {username: "sophia_u", email: "sophia_u@ufl.edu"},
    {username: "ethan_r", email: "ethan_r@ufl.edu"},
    {username: "maya_p", email: "maya_p@ufl.edu"},
    {username: "alex_t", email: "alex_t@ufl.edu"}
];

// Same ids as the built-in sample tasks so existing links (map pins, task pages) keep working.
const DEMO_TASKS = [
    {
        id: "publix", owner: "sophia_u", hoursAgo: 2,
        data: {title: "Pick up groceries from Publix", summary: "$8", reward: "$8", rewardType: "money", category: "Errand", location: "Publix (13th St)", distance: "0.8 mi", time: "Today, Oct 16 at 5:00 PM", cardTime: "Today, 5:00 PM", description: "Pick up 1 gallon of whole milk, a dozen large eggs, and 2 bags of chips from Publix (13th St). Please make sure everything is fresh! Meet me at the main entrance of Hume Hall to drop off the groceries.", posted: "2 hours ago", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85"}
    },
    {
        id: "study-packet", owner: "ethan_r", hoursAgo: 3,
        data: {title: "Micro Study Edge Packet", summary: "Macro Study Edge Packet", reward: "$6", rewardType: "money", category: "Study", location: "Marston Library", distance: "0.5 mi", time: "Today, 3:00 PM", cardTime: "Today, 3:00 PM", description: "Pick up my printed study packet at Study Edge and bring it to Marston Library.", posted: "3 hours ago"}
    },
    {
        id: "starbucks", owner: "maya_p", hoursAgo: 4,
        data: {title: "Get a coffee from Starbucks", summary: "A Croissant from Starbucks", reward: "$7", rewardType: "money", category: "Errand", location: "Starbucks", distance: "0.6 mi", time: "Today, 4:00 PM", cardTime: "Today, 4:00 PM", description: "Please bring a grande iced coffee and a croissant to Library West.", posted: "4 hours ago", image: "https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=800&q=85"}
    },
    {
        id: "package", owner: "alex_t", hoursAgo: 5,
        data: {title: "Pick up a package", summary: "Gator Plushie", reward: "$5", rewardType: "money", category: "Delivery", location: "Amazon Locker", distance: "1.2 mi", time: "Tomorrow, 12:00 PM", cardTime: "Tomorrow, 12:00 PM", description: "Pick up my package from the Amazon Locker and deliver it to Hume Hall.", posted: "5 hours ago"}
    }
];

async function seedDemoData() {
    let hash = null;
    const ids = {};
    for (const user of DEMO_USERS) {
        const existing = await pool.query("SELECT id FROM users WHERE LOWER(username) = LOWER($1)", [user.username]);
        if (existing.rows.length) {
            ids[user.username] = existing.rows[0].id;
            continue;
        }
        hash = hash || await argon2.hash(DEMO_PASSWORD);
        // Preferences are filled in so demo accounts skip onboarding when you log in as them.
        const created = await pool.query(
            `INSERT INTO users (username, email, password_hash, preferences) VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING RETURNING id`,
            [user.username, user.email, hash, JSON.stringify({categories: ALL_CATEGORIES, sort: "newest", mapView: "tasks"})]
        );
        if (created.rows.length) {
            ids[user.username] = created.rows[0].id;
        }
    }
    for (const task of DEMO_TASKS) {
        if (!ids[task.owner]) continue;
        await pool.query(
            `INSERT INTO tasks (id, owner_id, data, created_at) VALUES ($1, $2, $3, NOW() - make_interval(hours => $4))
             ON CONFLICT (id) DO NOTHING`,
            [task.id, ids[task.owner], JSON.stringify(task.data), task.hoursAgo]
        );
    }
}

module.exports = {seedDemoData, DEMO_USERS, DEMO_PASSWORD};
