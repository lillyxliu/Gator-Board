const express = require("express");
const argon2 = require("argon2");
const rateLimit = require("express-rate-limit");
const pool = require("./db");
const router = express.Router();
const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10
});

router.post("/signup", authLimit, async (req, res) => {
    const {username, email, password} = req.body;
    if (
        typeof username !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        !/^[a-zA-Z0-9_]{3,20}$/.test(username) ||
        !/^[^\s@]+@ufl\.edu$/.test(email) ||
        password.length < 8 ||
        Buffer.byteLength(password, "utf8") > 1024
    ) {
        return res.status(400).json({error: "Invalid input"});
    }

    try {
        const hash = await argon2.hash(password);
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email.toLowerCase(), hash]
        );
        const user = result.rows[0];
        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({error: "Session creation failed."});
            }
            req.session.userId = user.id;
            req.session.save((error) => {
                if (error) {
                    return res.status(500).json({error: "Session save failed."});
                }
                res.status(201).json({user});
            });
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({error: "Username or email already exists"});
        }
        console.error("Error creating user:", error);
        res.status(500).json({error: "Internal server error"});
    }
});

router.post("/login", authLimit, async (req, res) => {
    const {identifier, password} = req.body;
    if (
        typeof identifier !== "string" ||
        typeof password !== "string" ||
        identifier.length > 255 ||
        password.length > 1024
    ) {
        return res.status(400).json({error: "Invalid input"});
    }

    try {
        const result = await pool.query(
            "SELECT id, username, email, password_hash FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)",
            [identifier.trim()]
        );

        const user = result.rows[0];

        if (!user || !(await argon2.verify(user.password_hash, password))) {
            return res.status(401).json({error: "Invalid username/email or password"});
        }

        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({error: "Internal server error"});
            }

            req.session.userId = user.id;

            req.session.save((error) => {
                if (error) {
                    return res.status(500).json({error: "Internal server error"});
                }

                res.json({
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    }
                });
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});

router.get("/me", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({error: "Not logged in."});
    }

    try {
        const result = await pool.query(
            "SELECT id, username, email FROM users WHERE id = $1",
            [req.session.userId]
        );

        if (!result.rows.length) {
            return res.status(401).json({error: "Not logged in."});
        }

        res.json({user: result.rows[0]});
    } catch (error) {
        res.status(500).json({error: "Internal server error"});
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({error: "Logout failed."});
        }
        res.clearCookie("gatorboard.sid");
        res.json({message: "Logged out."});
    });
});

module.exports = router;