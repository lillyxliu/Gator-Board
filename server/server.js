require("dotenv").config();
require("./session-secret");

const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const path = require("path");
const fs = require("fs");
const pool = require("./db");
const {seedDemoData} = require("./seed");
const app = express();
const production = process.env.NODE_ENV === "production";

if (production) {
    app.set("trust proxy", 1);
}

app.use(express.json({limit: "2mb"}));
app.use(session({
    store: new PgSession({
        pool,
        createTableIfMissing: true
    }),
    name: "gatorboard.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: production,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
}));

app.use("/api", require("./auth"));
app.use("/api", require("./chat"));
app.use(express.static(path.join(__dirname, "..")));
async function start() {
    try {
        // init.sql is idempotent, so run it on every start to add new tables to existing databases.
        await pool.query(fs.readFileSync(path.join(__dirname, "..", "db", "init.sql"), "utf8"));
        await pool.query(`
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewee_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
            ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_task_id_key;
            CREATE UNIQUE INDEX IF NOT EXISTS reviews_reviewer_reviewee_task_unique
                ON reviews (reviewer_id, reviewee_id, task_id);
            CREATE INDEX IF NOT EXISTS reviews_reviewee_created_at
                ON reviews (reviewee_id, created_at DESC);
        `);
        await seedDemoData();
        // Guests who never logged out are cleaned up after a day.
        await pool.query("DELETE FROM users WHERE is_guest AND created_at < NOW() - INTERVAL '1 day'");
        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server is running on port ${process.env.PORT || 3000}`);
        });
    } catch (error) {
        console.error("Unable to prepare database:", error);
        process.exitCode = 1;
    }
}

start();