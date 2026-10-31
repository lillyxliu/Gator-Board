require("dotenv").config();

const {Pool, types} = require("pg");

// BIGINT ids come back as strings by default; ids here are small enough to be plain numbers.
types.setTypeParser(20, value => parseInt(value, 10));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

module.exports = pool;