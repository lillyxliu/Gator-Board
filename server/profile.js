const express = require("express");
const pool = require("./db");
const router = express.Router();

router.get("/me", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({error: "Not logged in."});
    }
    try {
        const result = await pool.query(
            'SELECT id, username, email, avatar, time_created FROM users WHERE id = $1',
            [req.session.userId]
        );
        if (!result.rows.length) {
            return res.status(404).json({error: "User not found."});
        }
        res.json({user: result.rows[0]});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error."});
    }
});

router.patch("/me", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({error: "Not logged in."});
    }
    const {username} = req.body || {};
    if (typeof username !== "string" || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({error: "Invalid username."});
    }
    try {
        const result = await pool.query(
            'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email, avatar, time_created',
            [username, req.session.userId]
        );
        if (!result.rows.length) {
            return res.status(404).json({error: "User not found."});
        }

        res.json({user: result.rows[0]});
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({error: "Username already taken."});
        }
        console.error(error);
        res.status(500).json({error: "Internal server error."});
    }
});

router.get("/users/:id", async (req, res) => {
    const {id} = req.params;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({error: "Invalid user ID."});
    }
    try {
        const result = await pool.query(
            'SELECT u.id, u.username, u.avatar, COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS ave_rating, COUNT(r.id)::integer AS review_count FROM users u LEFT JOIN reviews r on r.reviewed = u.id WHERE u.id = $1 GROUP BY u.id',
            [id]
        );
        if (!result.rows.length) {
            return res.status(404).json({error: "User not found."});
        }
        res.json({user: result.rows[0]});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error."});
    }
});

router.get("/users/:id/reviews", async (req, res) => {
    const {id} = req.params;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({error: "Invalid user ID."});
    }
    try {
        const result = await pool.query(
            'SELECT r.id, r.rating, r.comment, r.time_created, u.id AS reviewer, u.username AS reviewer_username FROM reviews r JOIN users u ON u.id = r.reviewer WHERE r.reviewed = $1 ORDER BY r.time_created DESC LIMIT 50',
            [id]
        );
        res.json({reviews: result.rows});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error."});
    }
});

module.exports = router;