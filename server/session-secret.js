const fs = require("fs");
const crypto = require("crypto");

const secretPath = "/app/secrets/session-secret";

if (!process.env.SESSION_SECRET) {
    fs.mkdirSync("/app/secrets", {recursive: true});

    if (!fs.existsSync(secretPath)) {
        fs.writeFileSync(
            secretPath,
            crypto.randomBytes(32).toString("hex"),
            {mode: 0o600, flag: "wx"}
        );
    }
    process.env.SESSION_SECRET = fs.readFileSync(secretPath, "utf8").trim();
}