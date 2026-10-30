const express = require("express");
const argon2 = require("argon2");
const rateLimit = require("express-rate-limit");
const pool = require("./db");
const router = express.Router();
const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10
});

function requireUser(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({error: "Not logged in."});
    }
    next();
}

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

router.get("/profile", requireUser, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                u.id,
                u.username,
                u.email,
                COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS rating,
                COUNT(r.id)::int AS review_count,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'rating', r.rating,
                            'comment', r.comment,
                            'createdAt', r.created_at,
                            'reviewer', reviewer.username
                        ) ORDER BY r.created_at DESC
                    ) FILTER (WHERE r.id IS NOT NULL),
                    '[]'::json
                ) AS reviews
            FROM users u
            LEFT JOIN reviews r ON r.reviewee_id = u.id
            LEFT JOIN users reviewer ON reviewer.id = r.reviewer_id
            WHERE u.id = $1
            GROUP BY u.id`,
            [req.session.userId]
        );

        if (!result.rows.length) {
            return res.status(401).json({error: "Not logged in."});
        }
        res.json({profile: result.rows[0]});
    } catch (error) {
        console.error("Error loading profile:", error);
        res.status(500).json({error: "Internal server error"});
    }
});

router.post("/reviews", requireUser, async (req, res) => {
    const {taskId, revieweeId, rating, comment} = req.body;
    const normalizedComment = typeof comment === "string" ? comment.trim() : "";

    if (
        typeof taskId !== "string" ||
        taskId.trim().length === 0 ||
        taskId.length > 255 ||
        !Number.isInteger(revieweeId) ||
        revieweeId <= 0 ||
        revieweeId === req.session.userId ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5 ||
        normalizedComment.length > 1000
    ) {
        return res.status(400).json({error: "Please provide a rating from 1 to 5 and a comment of 1000 characters or fewer."});
    }

    try {
        const result = await pool.query(
            `INSERT INTO reviews (reviewer_id, reviewee_id, task_id, rating, comment)
             VALUES ($1, $2, $3, $4, NULLIF($5, ''))
             ON CONFLICT (reviewer_id, reviewee_id, task_id)
             DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
             RETURNING id, task_id AS "taskId", rating, comment, created_at AS "createdAt"`,
            [req.session.userId, revieweeId, taskId.trim(), rating, normalizedComment]
        );
        res.status(201).json({review: result.rows[0]});
    } catch (error) {
        console.error("Error saving review:", error);
        res.status(500).json({error: "Unable to save review."});
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