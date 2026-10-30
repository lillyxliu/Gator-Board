ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar TEXT;

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