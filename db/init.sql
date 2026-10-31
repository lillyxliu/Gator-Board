CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reviewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id VARCHAR(255) NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (reviewer_id, reviewee_id, task_id),
    CHECK (reviewer_id <> reviewee_id)
);

CREATE INDEX IF NOT EXISTS reviews_reviewer_created_at
    ON reviews (reviewer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_reviewee_created_at
    ON reviews (reviewee_id, created_at DESC);

-- Per-account app preferences chosen during onboarding
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB;

-- Published tasks are shared between accounts
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_created_at ON tasks (created_at DESC);

-- A chat is one helper talking to the person who posted a task
CREATE TABLE IF NOT EXISTS chats (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    task_title TEXT NOT NULL,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    helper_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (task_id, helper_id),
    CHECK (owner_id <> helper_id)
);

CREATE INDEX IF NOT EXISTS chats_owner ON chats (owner_id);
CREATE INDEX IF NOT EXISTS chats_helper ON chats (helper_id);

CREATE TABLE IF NOT EXISTS messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'text',
    body TEXT,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_chat ON messages (chat_id, id);

CREATE TABLE IF NOT EXISTS chat_reads (
    chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (chat_id, user_id)
);

-- Profile picture (small JPEG data URL) and notification choices
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
-- Throwaway accounts from "Continue as guest"; deleted on logout and after a day
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    href TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_created ON notifications (user_id, created_at DESC);

-- Contact Us requests and fraud reports are stored for the team to review later
CREATE TABLE IF NOT EXISTS contact_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    topic VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_reports (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reporter_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reported_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reported_username VARCHAR(20) NOT NULL,
    reason VARCHAR(40) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
