
CREATE TABLE IF NOT EXISTS logs (
    id BIGSERIAL PRIMARY KEY,

    timestamp TIMESTAMPTZ NOT NULL,
    level VARCHAR(10) NOT NULL
        CHECK (level IN ('INFO', 'WARN', 'ERROR')),

    service VARCHAR(100) NOT NULL,
    environment VARCHAR(50),
    event VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,

    request_id VARCHAR(100),
    duration_ms INTEGER,
    status_code INTEGER,

    error JSONB,
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common log queries.
CREATE INDEX IF NOT EXISTS idx_logs_timestamp
    ON logs (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_logs_level
    ON logs (level);

CREATE INDEX IF NOT EXISTS idx_logs_service
    ON logs (service);

CREATE INDEX IF NOT EXISTS idx_logs_request_id
    ON logs (request_id);
