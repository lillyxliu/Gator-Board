CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    avatar TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reviewer BIGINT NOT NULL REFERENCES users(id),
    reviewed BIGINT NOT NULL REFERENCES users(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment VARCHAR(1000),
    time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (reviewer <> reviewed)
);

CREATE INDEX IF NOT EXISTS reviews_reviewer ON reviews (reviewed);