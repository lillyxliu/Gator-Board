require("dotenv").config();

const pool = require("./server/db");

async function test() {
    try {
        const result = await pool.query("SELECT NOW()");
        console.log("Connected:", result.rows[0]);
    } catch (error) {
        console.error("Connection failed:", error);
    } finally {
        await pool.end();
    }
}

test();