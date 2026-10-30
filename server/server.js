require("dotenv").config();
require("./session-secret");

const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const path = require("path");
const pool = require("./db");
const app = express();
const production = process.env.NODE_ENV === "production";

if (production) {
    app.set("trust proxy", 1);
}

app.use(express.json());
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
app.use(express.static(path.join(__dirname, "..")));
async function start() {
    try {
        await pool.query(`
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewee_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
            ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_task_id_key;
            CREATE UNIQUE INDEX IF NOT EXISTS reviews_reviewer_reviewee_task_unique
                ON reviews (reviewer_id, reviewee_id, task_id);
            CREATE INDEX IF NOT EXISTS reviews_reviewee_created_at
                ON reviews (reviewee_id, created_at DESC);
        `);
        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server is running on port ${process.env.PORT || 3000}`);
        });
    } catch (error) {
        console.error("Unable to prepare database:", error);
        process.exitCode = 1;
    }
}

start();