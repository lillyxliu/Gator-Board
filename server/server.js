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
app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});